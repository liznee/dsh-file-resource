import { ATTACH_COMMAND } from './shared.js'

export const name = 'dsh-image-upload'
export const inject = ['commands']

const WEB_ONLY_MESSAGE = 'Open the Web + menu and choose “attach” to browse image files.'

export function apply(ctx) {
  ctx.effect(() => ctx.commands.register({
    name: ATTACH_COMMAND,
      description: '浏览图片文件（PNG、JPEG、WebP、GIF）',
    handler: () => Promise.resolve({ kind: 'error', text: WEB_ONLY_MESSAGE }),
  }), 'dsh-image-upload: attach command')
}
