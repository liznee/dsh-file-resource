import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { ResourceService } from '../src/resource-service.js'
import { ResourceStore } from '../src/resource-store.js'
import { createReadResourceTool } from '../src/resource-tool.js'

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-resource-service-'))
  const store = new ResourceStore({ root })
  await store.open()
  const service = new ResourceService({ store })
  try {
    await run(service)
  } finally {
    await store.close()
    await rm(root, { recursive: true, force: true })
  }
}

test('uploads, parses and reads a bounded selection under the same session', async () => {
  await fixture(async service => {
    const uploaded = await service.upload({
      sessionId: 'session-a', fileName: 'notes.txt', mediaType: 'text/plain', bytes: Buffer.from('alpha\nbeta\ngamma'),
    })
    assert.equal(uploaded.status, 'ready')
    const read = await service.read('session-a', { resource_id: uploaded.resourceId, selector: 'chunk:0', limit: 5 })
    assert.equal(read.text, 'alpha')
    assert.equal(read.truncated, true)
    assert.match(service.promptFor('session-a'), new RegExp(uploaded.resourceId))
  })
})

test('committing a draft keeps the resource readable but removes it from pending UI state', async () => {
  await fixture(async service => {
    const uploaded = await service.upload({
      sessionId: 'session-a', fileName: 'notes.txt', mediaType: 'text/plain', bytes: Buffer.from('hello'),
    })
    await service.commit('session-a', [uploaded.resourceId])
    assert.equal((await service.listPending('session-a')).length, 0)
    assert.equal((await service.read('session-a', { resource_id: uploaded.resourceId })).text, 'hello')
    assert.match(service.promptFor('session-a'), /notes\.txt/)
  })
})

test('tool execution is scoped to the calling agent session', async () => {
  await fixture(async service => {
    const uploaded = await service.upload({
      sessionId: 'session-a', fileName: 'private.txt', mediaType: 'text/plain', bytes: Buffer.from('private'),
    })
    const tool = createReadResourceTool(service)
    const ok = await tool.execute({ resource_id: uploaded.resourceId }, { agent: { id: 'session-a' }, signal: new AbortController().signal })
    assert.equal(ok.text, 'private')
    await assert.rejects(() => tool.execute(
      { resource_id: uploaded.resourceId },
      { agent: { id: 'session-b' }, signal: new AbortController().signal },
    ), /not attached to this session/)
  })
})
