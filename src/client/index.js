import { ATTACH_COMMAND } from '../shared.js'
import {
  createFilePicker,
  dismissPickerOverlay,
  dispatchDocumentSelection,
  dispatchImagesAsDrop,
  installAttachActivationBridge,
  installMenuLayerStyles,
  partitionSelectedFiles,
} from '../picker.js'
import { en, FILE_DOCK_STYLES, FileResourceDock, zh } from './file-dock.js'

const NS = 'file-upload'

export { ATTACH_COMMAND }
export const inject = ['commandUi', 'slots', 'locale']

export function createAttachDecoration(picker) {
  return {
    name: ATTACH_COMMAND,
    available: () => true,
    ui: {
      kind: 'popupSelect',
      options: async () => {
        picker.open()
        return []
      },
      onSelect: () => {},
    },
  }
}

function installFileDockStyles() {
  const existing = document.querySelector('style[data-plugin-css="dsh-file-upload-dock"]')
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-file-upload'
  style.dataset.pluginCss = 'dsh-file-upload-dock'
  style.textContent = FILE_DOCK_STYLES
  document.head.append(style)
  return () => { style.remove() }
}

/** Resolve the surrounding Harness context row without depending on generated class names. */
export function findWakeMarkerRow(source) {
  const flowRow = source.closest?.('[data-chat-flow-kind="context"]')
  if (flowRow !== null && flowRow !== undefined) return flowRow
  let row = source.parentElement
  for (let depth = 0; row !== null && depth < 6; depth += 1, row = row.parentElement) {
    if (row.querySelector?.('[data-context-injection-body]') !== null) return row
  }
  return null
}

/** Hide the model-only file wake instruction from the visible conversation. */
function installWakeMarkerFilter() {
  const hide = () => {
    for (const source of document.querySelectorAll('[data-context-source]')) {
      if (source.textContent?.trim() !== 'dsh-file-upload') continue
      const row = findWakeMarkerRow(source)
      if (row === null) continue
      row.hidden = true
      row.dataset.dshFileWakeMarker = 'true'
    }
  }
  const observer = new MutationObserver(hide)
  observer.observe(document.body, { childList: true, subtree: true })
  hide()
  return () => { observer.disconnect() }
}

export function apply(ctx) {
  const commandUi = ctx.get('commandUi')
  if (commandUi === undefined) throw new Error('dsh-image-upload: commandUi service unavailable')

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-file-upload: dictionaries')
  ctx.effect(installFileDockStyles, 'dsh-file-upload: file dock styles')
  ctx.effect(installWakeMarkerFilter, 'dsh-file-upload: empty wake marker filter')

  let picker
  ctx.effect(() => {
    picker = createFilePicker({
      onFiles: files => {
        const { images, documents } = partitionSelectedFiles(files)
        if (images.length > 0) dispatchImagesAsDrop(images)
        if (documents.length > 0) dispatchDocumentSelection(documents)
      },
      onSettled: () => { dismissPickerOverlay() },
    })
    const removeStyles = installMenuLayerStyles()
    const removeActivationBridge = installAttachActivationBridge(picker)
    return () => {
      removeActivationBridge()
      picker.dispose()
      removeStyles()
    }
  }, 'dsh-file-upload: native picker')

  ctx.effect(() => commandUi.decorate(createAttachDecoration({
    open: () => { picker?.open() },
  })), 'dsh-file-upload: attach command decoration')

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'file-upload-resources',
    order: -10,
    locale: NS,
  }, FileResourceDock))
}
