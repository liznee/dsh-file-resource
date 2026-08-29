import assert from 'node:assert/strict'
import test from 'node:test'

import {
  bindAttachedSendButton,
  bindFileOnlySendButton,
  composeAttachedDraft,
  shouldCommitDraftFiles,
  uploadBrowserResource,
} from '../src/client/resources.js'

class FakeUpload extends EventTarget {}

class FakeXhr extends EventTarget {
  constructor() {
    super()
    this.headers = {}
    this.upload = new FakeUpload()
    this.response = null
    this.status = 0
    this.aborted = false
    FakeXhr.last = this
  }
  open(method, url) { this.method = method; this.url = url }
  setRequestHeader(name, value) { this.headers[name] = value }
  send(body) { this.body = body }
  abort() { this.aborted = true; this.dispatchEvent(new Event('abort')) }
  complete(status, response) { this.status = status; this.response = response; this.dispatchEvent(new Event('load')) }
}

class FakeButton extends EventTarget {
  constructor() {
    super()
    this.dataset = {}
    this.disabled = true
  }
}

test('uploads raw bytes with scoped metadata and real progress events', async () => {
  const file = new Blob(['hello'], { type: 'text/plain' })
  file.name = 'notes.txt'
  const progress = []
  const operation = uploadBrowserResource({
    sessionId: 'session-a', file, onProgress: value => { progress.push(value) }, XMLHttpRequestCtor: FakeXhr,
  })
  const xhr = FakeXhr.last
  assert.equal(xhr.method, 'POST')
  assert.equal(xhr.headers['X-DSH-File-Resource'], '1')
  assert.equal(xhr.headers['X-DSH-Session'], 'session-a')
  assert.equal(decodeURIComponent(xhr.headers['X-DSH-File-Name']), 'notes.txt')
  xhr.upload.dispatchEvent(Object.assign(new Event('progress'), { lengthComputable: true, loaded: 3, total: 5 }))
  xhr.complete(200, { ok: true, resource: { resourceId: 'res_123', status: 'ready' } })
  assert.deepEqual(await operation.promise, { resourceId: 'res_123', status: 'ready' })
  assert.deepEqual(progress, [0.6])
})

test('aborting an upload rejects it without converting cancellation into an error card', async () => {
  const file = new Blob(['hello'], { type: 'text/plain' })
  file.name = 'notes.txt'
  const operation = uploadBrowserResource({ sessionId: 'session-a', file, XMLHttpRequestCtor: FakeXhr })
  operation.abort()
  await assert.rejects(operation.promise, error => error?.name === 'AbortError')
})

test('file-only binding enables the resident send button and owns only eligible clicks', async () => {
  const button = new FakeButton()
  let sent = 0
  const binding = bindFileOnlySendButton(button, { onSend: async () => { sent += 1 } })
  binding.update({ eligible: true, busy: false })
  assert.equal(button.disabled, false)
  assert.equal(button.dataset.dshFileResourceSend, 'true')
  assert.equal(button.dataset.dshFileSend, undefined)
  button.dispatchEvent(new Event('click', { cancelable: true }))
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(sent, 1)
  binding.update({ eligible: false, busy: false, reactDisabled: true })
  assert.equal(button.dataset.dshFileResourceSend, undefined)
  binding.dispose()
})

test('never disables a button it did not enable (React owns the disabled attribute)', () => {
  const button = new FakeButton()
  button.disabled = false
  const binding = bindFileOnlySendButton(button, { onSend: async () => {} })
  binding.update({ eligible: false, busy: false, reactDisabled: false })
  assert.equal(button.disabled, false)
  binding.update({ eligible: false, busy: false, reactDisabled: true })
  assert.equal(button.disabled, false)
  binding.dispose()
})

test('releases an owned button without touching disabled when the user types', () => {
  const button = new FakeButton()
  const binding = bindFileOnlySendButton(button, { onSend: async () => {} })
  binding.update({ eligible: true, busy: false })
  assert.equal(button.disabled, false)

  // 用户打字：React 自己启用按钮（reactDisabled=false），插件必须放手且不改 DOM
  binding.update({ eligible: false, busy: false, reactDisabled: false })
  assert.equal(button.disabled, false)
  assert.equal(button.dataset.dshFileResourceSend, undefined)
  binding.dispose()
})

