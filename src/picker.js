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
