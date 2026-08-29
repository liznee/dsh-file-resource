/**
 * Right-side preview for attached files: clicking an "@fileName" reference in
 * the conversation fetches a bounded preview through the plugin route and
 * shows it in a slide-over panel. All rendering is plain DOM so the panel
 * escapes any stacking context created by the composer.
 */

import { RESOURCE_ENDPOINT } from '../shared.js'

const PREVIEW_STYLE_ID = 'dsh-file-resource-preview'
const PREVIEW_STYLES = `
.dsh-file-resource-preview-backdrop {
  background: rgba(0, 0, 0, .18);
  inset: 0;
  position: fixed;
  z-index: 1500;
}
.dsh-file-resource-preview {
  background: var(--dsw-alias-bg-layer-1, #fff);
  border-left: 1px solid rgba(127, 127, 127, .25);
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary, inherit);
  display: flex;
  flex-direction: column;
  inset: 0 0 0 auto;
  max-width: 100vw;
  position: fixed;
  width: min(440px, 92vw);
  z-index: 1501;
}
.dsh-file-resource-preview-header {
  align-items: center;
  border-bottom: 1px solid rgba(127, 127, 127, .18);
  display: flex;
  flex: none;
  gap: 8px;
  padding: 10px 12px 10px 16px;
}
.dsh-file-resource-preview-title {
  font-size: 14px;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-file-resource-preview-kind {
  color: var(--dsw-alias-label-secondary);
  flex: none;
  font-size: 12px;
}
.dsh-file-resource-preview-close {
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  flex: none;
  font-size: 17px;
  height: 28px;
  line-height: 1;
  margin-left: auto;
  padding: 0;
  width: 28px;
}
.dsh-file-resource-preview-close:hover {
  background: rgba(127, 127, 127, .22);
  color: var(--dsw-alias-label-primary);
}
.dsh-file-resource-preview-body {
  flex: 1 1 auto;
  overflow: auto;
  padding: 14px 16px;
}
.dsh-file-resource-preview-body pre {
  font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Consolas, monospace);
  font-size: 12.5px;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.dsh-file-resource-preview-status {
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  padding: 6px 16px 12px;
}
.dsh-file-resource-preview-truncated {
  border-top: 1px solid rgba(127, 127, 127, .18);
  color: var(--dsw-alias-label-secondary);
  flex: none;
  font-size: 12px;
  padding: 8px 16px;
}
@media (prefers-reduced-motion: reduce) {
  .dsh-file-resource-preview { transition: none; }
}
`

let current = null // { close(documentRef) }

/** A short "@name" spoken by the clicked element, or null. */
export function previewCandidateName(node) {
  let element = node
  for (let depth = 0; element !== null && element !== undefined && depth < 4; depth += 1, element = element.parentElement) {
    const text = typeof element?.textContent === 'string' ? element.textContent.trim() : ''
    if (text.length === 0 || text.length > 120) continue
    if (!text.startsWith('@')) continue
    const name = text.slice(1).trim()
    if (name === '' || /[\s@]/.test(name)) continue
    return name
  }
  return null
}

export function installPreviewStyles(documentRef = document) {
  if (typeof documentRef?.createElement !== 'function') return () => {}
  if (documentRef.querySelector(`style[data-plugin-css="${PREVIEW_STYLE_ID}"]`) !== null) return () => {}
  const style = documentRef.createElement('style')
  style.dataset.plugin = 'dsh-file-resource'
  style.dataset.pluginCss = PREVIEW_STYLE_ID
  style.textContent = PREVIEW_STYLES
  documentRef.head?.append?.(style)
  return () => { style.remove() }
}

export function closePreview(documentRef = document) {
  if (current === null) return
  current.close(documentRef)
  current = null
}

export async function openPreview({ document: documentRef = document, sessionId, fileName, t = key => key }) {
  if (typeof documentRef?.createElement !== 'function' || typeof fetch !== 'function') return
  closePreview(documentRef)

  const backdrop = documentRef.createElement('div')
  backdrop.className = 'dsh-file-resource-preview-backdrop'
  const panel = documentRef.createElement('div')
  panel.className = 'dsh-file-resource-preview'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', t('preview') ?? 'preview')
  const header = documentRef.createElement('div')
  header.className = 'dsh-file-resource-preview-header'
  const title = documentRef.createElement('span')
  title.className = 'dsh-file-resource-preview-title'
  title.textContent = `@${fileName}`
  const kind = documentRef.createElement('span')
  kind.className = 'dsh-file-resource-preview-kind'
  const close = documentRef.createElement('button')
  close.className = 'dsh-file-resource-preview-close'
  close.setAttribute('aria-label', t('preview-close') ?? 'close')
  close.textContent = '×'
  close.type = 'button'
  header.append(title, kind, close)
  const body = documentRef.createElement('div')
  body.className = 'dsh-file-resource-preview-body'
  const message = documentRef.createElement('p')
  message.className = 'dsh-file-resource-preview-status'
  message.textContent = t('preview-loading') ?? 'Loading…'
  body.append(message)
  const truncated = documentRef.createElement('div')
  truncated.className = 'dsh-file-resource-preview-truncated'
  truncated.hidden = true
  panel.append(header, body, truncated)
  documentRef.body?.append?.(backdrop, panel)

  let disposed = false
  const onKey = event => { if (event.key === 'Escape') destroy() }
  const destroy = () => {
    if (disposed) return
    disposed = true
    documentRef.removeEventListener('keydown', onKey, true)
    backdrop.remove()
    panel.remove()
  }
  close.addEventListener('click', destroy)
  backdrop.addEventListener('click', destroy)
  documentRef.addEventListener('keydown', onKey, true)
  current = { close: destroy }

  const render = text => {
    body.textContent = ''
    const pre = documentRef.createElement('pre')
    pre.textContent = text
    body.append(pre)
  }

  try {
    const response = await fetch(RESOURCE_ENDPOINT, {
      method: 'GET',
      headers: {
        'X-DSH-File-Resource': '1',
        'X-DSH-Operation': 'preview',
        'X-DSH-Session': sessionId,
        'X-DSH-File-Name': encodeURIComponent(fileName),
      },
    })
    const payload = await response.json()
    if (disposed) return
    if (!response.ok || payload?.ok !== true) throw new Error(payload?.error || 'preview failed')
    const preview = payload.preview
    title.textContent = `@${preview.fileName}`
    kind.textContent = preview.kind
    render(preview.text || '')
    truncated.hidden = preview.truncated !== true
    truncated.textContent = t('preview-truncated') ?? 'Preview truncated'
  } catch {
    if (disposed) return
    body.textContent = ''
    const error = documentRef.createElement('p')
    error.className = 'dsh-file-resource-preview-status'
    error.textContent = t('preview-failed') ?? 'Preview unavailable'
    body.append(error)
  }
}