import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { gunzip as gunzipCallback, gzip as gzipCallback } from 'node:zlib'

import { normalizeFileName, validateResourceId, validateSessionId } from './resource-security.js'

const gzip = promisify(gzipCallback)
const gunzip = promisify(gunzipCallback)

const DEFAULTS = {
  maxFileBytes: 50 * 1024 * 1024,
  maxBatchBytes: 200 * 1024 * 1024,
  maxCacheBytes: 1024 * 1024 * 1024,
  maxFilesPerSession: 20,
  unreferencedTtlMs: 7 * 24 * 60 * 60 * 1000,
}

function emptyIndex() {
  return { version: 1, resources: {}, sessions: {}, mentions: {} }
}

function resourceIdFor(hash) {
  return `res_${hash.slice(0, 32)}`
}

export class ResourceStore {
  constructor({ root, now = Date.now, ...limits }) {
    if (typeof root !== 'string' || root.trim() === '') throw new Error('resource root is required')
    this.root = resolve(root)
    this.now = now
    this.limits = { ...DEFAULTS, ...limits }
    this.indexPath = join(this.root, 'index.json')
    this.index = emptyIndex()
    this.opened = false
    this.writeChain = Promise.resolve()
  }

  async open() {
    if (this.opened) return
    await mkdir(join(this.root, 'objects'), { recursive: true })
    await mkdir(join(this.root, 'derived'), { recursive: true })
    try {
      const parsed = JSON.parse(await readFile(this.indexPath, 'utf8'))
      if (parsed?.version !== 1 || typeof parsed.resources !== 'object' || typeof parsed.sessions !== 'object') {
        throw new Error('unsupported resource index')
      }
      if (typeof parsed.mentions !== 'object' || parsed.mentions === null) parsed.mentions = {}
      this.index = parsed
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
    this.opened = true
  }

  async close() {
    await this.writeChain
  }

  async put({ sessionId, fileName, mediaType = '', bytes, kind = 'unknown' }) {
    this.assertOpen()
    const id = validateSessionId(sessionId)
    const name = normalizeFileName(fileName)
    const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
    if (buffer.length > this.limits.maxFileBytes) throw new Error(`file exceeds ${this.limits.maxFileBytes} bytes`)
    const hash = createHash('sha256').update(buffer).digest('hex')
    const resourceId = resourceIdFor(hash)
    const existing = this.index.resources[resourceId]
    this.assertSessionQuota(id, resourceId, buffer.length)
    if (existing === undefined) await this.makeRoom(buffer.length)

    const objectRelative = join('objects', hash.slice(0, 2), `${hash}.bin`)
    const objectPath = join(this.root, objectRelative)
    if (existing === undefined) {
      await mkdir(dirname(objectPath), { recursive: true })
      const staging = `${objectPath}.${randomUUID()}.tmp`
      await writeFile(staging, buffer, { flag: 'wx', mode: 0o600 })
      try {
        await rename(staging, objectPath)
      } catch (error) {
        await rm(staging, { force: true })
        if (error?.code !== 'EEXIST') throw error
      }
      this.index.resources[resourceId] = {
        resourceId, hash, fileName: name, mediaType: String(mediaType), kind,
        size: buffer.length, objectRelative, createdAt: this.now(), lastAccess: this.now(),
        unreferencedAt: null, derivedRelative: null, derivedBytes: 0, unitCount: null,
      }
    }
    await this.attach(id, resourceId, name, { flush: false })
    await this.flush()
    return this.publicRecord(this.index.resources[resourceId], name)
  }

  async attach(sessionId, resourceId, fileName, { flush = true } = {}) {
    this.assertOpen()
    const id = validateSessionId(sessionId)
    const rid = validateResourceId(resourceId)
    const resource = this.index.resources[rid]
    if (resource === undefined) throw new Error('resource not found')
    const bindings = this.index.sessions[id] ?? []
    if (!bindings.some(binding => binding.resourceId === rid)) {
      this.assertSessionQuota(id, rid, resource.size)
      bindings.push({ resourceId: rid, fileName: normalizeFileName(fileName), status: 'pending', attachedAt: this.now() })
      this.index.sessions[id] = bindings
    }
    resource.unreferencedAt = null
    resource.lastAccess = this.now()
    if (flush) await this.flush()
    return this.publicRecord(resource, fileName)
  }

  async markSent(sessionId, resourceIds) {
    const id = validateSessionId(sessionId)
    const bindings = this.index.sessions[id] ?? []
    const requested = new Set(resourceIds.map(validateResourceId))
    for (const binding of bindings) if (requested.has(binding.resourceId)) binding.status = 'sent'
    // Record the conversation's send history: previews keep working even after
    // the pending attachment is removed from the draft dock.
    const history = this.index.mentions[id] ?? []
    for (const binding of bindings) {
      if (!requested.has(binding.resourceId)) continue
      if (history.some(entry => entry.resourceId === binding.resourceId && entry.fileName === binding.fileName)) continue
      history.push({ resourceId: binding.resourceId, fileName: binding.fileName, sentAt: this.now() })
    }
    this.index.mentions[id] = history
    await this.flush()
  }

  listMentions(sessionId) {
    this.assertOpen()
    return [...(this.index.mentions[validateSessionId(sessionId)] ?? [])]
  }

  /** Read derived content by resource id without requiring a live session binding. */
  async readDerivedForResource(resourceId) {
    this.assertOpen()
    const rid = validateResourceId(resourceId)
    const resource = this.index.resources[rid]
    if (resource === undefined) throw new Error('resource not found')
    if (resource.derivedRelative === null) throw new Error('resource parsing is not complete')
    const parsed = JSON.parse((await gunzip(await readFile(join(this.root, resource.derivedRelative)))).toString('utf8'))
    return { ...this.publicRecord(resource), chunks: parsed.chunks }
  }

  async remove(sessionId, resourceId) {
    this.assertOpen()
    const id = validateSessionId(sessionId)
    const rid = validateResourceId(resourceId)
    const bindings = this.index.sessions[id] ?? []
    this.index.sessions[id] = bindings.filter(binding => binding.resourceId !== rid)
    if (this.index.sessions[id].length === 0) delete this.index.sessions[id]
    if (!this.isReferenced(rid) && this.index.resources[rid] !== undefined) {
      this.index.resources[rid].unreferencedAt = this.now()
    }
    await this.flush()
  }

  async listSession(sessionId, { status } = {}) {
    this.assertOpen()
    return this.listSessionSync(sessionId, { status })
  }

  listSessionSync(sessionId, { status } = {}) {
    this.assertOpen()
    const id = validateSessionId(sessionId)
    return (this.index.sessions[id] ?? [])
      .filter(binding => status === undefined || binding.status === status)
      .flatMap(binding => {
        const resource = this.index.resources[binding.resourceId]
        return resource === undefined ? [] : [{ ...this.publicRecord(resource, binding.fileName), status: binding.status }]
      })
  }

  async getForSession(sessionId, resourceId) {
    this.assertOpen()
    const id = validateSessionId(sessionId)
    const rid = validateResourceId(resourceId)
    const binding = (this.index.sessions[id] ?? []).find(candidate => candidate.resourceId === rid)
    if (binding === undefined) throw new Error('resource is not attached to this session')
    const resource = this.index.resources[rid]
    if (resource === undefined) throw new Error('resource not found')
    resource.lastAccess = this.now()
    return this.publicRecord(resource, binding.fileName)
  }

  async setDerived(resourceId, { kind, chunks }) {
    this.assertOpen()
    const rid = validateResourceId(resourceId)
    const resource = this.index.resources[rid]
    if (resource === undefined) throw new Error('resource not found')
    const relative = join('derived', resource.hash.slice(0, 2), `${resource.hash}.json.gz`)
    const target = join(this.root, relative)
    const encoded = Buffer.from(JSON.stringify({ version: 1, resourceId: rid, kind, chunks }))
    const compressed = await gzip(encoded, { level: 6 })
    const additionalBytes = Math.max(0, compressed.length - (resource.derivedBytes ?? 0))
    await this.makeRoom(additionalBytes, rid)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, compressed, { mode: 0o600 })
    resource.kind = kind
    resource.derivedRelative = relative
    resource.derivedBytes = compressed.length
    resource.unitCount = chunks.length
    resource.lastAccess = this.now()
    await this.flush()
    return this.publicRecord(resource)
  }

