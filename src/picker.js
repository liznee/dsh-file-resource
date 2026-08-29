export const FILE_ACCEPT = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  '.pdf', '.docx', '.xlsx', '.pptx', '.odt', '.ods', '.odp', '.rtf', '.epub',
  '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.jsonl', '.xml', '.html', '.htm',
  '.yaml', '.yml', '.log', '.ini', '.toml', '.sql',
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.h', '.cpp', '.hpp', '.cs', '.go', '.rs',
  '.rb', '.php', '.sh', '.ps1', '.bat', '.css', '.scss',
].join(',')

const NATIVE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const NATIVE_IMAGE_EXTENSION = /\.(?:png|jpe?g|webp|gif)$/iu

const STYLE_ID = 'dsh-file-resource'
const MENU_LAYER_STYLES = `
#dsh-slash-option-command-0 {
  position: relative;
  margin-bottom: 10px;
}

#dsh-slash-option-command-0::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -5px;
  left: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
  pointer-events: none;
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

export function partitionSelectedFiles(files) {
  const images = []
  const documents = []
  for (const file of files) {
    if (NATIVE_IMAGE_TYPES.has(String(file.type).toLowerCase())
      || (String(file.type) === '' && NATIVE_IMAGE_EXTENSION.test(String(file.name)))) images.push(file)
    else documents.push(file)
  }
  return { images, documents }
}

export function dispatchDocumentSelection(files, environment = globalThis) {
  if (files.length === 0) return false
  return environment.document.dispatchEvent(new environment.CustomEvent('dsh-file-resource:selected', {
    bubbles: false,
    cancelable: false,
    detail: { files: [...files] },
  }))
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

/** Preserve the trusted pointer gesture before Harness resolves popup options asynchronously. */
export function installAttachActivationBridge(picker, documentRef = document) {
  const onPointerDown = event => {
    const option = event.target?.closest?.('[role="option"]')
    const command = option?.querySelector?.('span')?.textContent?.trim()
    if (command === 'attach') picker.open()
  }
  documentRef.addEventListener('pointerdown', onPointerDown, true)
  return () => { documentRef.removeEventListener('pointerdown', onPointerDown, true) }
}

/** Create one hidden native file input reused by every attach-menu activation. */
export function createFilePicker({
  document: documentRef = document,
  window: windowRef = window,
  onFiles,
  onSettled,
}) {
  const input = documentRef.createElement('input')
  input.type = 'file'
  input.accept = FILE_ACCEPT
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
      try {
        if (typeof input.showPicker === 'function') input.showPicker()
        else input.click()
      } catch (error) {
        settle()
        throw error
      }
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

export const createImagePicker = createFilePicker

const DROP_OVERLAY_CLASS = 'dsh-file-resource-drop-overlay'
const DROP_OVERLAY_STYLES = `
.${DROP_OVERLAY_CLASS} {
  align-items: center;
  background: rgba(0, 0, 0, .42);
  border: 2px dashed rgba(255, 255, 255, .7);
  border-radius: 14px;
  bottom: 14px;
  box-sizing: border-box;
  color: #fff;
  display: flex;
  font-size: 15px;
  justify-content: center;
  left: 14px;
  pointer-events: none;
  position: fixed;
  right: 14px;
  top: 14px;
  z-index: 1400;
}
`

/** Keep only non-image files; images stay on the Harness native pipeline. */
export function documentFilesOnly(files) {
  return (files ?? []).filter(file => {
    const type = String(file?.type ?? '').toLowerCase()
    if (type.startsWith('image/')) return false
    if (type === '' && /\.(?:png|jpe?g|webp|gif)$/iu.test(String(file?.name ?? ''))) return false
    return true
  })
}

function dragHasFiles(event) {
  const types = event?.dataTransfer?.types
  if (types === undefined || types === null) return false
  if (Array.isArray(types)) return types.includes('Files')
  return /(?:^|\s)Files(?:$|\s)/.test(String(types))
}

/**
 * Global drag-and-drop: dragging files anywhere over the window shows a
 * "release to attach" overlay and feeds them to the existing pipelines
 * (images → native drop intake, documents → plugin upload).
 */
export function installGlobalDropTarget({
  document: documentRef = document,
  window: windowRef = window,
  onFiles,
  onCleanup = () => {},
}) {
  if (typeof documentRef?.addEventListener !== 'function'
    || typeof windowRef?.addEventListener !== 'function') return () => {}
  let style = null
  let overlay = null
  let depth = 0

  const ensureStyle = () => {
    if (style !== null) return
    style = documentRef.createElement('style')
    style.dataset = style.dataset ?? {}
    style.dataset.plugin = 'dsh-file-resource'
    style.dataset.pluginCss = 'dsh-file-resource-drop'
    style.textContent = DROP_OVERLAY_STYLES
    documentRef.head?.append?.(style)
  }
  const show = () => {
    if (overlay !== null) return
    ensureStyle()
    overlay = documentRef.createElement('div')
    overlay.className = DROP_OVERLAY_CLASS
    overlay.textContent = '松开以添加文件 / Release to attach'
    documentRef.body?.append?.(overlay)
  }
  const hide = () => {
    overlay?.remove?.()
    overlay = null
  }
  const onEnter = event => {
    if (!dragHasFiles(event)) return
    depth += 1
    event.preventDefault()
    // Stop propagation so the Harness native drop overlay (which only accepts
    // images and shows "仅支持 png/jpg/gif" notices) never reacts to file
    // drags — documents are handled here.
    event.stopImmediatePropagation()
    show()
  }
  const onOver = event => {
    if (!dragHasFiles(event)) return
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  const onLeave = event => {
    if (!dragHasFiles(event)) return
    depth = Math.max(0, depth - 1)
    if (depth === 0) hide()
    event.stopImmediatePropagation()
  }
  const onDrop = event => {
    // Skip our own synthetic drops: dispatchImagesAsDrop() re-dispatches a
    // drop on document for the Harness native intake; without this guard it
    // would re-enter this listener and duplicate the attachment forever.
    if (event.isTrusted === false) return
    depth = 0
    hide()
    if (!dragHasFiles(event)) return
    event.preventDefault()
    event.stopImmediatePropagation()
    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length > 0) {
      onFiles(files, event)
      try { dismissPickerOverlay({ document: documentRef }) } catch {}
    }
  }
  windowRef.addEventListener('dragenter', onEnter, true)
  windowRef.addEventListener('dragover', onOver, true)
  windowRef.addEventListener('dragleave', onLeave, true)
  windowRef.addEventListener('drop', onDrop, true)
  return () => {
    windowRef.removeEventListener('dragenter', onEnter, true)
    windowRef.removeEventListener('dragover', onOver, true)
    windowRef.removeEventListener('dragleave', onLeave, true)
    windowRef.removeEventListener('drop', onDrop, true)
    hide()
    style?.remove?.()
    style = null
    onCleanup()
  }
}

/**
 * Document paste inside the composer: Ctrl+V with copied files (Explorer
 * copy, not screenshots) attaches the non-image files. Image-only pastes are
 * left to the Harness native pipeline untouched.
 */
export function installDocumentPasteBridge({ document: documentRef = document, onFiles }) {
  if (typeof documentRef?.addEventListener !== 'function') return () => {}
  const onPaste = event => {
    const target = event?.target
    if (typeof target?.closest === 'function' && target.closest('[data-composer-card]') === null) return
    const files = Array.from(event?.clipboardData?.files ?? [])
    if (files.length === 0) return
    const documents = documentFilesOnly(files)
    if (documents.length === 0) return
    event.preventDefault()
    event.stopImmediatePropagation()
    onFiles(documents, event)
  }
  documentRef.addEventListener('paste', onPaste, true)
  return () => { documentRef.removeEventListener('paste', onPaste, true) }
}
