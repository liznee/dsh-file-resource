import assert from 'node:assert/strict'
import test from 'node:test'

import {
  bindFileOnlySendButton,
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
  binding.update({ eligible: false, busy: false })
  assert.equal(button.dataset.dshFileResourceSend, undefined)
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