test('restores a still-owned button when files vanish and the draft stays empty', () => {
  const button = new FakeButton()
  const binding = bindFileOnlySendButton(button, { onSend: async () => {} })
  binding.update({ eligible: true, busy: false })
  assert.equal(button.disabled, false)

  // 文件被删光、草稿仍空：React 语义为禁用（空草稿），插件恢复自己劫持过的按钮
  binding.update({ eligible: false, busy: false, reactDisabled: true })
  assert.equal(button.disabled, true)
  assert.equal(button.dataset.dshFileResourceSend, undefined)
  binding.dispose()
})

test('click flight uses inert instead of mutating the disabled attribute', async () => {
  const button = new FakeButton()
  let release
  const gate = new Promise(resolve => { release = resolve })
  const binding = bindFileOnlySendButton(button, { onSend: () => gate })
  binding.update({ eligible: true, busy: false })
  assert.equal(button.disabled, false)

  button.dispatchEvent(new Event('click', { cancelable: true }))
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(button.inert, true)
  assert.equal(button.disabled, false)
  assert.equal(button.dataset.dshFileResourceSendBusy, 'true')

  release()
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(button.inert, false)
  assert.equal(button.disabled, false)
  assert.equal(button.dataset.dshFileResourceSendBusy, undefined)
  binding.dispose()
})

test('recovers busy and inert even when onSend throws synchronously', async () => {
  const button = new FakeButton()
  const binding = bindFileOnlySendButton(button, { onSend: () => { throw new Error('wake failed') } })
  binding.update({ eligible: true, busy: false })

  button.dispatchEvent(new Event('click', { cancelable: true }))
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(button.inert, false)
  assert.equal(button.dataset.dshFileResourceSendBusy, undefined)
  binding.dispose()
})

test('dispose never mutates the disabled attribute', () => {
  const button = new FakeButton()
  const binding = bindFileOnlySendButton(button, { onSend: async () => {} })
  binding.update({ eligible: true, busy: false })
  assert.equal(button.disabled, false)
  button.disabled = false
  binding.dispose()
  assert.equal(button.disabled, false)
  assert.equal(button.dataset.dshFileResourceSend, undefined)
})

test('composeAttachedDraft appends @names after the text, or alone for file-only sends', () => {
  assert.equal(composeAttachedDraft('review this', ['a.pdf', 'b.xlsx']), 'review this @a.pdf @b.xlsx')
  assert.equal(composeAttachedDraft('', ['a.pdf']), '@a.pdf')
  assert.equal(composeAttachedDraft('x', []), 'x')
  assert.equal(composeAttachedDraft('  x  ', ['a.pdf']), '  x @a.pdf')
})

test('attached binding appends @names to the draft and submits instead of waking', () => {
  const button = new FakeButton()
  let draft = '帮我看下'
  const calls = []
  const binding = bindAttachedSendButton(button, {
    getDraft: () => draft,
    setDraft: value => { draft = value },
    submit: () => { calls.push('submit') },
    getReadyNames: () => ['剑来收藏卡册.xlsx'],
  })
  binding.update({ eligible: true, busy: false })
  assert.equal(button.disabled, false)
  assert.equal(button.dataset.dshFileResourceSend, 'true')

  button.dispatchEvent(new Event('click', { cancelable: true }))
  assert.equal(draft, '帮我看下 @剑来收藏卡册.xlsx')
  assert.deepEqual(calls, ['submit'])
  assert.equal(button.dataset.dshFileResourceSendBusy, undefined)
  binding.dispose()
})

test('attached binding leaves the draft alone when there is nothing to attach', () => {
  const button = new FakeButton()
  const calls = []
  const binding = bindAttachedSendButton(button, {
    getDraft: () => 'plain text',
    setDraft: () => { calls.push('setDraft') },
    submit: () => { calls.push('submit') },
    getReadyNames: () => [],
  })
  binding.update({ eligible: true, busy: false })
  button.dispatchEvent(new Event('click', { cancelable: true }))
  assert.deepEqual(calls, [])
  binding.dispose()
})

test('commits document cards only after a successful Harness submission', () => {
  assert.equal(shouldCommitDraftFiles(
    { phase: 'submitting', draft: 'review this' },
    { phase: 'plain', draft: '' },
  ), true)
  assert.equal(shouldCommitDraftFiles(
    { phase: 'submitting', draft: 'review this' },
    { phase: 'plain', draft: 'review this' },
  ), false)
})
