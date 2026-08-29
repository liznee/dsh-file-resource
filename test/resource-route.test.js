import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'

import { createResourceRoute } from '../src/resource-route.js'

function request(body, headers = {}, method = 'POST') {
  const req = Readable.from(body === undefined ? [] : [body])
  req.method = method
  req.headers = {
    host: '127.0.0.1:3080',
    origin: 'http://127.0.0.1:3080',
    'sec-fetch-site': 'same-origin',
    'x-dsh-file-resource': '1',
    ...headers,
  }
  return req
}

function response() {
  const chunks = []
  return {
    statusCode: 0,
    headers: {},
    writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers },
    end(chunk = '') { chunks.push(Buffer.from(chunk)) },
    json() { return JSON.parse(Buffer.concat(chunks).toString('utf8')) },
  }
}

test('upload route accepts same-origin bounded bytes and returns parser metadata', async () => {
  const calls = []
  const route = createResourceRoute({
    upload: async input => { calls.push(input); return { resourceId: 'res_123', status: 'ready' } },
  }, { maxFileBytes: 20 })
  const req = request(Buffer.from('hello'), {
    'content-length': '5',
    'x-dsh-operation': 'upload',
    'x-dsh-session': 'session-a',
    'x-dsh-file-name': encodeURIComponent('notes.txt'),
    'x-dsh-media-type': 'text/plain',
  })
  const res = response()
  await route.handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.equal(calls[0].bytes.toString(), 'hello')
  assert.deepEqual(res.json(), { ok: true, resource: { resourceId: 'res_123', status: 'ready' } })
})

test('route rejects cross-origin and oversized requests without calling the service', async () => {
  let calls = 0
  const route = createResourceRoute({ upload: async () => { calls += 1 } }, { maxFileBytes: 4 })
  const foreign = request(Buffer.from('x'), { origin: 'https://evil.example', 'x-dsh-operation': 'upload' })
  const foreignResponse = response()
  await route.handler(foreign, foreignResponse)
  assert.equal(foreignResponse.statusCode, 403)

  const large = request(Buffer.from('12345'), { 'content-length': '5', 'x-dsh-operation': 'upload' })
  const largeResponse = response()
  await route.handler(large, largeResponse)
  assert.equal(largeResponse.statusCode, 413)
  assert.equal(calls, 0)
})

test('preview operation reads an attached file by name for the session', async () => {
  const calls = []
  const route = createResourceRoute({
    preview: async (sessionId, fileName) => {
      calls.push([sessionId, fileName])
      return { fileName, kind: 'xlsx', text: 'cells', truncated: false }
    },
  })
  const req = request(undefined, {
    'x-dsh-operation': 'preview',
    'x-dsh-session': 'session-a',
    'x-dsh-file-name': encodeURIComponent('剑来收藏卡册.xlsx'),
  }, 'GET')
  const res = response()
  await route.handler(req, res)
  assert.equal(res.statusCode, 200)
  assert.deepEqual(calls[0], ['session-a', '剑来收藏卡册.xlsx'])
  assert.deepEqual(res.json(), {
    ok: true,
    preview: { fileName: '剑来收藏卡册.xlsx', kind: 'xlsx', text: 'cells', truncated: false },
  })
})

test('route does not leak stack traces or local paths in error responses', async () => {
  const route = createResourceRoute({ upload: async () => { throw new Error('C:\\private\\secret.txt\nSTACK') } })
  const req = request(Buffer.from('x'), { 'content-length': '1', 'x-dsh-operation': 'upload' })
  const res = response()
  await route.handler(req, res)
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.json(), { ok: false, error: 'The file could not be processed.' })
})

test('aborting the browser request cancels the parser signal', async () => {
  let observedSignal
  let release
  const route = createResourceRoute({
    upload: async input => {
      observedSignal = input.signal
      await new Promise(resolve => { release = resolve })
      return { resourceId: 'res_123', status: 'ready' }
    },
  })
  const req = request(Buffer.from('hello'), {
    'content-length': '5',
    'x-dsh-operation': 'upload',
    'x-dsh-session': 'session-a',
    'x-dsh-file-name': encodeURIComponent('notes.txt'),
    'x-dsh-media-type': 'text/plain',
  })
  const res = response()
  const pending = route.handler(req, res)
  while (observedSignal === undefined) await new Promise(resolve => setTimeout(resolve, 0))
  req.emit('aborted')
  assert.equal(observedSignal.aborted, true)
  release()
  await pending
})
