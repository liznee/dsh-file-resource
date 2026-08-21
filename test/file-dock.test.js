import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import TestRenderer from 'react-test-renderer'

import { ResourceCard, en, zh } from '../src/client/file-dock.js'

const t = key => zh[key] ?? key

test('renders a full-width processing card with real progress and a circular cancel control', () => {
  const renderer = TestRenderer.create(React.createElement(ResourceCard, {
    item: { localId: 'one', fileName: 'report.docx', size: 1024, status: 'uploading', progress: 0.5 },
    onRemove: () => {},
    t,
  }))
  const root = renderer.root
  assert.equal(root.findByProps({ 'data-file-resource-card': true }).props['data-status'], 'uploading')
  assert.equal(root.findByProps({ role: 'progressbar' }).props['aria-valuenow'], 50)
  const cancel = root.findByProps({ 'aria-label': zh.cancel })
  assert.match(cancel.props.className, /dsh-file-upload-cancel/)
  renderer.unmount()
})

test('localizes ready, parsing, error and cancellation states', () => {
  for (const dictionary of [zh, en]) {
    assert.equal(typeof dictionary.ready, 'string')
    assert.equal(typeof dictionary.processing, 'string')
    assert.equal(typeof dictionary.failed, 'string')
    assert.equal(typeof dictionary.cancel, 'string')
  }
})
