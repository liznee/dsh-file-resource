import { ParseQueue, parseResource } from './resource-parser.js'
import { readSelection, resourcePrompt } from './resource-reader.js'
import { validateDeclaredFile } from './resource-security.js'

export class ResourceService {
  constructor({ store, parseQueue = new ParseQueue({ concurrency: 1 }), parser = parseResource }) {
    this.store = store
    this.parseQueue = parseQueue
    this.parser = parser
  }

  async upload({ sessionId, fileName, mediaType, bytes, signal }) {
    const declared = await validateDeclaredFile({ fileName, mediaType, bytes })
    if (declared.kind === 'image') throw new Error('images must use the native Harness attachment path')
    const stored = await this.store.put({
      sessionId,
      fileName: declared.fileName,
      mediaType: declared.mediaType,
      bytes,
      kind: declared.kind,
    })
    if (stored.derivedPath === null) {
      try {
        const parsed = await this.parseQueue.run(() => this.parser(stored, { signal }))
        await this.store.setDerived(stored.resourceId, parsed)
      } catch (error) {
        await this.store.remove(sessionId, stored.resourceId)
        throw error
      }
    }
    const ready = await this.store.getForSession(sessionId, stored.resourceId)
    return { ...ready, status: 'ready' }
  }

  listPending(sessionId) {
    return this.store.listSession(sessionId, { status: 'pending' })
  }

  listAll(sessionId) {
    return this.store.listSession(sessionId)
  }

  async read(sessionId, args) {
    const resource = await this.store.readDerivedForSession(sessionId, args.resource_id)
    return readSelection(resource, {
      selector: args.selector,
      offset: args.offset,
      limit: args.limit,
    })
  }

  async commit(sessionId, resourceIds) {
    await this.store.markSent(sessionId, resourceIds)
    return { committed: resourceIds.length }
  }

  async remove(sessionId, resourceId) {
    await this.store.remove(sessionId, resourceId)
    return { removed: true }
  }

  /** Read a bounded preview of an attached file by its file name. */
  async preview(sessionId, fileName) {
    const resources = await this.store.listSession(sessionId)
    const match = resources.find(resource => String(resource.fileName) === String(fileName))
    if (match === undefined) throw new Error('no attached file with that name')
    const derived = await this.store.readDerivedForSession(sessionId, match.resourceId)
    const selection = readSelection(derived, { selector: 'summary', limit: 12_000 })
    return {
      fileName: match.fileName,
      kind: match.kind,
      size: match.size,
      text: selection.text,
      truncated: selection.truncated,
      nextOffset: selection.nextOffset,
    }
  }

  promptFor(sessionId) {
    return resourcePrompt(this.store.listSessionSync(sessionId))
  }

  collectGarbage() {
    return this.store.collectGarbage()
  }
}
