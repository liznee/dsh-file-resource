import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { ResourceStore } from '../src/resource-store.js'

async function withStore(run, options = {}) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-file-resource-'))
  const store = new ResourceStore({ root, ...options })
  try {
    await store.open()
    await run(store, root)
  } finally {
    await store.close()
    await rm(root, { recursive: true, force: true })
  }
}

test('stores uploaded bytes by content hash and deduplicates identical files', async () => {
  await withStore(async (store, root) => {
    const first = await store.put({
      sessionId: 'session-a',
      fileName: 'notes.txt',
      mediaType: 'text/plain',
      bytes: Buffer.from('hello\nworld'),
    })
    const second = await store.put({
      sessionId: 'session-a',
      fileName: 'copy.txt',
      mediaType: 'text/plain',
      bytes: Buffer.from('hello\nworld'),
    })

    assert.equal(first.resourceId, second.resourceId)
    assert.match(first.resourceId, /^res_[a-f0-9]{32}$/)
    assert.equal((await store.listSession('session-a')).length, 1)
    assert.equal((await stat(first.objectPath)).size, 11)
    assert.equal(await readFile(first.objectPath, 'utf8'), 'hello\nworld')
    assert.equal(first.objectPath.startsWith(root), true)
  })
})

test('enforces per-file, per-batch and cache quotas before retaining bytes', async () => {
  await withStore(async (store) => {
    await assert.rejects(() => store.put({
      sessionId: 'session-a', fileName: 'large.txt', mediaType: 'text/plain', bytes: Buffer.alloc(9),
    }), /file exceeds 8 bytes/)

    await store.put({
      sessionId: 'session-a', fileName: 'a.txt', mediaType: 'text/plain', bytes: Buffer.alloc(6, 1),
    })
    await assert.rejects(() => store.put({
      sessionId: 'session-a', fileName: 'b.txt', mediaType: 'text/plain', bytes: Buffer.alloc(5, 2),
    }), /batch exceeds 10 bytes/)
  }, { maxFileBytes: 8, maxBatchBytes: 10, maxCacheBytes: 12 })
})

test('session removal releases only references and garbage collection removes expired objects', async () => {
  let now = 1_000
  await withStore(async (store) => {
    const item = await store.put({
      sessionId: 'session-a', fileName: 'shared.txt', mediaType: 'text/plain', bytes: Buffer.from('shared'),
    })
    await store.attach('session-b', item.resourceId, 'shared-again.txt')
    await store.remove('session-a', item.resourceId)
    assert.equal((await store.getForSession('session-b', item.resourceId)).resourceId, item.resourceId)
    assert.equal((await store.collectGarbage()).removedObjects, 0)

    await store.remove('session-b', item.resourceId)
    now += 101
    assert.equal((await store.collectGarbage()).removedObjects, 1)
    await assert.rejects(() => stat(item.objectPath), /ENOENT/)
  }, { now: () => now, unreferencedTtlMs: 100 })
})

test('never returns a resource across session boundaries', async () => {
  await withStore(async (store) => {
    const item = await store.put({
      sessionId: 'session-a', fileName: 'private.txt', mediaType: 'text/plain', bytes: Buffer.from('private'),
    })
    await assert.rejects(() => store.getForSession('session-b', item.resourceId), /not attached to this session/)
  })
})

test('compresses derived text instead of leaving Markdown or JSON sidecars uncompressed', async () => {
  await withStore(async store => {
    const item = await store.put({
      sessionId: 'session-a', fileName: 'notes.txt', mediaType: 'text/plain', bytes: Buffer.from('hello'),
    })
    const text = 'repeated content '.repeat(1_000)
    const ready = await store.setDerived(item.resourceId, {
      kind: 'text', chunks: [{ index: 0, text, metadata: {} }],
    })
    assert.match(ready.derivedPath, /\.json\.gz$/)
    assert.equal((await stat(ready.derivedPath)).size < Buffer.byteLength(text), true)
    assert.equal((await store.readDerivedForSession('session-a', item.resourceId)).chunks[0].text, text)
  })
})

test('evicts the least-recently-used sent resource only when the cache cap needs room', async () => {
  await withStore(async store => {
    const old = await store.put({
      sessionId: 'session-a', fileName: 'old.txt', mediaType: 'text/plain', bytes: Buffer.alloc(6, 1),
    })
    await store.markSent('session-a', [old.resourceId])
    const current = await store.put({
      sessionId: 'session-b', fileName: 'new.txt', mediaType: 'text/plain', bytes: Buffer.alloc(6, 2),
    })
    assert.equal((await store.getForSession('session-b', current.resourceId)).resourceId, current.resourceId)
    await assert.rejects(() => store.getForSession('session-a', old.resourceId), /not attached/)
  }, { maxCacheBytes: 10, maxFileBytes: 8 })
})
