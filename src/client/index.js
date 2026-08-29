import { ATTACH_COMMAND } from '../shared.js'
import {
  createFilePicker,
  dismissPickerOverlay,
  dispatchDocumentSelection,
  dispatchImagesAsDrop,
  installAttachActivationBridge,
  installDocumentPasteBridge,
  installGlobalDropTarget,
  installMenuLayerStyles,
  partitionSelectedFiles,
} from '../picker.js'
import { en, FILE_DOCK_STYLES, FileResourceDock, zh } from './file-dock.js'

const NS = 'file-resource'

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
  const existing = document.querySelector('style[data-plugin-css="dsh-file-resource-dock"]')
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-file-resource'
  style.dataset.pluginCss = 'dsh-file-resource-dock'
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
      if (source.textContent?.trim() !== 'dsh-file-resource') continue
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
  if (commandUi === undefined) throw new Error('dsh-file-resource: commandUi service unavailable')

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-file-resource: dictionaries')
  ctx.effect(installFileDockStyles, 'dsh-file-resource: file dock styles')
  ctx.effect(installWakeMarkerFilter, 'dsh-file-resource: empty wake marker filter')

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
  }, 'dsh-file-resource: native picker')

  ctx.effect(() => commandUi.decorate(createAttachDecoration({
    open: () => { picker?.open() },
  })), 'dsh-file-resource: attach command decoration')

  ctx.effect(() => {
    const removeDrop = installGlobalDropTarget({
      onFiles: files => {
        const { images, documents } = partitionSelectedFiles(files)
        if (images.length > 0) dispatchImagesAsDrop(images)
        if (documents.length > 0) dispatchDocumentSelection(documents)
      },
    })
    const removePaste = installDocumentPasteBridge({
      onFiles: documents => { dispatchDocumentSelection(documents) },
    })
    return () => {
      removeDrop()
      removePaste()
    }
  }, 'dsh-file-resource: global drop and document paste')

  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'file-resource-resources',
    order: -10,
    locale: NS,
  }, FileResourceDock))
}
