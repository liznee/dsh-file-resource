import assert from 'node:assert/strict'
import test from 'node:test'

import {
  IMAGE_ACCEPT,
  createImagePicker,
  dismissPickerOverlay,
  dispatchImagesAsDrop,
  installMenuLayerStyles,
} from '../src/picker.js'

class FakeDataTransfer {
  constructor() {
    this.files = []
    this.items = { add: file => { this.files.push(file) } }
    this.types = ['Files']
  }
}

class FakeDragEvent extends Event {
  constructor(type, init) {
    super(type, init)
    this.dataTransfer = init.dataTransfer
  }
}

class FakePointerEvent extends Event {}

class FakeInput extends EventTarget {
  constructor() {
    super()
    this.accept = ''
    this.files = []
    this.hidden = false
    this.multiple = false
    this.tabIndex = 0
    this.type = ''
    this.value = ''
    this.clicks = 0
    this.removed = false
  }

  click() { this.clicks += 1 }
  remove() { this.removed = true }
}

function fakeEnvironment() {
  const input = new FakeInput()
  const styles = []
  const documentEvents = []
  const bodyEvents = []
  let focused = 0
  const textarea = { focus: () => { focused += 1 } }
  const documentRef = {
    body: {
      append: () => {},
      dispatchEvent: event => { bodyEvents.push(event); return true },
    },
    createElement: tag => {
      if (tag === 'input') return input
      assert.equal(tag, 'style')
      const style = {
        dataset: {},
        removed: false,
        textContent: '',
        remove() { this.removed = true },
      }
      styles.push(style)
      return style
    },
    dispatchEvent: event => { documentEvents.push(event); return true },
    querySelector: selector => {
      if (selector === 'style[data-plugin-css="dsh-image-upload"]') {
        return styles.find(style => !style.removed && style.dataset.pluginCss === 'dsh-image-upload') ?? null
      }
      assert.equal(selector, '[data-composer-card] textarea:not(:disabled)')
      return textarea
    },
  }
  const focusListeners = new Set()
  const windowRef = {
    addEventListener: (type, listener) => {
      assert.equal(type, 'focus')
      focusListeners.add(listener)
    },
    removeEventListener: (type, listener) => {
      assert.equal(type, 'focus')
      focusListeners.delete(listener)
    },
    setTimeout: callback => { callback(); return 1 },
  }
  return {
    bodyEvents,
    documentEvents,
    documentRef,
    focusListeners,
    get focused() { return focused },
    input,
    styles,
    windowRef,
  }
}

test('declares every image media type accepted by Harness', () => {
  assert.equal(IMAGE_ACCEPT, 'image/png,image/jpeg,image/webp,image/gif')
})

test('dispatches selected files through the official document drop path', () => {
  const env = fakeEnvironment()
  const files = [{ name: 'one.png' }, { name: 'two.webp' }]

  dispatchImagesAsDrop(files, {
    DataTransfer: FakeDataTransfer,
    DragEvent: FakeDragEvent,
    document: env.documentRef,
  })

  assert.equal(env.documentEvents.length, 1)
  assert.equal(env.documentEvents[0].type, 'drop')
  assert.deepEqual(env.documentEvents[0].dataTransfer.files, files)
})

test('configures a reusable multi-image picker and settles selected files once', () => {
  const env = fakeEnvironment()
  const selected = []
  let settled = 0
  const picker = createImagePicker({
    document: env.documentRef,
    window: env.windowRef,
    onFiles: files => { selected.push(...files) },
    onSettled: () => { settled += 1 },
  })

  assert.equal(env.input.type, 'file')
  assert.equal(env.input.accept, IMAGE_ACCEPT)
  assert.equal(env.input.multiple, true)
  assert.equal(env.input.hidden, true)

  picker.open()
  picker.open()
  assert.equal(env.input.clicks, 1)

  env.input.files = [{ name: 'photo.jpg' }, { name: 'diagram.png' }]
  env.input.value = 'C:\\fakepath\\photo.jpg'
  env.input.dispatchEvent(new Event('change'))

  assert.deepEqual(selected.map(file => file.name), ['photo.jpg', 'diagram.png'])
  assert.equal(settled, 1)
  assert.equal(env.input.value, '')
  assert.equal(env.focusListeners.size, 0)

  picker.dispose()
  assert.equal(env.input.removed, true)
})

test('prefers the native showPicker API when the browser exposes it', () => {
  const env = fakeEnvironment()
  let shown = 0
  env.input.showPicker = () => { shown += 1 }
  const picker = createImagePicker({
    document: env.documentRef,
    window: env.windowRef,
    onFiles: () => {},
    onSettled: () => {},
  })

  picker.open()

  assert.equal(shown, 1)
  assert.equal(env.input.clicks, 0)
})

test('cancel settles the picker without dispatching files', () => {
  const env = fakeEnvironment()
  let selected = 0
  let settled = 0
  const picker = createImagePicker({
    document: env.documentRef,
    window: env.windowRef,
    onFiles: () => { selected += 1 },
    onSettled: () => { settled += 1 },
  })

  picker.open()
  env.input.dispatchEvent(new Event('cancel'))

  assert.equal(selected, 0)
  assert.equal(settled, 1)
})

test('dismisses the empty command popup and returns focus to the composer', () => {
  const env = fakeEnvironment()

  dismissPickerOverlay({
    PointerEvent: FakePointerEvent,
    document: env.documentRef,
  })

  assert.equal(env.bodyEvents.length, 1)
  assert.equal(env.bodyEvents[0].type, 'pointerdown')
  assert.equal(env.focused, 1)
})

test('adds one divider that separates attach from the original command rows', () => {
  const env = fakeEnvironment()

  const firstCleanup = installMenuLayerStyles(env.documentRef)
  const secondCleanup = installMenuLayerStyles(env.documentRef)

  assert.equal(env.styles.length, 1)
  assert.match(env.styles[0].textContent, /dsh-slash-option-command-0/)
  assert.match(env.styles[0].textContent, /box-shadow/)

  secondCleanup()
  assert.equal(env.styles[0].removed, false)
  firstCleanup()
  assert.equal(env.styles[0].removed, true)
})
