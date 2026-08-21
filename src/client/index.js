import { ATTACH_COMMAND } from '../shared.js'
import {
  createImagePicker,
  dismissPickerOverlay,
  dispatchImagesAsDrop,
  installMenuLayerStyles,
} from '../picker.js'

export { ATTACH_COMMAND }
export const inject = ['commandUi']

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

export function apply(ctx) {
  const commandUi = ctx.get('commandUi')
  if (commandUi === undefined) throw new Error('dsh-image-upload: commandUi service unavailable')

  let picker
  ctx.effect(() => {
    picker = createImagePicker({
      onFiles: files => { dispatchImagesAsDrop(files) },
      onSettled: () => { dismissPickerOverlay() },
    })
    const removeStyles = installMenuLayerStyles()
    return () => {
      picker.dispose()
      removeStyles()
    }
  }, 'dsh-image-upload: native picker')

  ctx.effect(() => commandUi.decorate(createAttachDecoration({
    open: () => { picker?.open() },
  })), 'dsh-image-upload: attach command decoration')
}
