export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

const STYLE_ID = 'dsh-image-upload'
const MENU_LAYER_STYLES = `
#dsh-slash-option-command-0 {
  box-shadow: 0 5px 0 -4px var(--dsw-alias-border-l2-darkmode-thin);
  margin-bottom: 8px;
}
`

/** Send browser-selected files through Harness's existing image-drop intake. */
export function dispatchImagesAsDrop(files, environment = globalThis) {
  if (files.length === 0) return false
  const transfer = new environment.DataTransfer()
  for (const file of files) transfer.items.add(file)
  const event = new environment.DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    dataTransfer: transfer,
  })
  return environment.document.dispatchEvent(event)
}

/** Close the transient empty command popup and return focus to the composer. */
export function dismissPickerOverlay(environment = globalThis) {
  const event = new environment.PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
  })
  environment.document.body.dispatchEvent(event)
  environment.document.querySelector('[data-composer-card] textarea:not(:disabled)')?.focus()
}

/** Add the visual divider between the picker row and Harness commands. */
export function installMenuLayerStyles(documentRef = document) {
  const selector = `style[data-plugin-css="${STYLE_ID}"]`
  if (documentRef.querySelector(selector) !== null) return () => {}
  const style = documentRef.createElement('style')
  style.dataset.plugin = STYLE_ID
  style.dataset.pluginCss = STYLE_ID
  style.textContent = MENU_LAYER_STYLES
  documentRef.body.append(style)
  return () => { style.remove() }
}

/** Create one hidden native file input reused by every attach-menu activation. */
export function createImagePicker({
  document: documentRef = document,
  window: windowRef = window,
  onFiles,
  onSettled,
}) {
  const input = documentRef.createElement('input')
  input.type = 'file'
  input.accept = IMAGE_ACCEPT
  input.multiple = true
  input.hidden = true
  input.tabIndex = -1
  documentRef.body.append(input)

  let active = false
  let disposed = false

  const settle = () => {
    if (!active) return
    active = false
    windowRef.removeEventListener('focus', onWindowFocus)
    input.value = ''
    onSettled()
  }
  const onChange = () => {
    if (!active) return
    const files = Array.from(input.files ?? [])
    if (files.length > 0) onFiles(files)
    settle()
  }
  const onCancel = () => { settle() }
  const onWindowFocus = () => {
    windowRef.setTimeout(() => { settle() }, 100)
  }

  input.addEventListener('change', onChange)
  input.addEventListener('cancel', onCancel)

  return {
    open() {
      if (active || disposed) return
      active = true
      windowRef.addEventListener('focus', onWindowFocus, { once: true })
      if (typeof input.showPicker === 'function') input.showPicker()
      else input.click()
    },
    dispose() {
      if (disposed) return
      disposed = true
      active = false
      windowRef.removeEventListener('focus', onWindowFocus)
      input.removeEventListener('change', onChange)
      input.removeEventListener('cancel', onCancel)
      input.remove()
    },
  }
}
