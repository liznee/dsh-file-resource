import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import TestRenderer from 'react-test-renderer'

import {
  FILE_DOCK_STYLES,
  FileResourceDock,
  ResourceCard,
  en,
  placeDockInsideComposer,
  zh,
} from '../src/client/file-dock.js'

const t = key => zh[key] ?? key

test('renders a compact processing card with real progress and a circular cancel control', () => {
  const renderer = TestRenderer.create(React.createElement(ResourceCard, {
    item: { localId: 'one', fileName: 'report.docx', size: 1024, status: 'uploading', progress: 0.5 },
    onRemove: () => {},
    t,
  }))
  const root = renderer.root
  assert.equal(root.findByProps({ 'data-file-resource-card': true }).props['data-status'], 'uploading')
  assert.equal(root.findByProps({ role: 'progressbar' }).props['aria-valuenow'], 50)
  const cancel = root.findByProps({ 'aria-label': zh.cancel })
  assert.match(cancel.props.className, /dsh-file-resource-cancel/)
  renderer.unmount()
})

test('keeps document cards compact instead of stretching across the composer', () => {
  assert.match(FILE_DOCK_STYLES, /\.dsh-file-resource-dock\s*\{[^}]*display:\s*flex/isu)
  assert.match(FILE_DOCK_STYLES, /\.dsh-file-resource-card\s*\{[^}]*width:\s*220px/isu)
  assert.match(FILE_DOCK_STYLES, /\.dsh-file-resource-card\s*\{[^}]*max-width:\s*calc\(100vw\s*-\s*48px\)/isu)
  assert.doesNotMatch(FILE_DOCK_STYLES, /\.dsh-file-resource-card\s*\{[^}]*width:\s*100%/isu)
})

test('places the document dock inside the composer before the text editor and restores it on cleanup', () => {
  const origin = fakeParent('origin')
  const composer = fakeParent('composer')
  const scroll = { name: 'scroll', parentNode: composer }
  const dock = { dataset: {}, name: 'dock', parentNode: origin }
  origin.children.push(dock)
  composer.children.push(scroll)
  composer.querySelector = selector => selector === '[data-input-scroll]' ? scroll : null
  const documentRef = {
    createComment() {
      const marker = { name: 'marker', parentNode: null }
      marker.remove = () => { marker.parentNode?.removeChild(marker) }
      return marker
    },
    querySelector: selector => selector === '[data-composer-card]' ? composer : null,
  }

  const dispose = placeDockInsideComposer(dock, documentRef)

  assert.deepEqual(composer.children, [dock, scroll])
  assert.equal(dock.dataset.composerAttachment, 'true')
  dispose()
  assert.deepEqual(origin.children, [dock])
  assert.equal(dock.dataset.composerAttachment, undefined)
})

function fakeParent(name) {
  return {
    children: [],
    name,
    insertBefore(node, before) {
      node.parentNode?.removeChild(node)
      const index = before === null ? -1 : this.children.indexOf(before)
      if (index === -1) this.children.push(node)
      else this.children.splice(index, 0, node)
      node.parentNode = this
    },
    removeChild(node) {
      const index = this.children.indexOf(node)
      if (index !== -1) this.children.splice(index, 1)
      node.parentNode = null
    },
  }
}

test('localizes ready, parsing, error and cancellation states', () => {
  for (const dictionary of [zh, en]) {
    assert.equal(typeof dictionary.ready, 'string')
    assert.equal(typeof dictionary.processing, 'string')
    assert.equal(typeof dictionary.failed, 'string')
    assert.equal(typeof dictionary.cancel, 'string')
  }
})

class FakeUpload extends EventTarget {}

class FakeXhr extends EventTarget {
  constructor() {
    super()
    this.headers = {}
    this.upload = new FakeUpload()
    this.response = null
    this.status = 0
    FakeXhr.last = this
  }
  open(method, url) { this.method = method; this.url = url }
  setRequestHeader(name, value) { this.headers[name] = value }
  send(body) { this.body = body }
  abort() { this.dispatchEvent(new Event('abort')) }
  complete(status, response) { this.status = status; this.response = response; this.dispatchEvent(new Event('load')) }
}

function selectedEvent(files) {
  return Object.assign(new Event('dsh-file-resource:selected'), { detail: { files } })
}

function response(body, ok = true, status = 200) {
  return { ok, status, async json() { return body } }
}

