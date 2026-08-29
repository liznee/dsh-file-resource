import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  COMPOSER_SELECTOR,
  MentionController,
  detectMentionToken,
  replaceMention,
} from '../src/client/mention.js'

describe('detectMentionToken', () => {
  it('finds an open token ending at the caret', () => {
    assert.deepEqual(detectMentionToken('hello @rep', 10), { start: 6, end: 10, query: 'rep' })
    assert.deepEqual(detectMentionToken('hello @', 7), { start: 6, end: 7, query: '' })
    assert.deepEqual(detectMentionToken('@rep', 4), { start: 0, end: 4, query: 'rep' })
    assert.deepEqual(detectMentionToken('请 @报告.pdf', 9), { start: 2, end: 9, query: '报告.pdf' })
  })

  it('requires the token to start after whitespace or at line start', () => {
    assert.equal(detectMentionToken('hello rep', 9), null)
    assert.equal(detectMentionToken('abc@rep', 7), null)
    assert.equal(detectMentionToken('a @b c', 2), null)
    assert.equal(detectMentionToken('hello @@', 8), null)
    assert.equal(detectMentionToken('', 0), null)
  })
})

describe('replaceMention', () => {
  it('swaps the open token for @fileName and keeps the rest of the draft', () => {
    assert.equal(
      replaceMention('请 @ 帮我查', { start: 2, end: 4 }, '报告.pdf'),
      '请 @报告.pdf帮我查',
    )
    assert.equal(replaceMention('hello @x', { start: 6, end: 9 }, 'notes.md'), 'hello @notes.md')
  })
})

function createHarness({ files = [{ name: 'report.pdf', resourceId: 'r1' }] } = {}) {
  let draft = '请 @'
  const states = []
  const textarea = {
    listeners: {},
    selectionStart: 3,
    value: draft,
    addEventListener(type, handler) { this.listeners[type] = handler },
    removeEventListener() {},
    focus() {},
    setSelectionRange() {},
    getBoundingClientRect() { return { left: 20, top: 600, bottom: 622, width: 240, height: 22 } },
  }
  const view = {
    innerHeight: 800,
    listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler },
    removeEventListener() {},
    setTimeout(callback) { return 1 },
    clearTimeout() {},
    requestAnimationFrame(callback) { return 2 },
  }
  const documentRef = {
    querySelector(selector) { return selector === COMPOSER_SELECTOR ? textarea : null },
    addEventListener() {},
    removeEventListener() {},
    defaultView: view,
  }
  const controller = new MentionController({
    documentRef,
    getDraft: () => draft,
    setDraft: value => { draft = value; textarea.value = value },
    getReadyFiles: () => files,
    onState: state => { states.push(state) },
  })
  return { controller, textarea, view, states, draft: () => draft }
}

describe('MentionController', () => {
  it('opens the mention popup when an @ token is typed with ready files', () => {
    const { controller, textarea, states } = createHarness()
    controller.attach()
    textarea.selectionStart = 3
    textarea.listeners.input({ target: textarea })
    const state = states.at(-1)
    assert.equal(state.open, true)
    assert.equal(state.query, '')
    assert.equal(state.files[0].name, 'report.pdf')
    assert.equal(state.index, 0)
    controller.dispose()
  })

  it('commits the selected file through Enter and updates the draft', () => {
    const { controller, textarea, states, draft } = createHarness()
    controller.attach()
    textarea.selectionStart = 3
    textarea.listeners.input({ target: textarea })
    const prevented = { called: false }
    textarea.listeners.keydown({
      key: 'Enter',
      preventDefault() { prevented.called = true },
      stopImmediatePropagation() {},
    })
    assert.equal(prevented.called, true)
    assert.equal(draft(), '请 @report.pdf')
    assert.equal(states.at(-1), null)
    controller.dispose()
  })

  it('closes on Escape without touching the draft, and no-ops when no files are ready', () => {
    const { controller, textarea, states, draft } = createHarness({ files: [] })
    controller.attach()
    textarea.selectionStart = 3
    textarea.listeners.input({ target: textarea })
    assert.equal(states.length, 0) // no files: the popup never opens
    textarea.listeners.keydown({ key: 'Escape', preventDefault() {}, stopImmediatePropagation() {} })
    assert.equal(draft(), '请 @')
    controller.dispose()
  })
})