  async readDerivedForSession(sessionId, resourceId) {
    const resource = await this.getForSession(sessionId, resourceId)
    if (resource.derivedPath === null) throw new Error('resource parsing is not complete')
    const parsed = JSON.parse((await gunzip(await readFile(resource.derivedPath))).toString('utf8'))
    return { ...resource, chunks: parsed.chunks }
  }

  async collectGarbage() {
    this.assertOpen()
    let removedObjects = 0
    let removedBytes = 0
    for (const [resourceId, resource] of Object.entries(this.index.resources)) {
      if (this.isReferenced(resourceId) || resource.unreferencedAt === null) continue
      if (this.now() - resource.unreferencedAt <= this.limits.unreferencedTtlMs) continue
      await rm(join(this.root, resource.objectRelative), { force: true })
      if (resource.derivedRelative !== null) await rm(join(this.root, resource.derivedRelative), { force: true })
      removedObjects += 1
      removedBytes += resource.size + (resource.derivedBytes ?? 0)
      delete this.index.resources[resourceId]
    }
    if (removedObjects > 0) await this.flush()
    return { removedObjects, removedBytes }
  }

  publicRecord(resource, displayName = resource.fileName) {
    return {
      resourceId: resource.resourceId,
      fileName: displayName,
      mediaType: resource.mediaType,
      kind: resource.kind,
      size: resource.size,
      unitCount: resource.unitCount,
      objectPath: join(this.root, resource.objectRelative),
      derivedPath: resource.derivedRelative === null ? null : join(this.root, resource.derivedRelative),
    }
  }

