import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import TestRenderer from 'react-test-renderer'

import {
  FILE_DOCK_STYLES,
  FileResourceDock,
  ResourceCard,
  bindComposerDockActions,
  en,
  placeDockInsideComposer,
  reactDisabledFromInput,
  zh,
} from '../src/client/file-dock.js'

const t = key => zh[key] ?? key

test('reactDisabledFromInput mirrors the official empty || machineBusy semantics', () => {
  // 空草稿、无附件 → 禁用
  assert.equal(reactDisabledFromInput({ phase: 'plain', draft: '', imageIds: [] }), true)
  // 打字后 → 启用（修复的核心场景）
  assert.equal(reactDisabledFromInput({ phase: 'plain', draft: 'review this', imageIds: [] }), false)
  // 忙阶段（与官方 machineBusy 完全一致的枚举，不含其他相位）
  assert.equal(reactDisabledFromInput({ phase: 'adjudicating', draft: 'review this', imageIds: [] }), true)
  assert.equal(reactDisabledFromInput({ phase: 'submitting', draft: 'review this', imageIds: [] }), true)
  // claimed 相位官方不禁用：草稿非空时保持启用
  assert.equal(reactDisabledFromInput({ phase: 'claimed', draft: '/goal x', imageIds: [] }), false)
  // 官方图片附件存在时官方不禁用（attachments 非空）
  assert.equal(reactDisabledFromInput({ phase: 'plain', draft: '', imageIds: ['img-1'] }), false)
  // 缺省/畸形状态按禁用处理，且不抛异常
  assert.equal(reactDisabledFromInput(undefined), true)
  assert.equal(reactDisabledFromInput(null), true)
  assert.equal(reactDisabledFromInput({ phase: 'plain', draft: '' }), true)
})

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
  assert.match(FILE_DOCK_STYLES, /\.dsh-file-resource-dock\[hidden\]\s*\{[^}]*display:\s*none/isu)
})

test('mirrors the document dock inside the composer without moving React-owned DOM', () => {
  const origin = fakeParent('origin')
  const composer = fakeParent('composer')
  const scroll = { name: 'scroll', parentNode: composer }
  const visible = { dataset: {}, hidden: true, name: 'visible', parentNode: null }
  visible.remove = () => { visible.parentNode?.removeChild(visible) }
  const dock = {
    dataset: {}, hidden: false, name: 'dock', parentNode: origin,
    cloneNode: () => visible,
  }
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

  const mounted = placeDockInsideComposer(dock, documentRef)

  assert.deepEqual(origin.children, [dock])
  assert.deepEqual(composer.children, [visible, scroll])
  assert.equal(dock.hidden, true)
  assert.equal(visible.hidden, false)
  assert.equal(visible.dataset.composerAttachment, 'true')
  mounted.dispose()
  assert.deepEqual(origin.children, [dock])
  assert.deepEqual(composer.children, [scroll])
  assert.equal(dock.hidden, false)
})

test('keeps the visible composer mirror synchronized with live upload state', () => {
  const origin = fakeParent('origin')
  const composer = fakeParent('composer')
  const scroll = { name: 'scroll', parentNode: composer }
  const visible = {
    dataset: {}, hidden: true, innerHTML: 'Uploading 0%', name: 'visible', parentNode: null,
  }
  visible.remove = () => { visible.parentNode?.removeChild(visible) }
  const dock = {
    dataset: {}, hidden: false, innerHTML: 'Uploading 0%', name: 'dock', parentNode: origin,
    cloneNode: () => visible,
  }
  origin.children.push(dock)
  composer.children.push(scroll)
  composer.querySelector = selector => selector === '[data-input-scroll]' ? scroll : null
  let observerCallback
  let observedOptions
  let disconnected = false
  class FakeMutationObserver {
    constructor(callback) { observerCallback = callback }
    observe(_node, options) { observedOptions = options }
    disconnect() { disconnected = true }
  }
  const documentRef = {
    defaultView: { MutationObserver: FakeMutationObserver },
    querySelector: selector => selector === '[data-composer-card]' ? composer : null,
  }

  const mounted = placeDockInsideComposer(dock, documentRef)
  dock.innerHTML = 'Ready'
  observerCallback()

  assert.equal(mounted.visible.innerHTML, 'Ready')
  assert.equal(observedOptions.attributes, true)
  assert.equal(observedOptions.characterData, true)
  assert.equal(observedOptions.childList, true)
  assert.equal(observedOptions.subtree, true)
  mounted.dispose()
  assert.equal(disconnected, true)
})

test('routes remove clicks from the moved dock back to its live resource item', () => {
  const dock = new EventTarget()
  const item = { localId: 'local-one', fileName: 'report.pdf' }
  let removed = null
  const dispose = bindComposerDockActions(
    dock,
    localId => localId === item.localId ? item : undefined,
    value => { removed = value },
  )
  const button = { dataset: { fileResourceRemove: item.localId } }
  const event = new Event('click', { cancelable: true })
  Object.defineProperty(event, 'target', {
    value: { closest: selector => selector === '[data-file-resource-remove]' ? button : null },
  })

  dock.dispatchEvent(event)

  assert.equal(removed, item)
  assert.equal(event.defaultPrevented, true)
  dispose()
  removed = null
  dock.dispatchEvent(event)
  assert.equal(removed, null)
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