async function withDockEnvironment(fetchImpl, run) {
  const previous = {
    document: globalThis.document,
    fetch: globalThis.fetch,
    XMLHttpRequest: globalThis.XMLHttpRequest,
  }
  const documentRef = new EventTarget()
  documentRef.querySelector = () => null
  globalThis.document = documentRef
  globalThis.fetch = fetchImpl
  globalThis.XMLHttpRequest = FakeXhr
  try {
    await run(documentRef)
  } finally {
    globalThis.document = previous.document
    globalThis.fetch = previous.fetch
    globalThis.XMLHttpRequest = previous.XMLHttpRequest
  }
}

test('uploads selected documents, reports real progress, and removes ready resources', async () => {
  const calls = []
  await withDockEnvironment(async (_url, options) => {
    calls.push(options)
    if (options.headers['X-DSH-Operation'] === 'list') return response({ ok: true, resources: [] })
    return response({ ok: true })
  }, async documentRef => {
    let renderer
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(FileResourceDock, {
        sessionId: 'session-a', input: { phase: 'plain', draft: '' }, t,
      }))
    })

    const file = new Blob(['hello'], { type: 'text/plain' })
    file.name = 'notes.txt'
    await TestRenderer.act(async () => { documentRef.dispatchEvent(selectedEvent([file])) })
    assert.equal(renderer.root.findByProps({ role: 'progressbar' }).props['aria-valuenow'], 0)

    await TestRenderer.act(async () => {
      FakeXhr.last.upload.dispatchEvent(Object.assign(new Event('progress'), {
        lengthComputable: true, loaded: 4, total: 5,
      }))
      FakeXhr.last.upload.dispatchEvent(new Event('load'))
    })
    assert.equal(renderer.root.findByProps({ 'data-file-resource-card': true }).props['data-status'], 'processing')

    await TestRenderer.act(async () => {
      FakeXhr.last.complete(200, {
        ok: true,
        resource: { resourceId: 'res_1234567890123456', mediaType: 'text/plain' },
      })
      await Promise.resolve()
    })
    const ready = renderer.root.findByProps({ 'data-file-resource-card': true })
    assert.equal(ready.props['data-status'], 'ready')

    await TestRenderer.act(async () => {
      renderer.root.findByProps({ 'aria-label': zh.remove }).props.onClick()
      await Promise.resolve()
    })
    assert.equal(renderer.toJSON(), null)
    assert.equal(calls.some(call => call.headers['X-DSH-Operation'] === 'remove'), true)
    await TestRenderer.act(async () => { renderer.unmount() })
  })
})

test('restores pending cards and commits them only after Harness finishes submission', async () => {
  const operations = []
  await withDockEnvironment(async (_url, options) => {
    const operation = options.headers['X-DSH-Operation']
    operations.push(operation)
    if (operation === 'list') {
      return response({
        ok: true,
        resources: [{ resourceId: 'res_1234567890123456', fileName: 'report.pdf', size: 2048 }],
      })
    }
    return response({ ok: true })
  }, async () => {
    let renderer
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(FileResourceDock, {
        sessionId: 'session-a', input: { phase: 'plain', draft: 'review it' }, t,
      }))
      await Promise.resolve()
    })
    assert.equal(renderer.root.findByProps({ 'data-file-resource-card': true }).props['data-status'], 'ready')

    await TestRenderer.act(async () => {
      renderer.update(React.createElement(FileResourceDock, {
        sessionId: 'session-a', input: { phase: 'submitting', draft: 'review it' }, t,
      }))
    })
    await TestRenderer.act(async () => {
      renderer.update(React.createElement(FileResourceDock, {
        sessionId: 'session-a', input: { phase: 'plain', draft: '' }, t,
      }))
      await Promise.resolve()
    })
    assert.equal(operations.includes('commit'), true)
    assert.equal(renderer.toJSON(), null)
    await TestRenderer.act(async () => { renderer.unmount() })
  })
})

test('rejects oversized selections before starting browser uploads', async () => {
  await withDockEnvironment(async () => response({ ok: true, resources: [] }), async documentRef => {
    let renderer
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(React.createElement(FileResourceDock, {
        sessionId: 'session-a', input: { phase: 'plain', draft: '' }, t,
      }))
    })
    const files = Array.from({ length: 21 }, (_, index) => ({
      name: `file-${index}.txt`, size: 1, type: 'text/plain',
    }))
    await TestRenderer.act(async () => { documentRef.dispatchEvent(selectedEvent(files)) })
    assert.match(renderer.root.findByProps({ className: 'dsh-file-resource-name' }).children.join(''), /20/)
    await TestRenderer.act(async () => { renderer.unmount() })
  })
})