  assertSessionQuota(sessionId, resourceId, incomingBytes) {
    const bindings = this.index.sessions[sessionId] ?? []
    if (bindings.some(binding => binding.resourceId === resourceId)) return
    if (bindings.length >= this.limits.maxFilesPerSession) throw new Error(`session exceeds ${this.limits.maxFilesPerSession} files`)
    const total = bindings.reduce((sum, binding) => sum + (this.index.resources[binding.resourceId]?.size ?? 0), 0)
    if (total + incomingBytes > this.limits.maxBatchBytes) throw new Error(`batch exceeds ${this.limits.maxBatchBytes} bytes`)
  }

  cacheBytes() {
    return Object.values(this.index.resources)
      .reduce((sum, resource) => sum + resource.size + (resource.derivedBytes ?? 0), 0)
  }

  async makeRoom(incomingBytes, excludedResourceId) {
    let total = this.cacheBytes()
    if (total + incomingBytes <= this.limits.maxCacheBytes) return
    const candidates = Object.values(this.index.resources)
      .filter(resource => resource.resourceId !== excludedResourceId && !this.hasPendingReference(resource.resourceId))
      .sort((left, right) => left.lastAccess - right.lastAccess)
    for (const resource of candidates) {
      await this.purgeResource(resource.resourceId)
      total -= resource.size + (resource.derivedBytes ?? 0)
      if (total + incomingBytes <= this.limits.maxCacheBytes) return
    }
    throw new Error(`cache exceeds ${this.limits.maxCacheBytes} bytes`)
  }

  hasPendingReference(resourceId) {
    return Object.values(this.index.sessions)
      .some(bindings => bindings.some(binding => binding.resourceId === resourceId && binding.status === 'pending'))
  }

  async purgeResource(resourceId) {
    const resource = this.index.resources[resourceId]
    if (resource === undefined) return
    await rm(join(this.root, resource.objectRelative), { force: true })
    if (resource.derivedRelative !== null) await rm(join(this.root, resource.derivedRelative), { force: true })
    for (const [sessionId, bindings] of Object.entries(this.index.sessions)) {
      const next = bindings.filter(binding => binding.resourceId !== resourceId)
      if (next.length === 0) delete this.index.sessions[sessionId]
      else this.index.sessions[sessionId] = next
    }
    delete this.index.resources[resourceId]
  }

  isReferenced(resourceId) {
    return Object.values(this.index.sessions).some(bindings => bindings.some(binding => binding.resourceId === resourceId))
  }

  async flush() {
    const snapshot = JSON.stringify(this.index, null, 2)
    this.writeChain = this.writeChain.then(async () => {
      const staging = `${this.indexPath}.${randomUUID()}.tmp`
      await writeFile(staging, snapshot, { flag: 'wx', mode: 0o600 })
      await rename(staging, this.indexPath)
    })
    await this.writeChain
  }

  assertOpen() {
    if (!this.opened) throw new Error('resource store is not open')
  }
}
