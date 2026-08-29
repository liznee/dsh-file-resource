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
  background: transparent;
  inset: 0 auto 0 0;
  position: fixed;
  right: var(--dsh-preview-width, 50vw);
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
  width: var(--dsh-preview-width, 50vw);
  z-index: 1501;
}
/* True split view: while the preview is open the conversation column shifts
   left and the right half belongs to the preview panel. */
body[data-dsh-preview-open] [data-conversation-scroll],
body[data-dsh-preview-open] [data-composer-seat] {
  margin-right: var(--dsh-preview-width, 50vw);
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
.dsh-file-resource-preview-table {
  border-collapse: collapse;
  font-family: var(--dsw-font-mono, ui-monospace, SFMono-Regular, Consolas, monospace);
  font-size: 12.5px;
  margin: 0;
  min-width: 100%;
}
.dsh-file-resource-preview-table td {
  border: 1px solid rgba(127, 127, 127, .24);
  line-height: 1.5;
  min-width: 40px;
  padding: 3px 7px;
  vertical-align: top;
  white-space: pre-wrap;
  word-break: break-word;
}
.dsh-file-resource-preview-table tr[data-head='true'] td {
  background: rgba(127, 127, 127, .10);
  font-weight: 600;
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

const TABLE_KINDS = /^(?:xlsx|ods|csv|tsv)$/iu

/** Spreadsheet kinds rendered as an actual table with cell borders. */
export function isSpreadsheetKind(kind) {
  return TABLE_KINDS.test(String(kind ?? ''))
}

/** Parse tab/newline separated preview text into table rows, or null. */
export function spreadsheetTable(text) {
  const value = String(text ?? '')
  if (!value.includes('\t')) return null
  const rows = value
    .split(/\r?\n/u)
    .map(line => line.split('\t'))
    .filter(row => row.some(cell => String(cell ?? '').trim() !== ''))
  return rows.length === 0 ? null : rows
}

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

/**
 * The Harness renders "@file" references as blue chips whose visible text
 * omits the "@" and whose full label lives in the title attribute. Resolve
 * the underlying file name from such a chip, or null.
 */
export function referenceChipName(node) {
  if (typeof node?.closest !== 'function') return null
  const chip = node.closest('[data-ref-chip]')
  if (chip === null) return null
  const raw = String(chip.getAttribute?.('title') ?? chip.textContent ?? '').trim()
  let name = raw.replace(/^@/u, '').replace(/^"|"$/gu, '')
  const slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'))
  if (slash !== -1) name = name.slice(slash + 1)
  name = name.trim()
  if (name === '' || name.length > 200) return null
  return name
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

  // Activate the split view: conversation shrinks to the left half.
  documentRef.body.dataset.dshPreviewOpen = 'true'
  documentRef.body.style.setProperty('--dsh-preview-width', 'min(50vw, 720px)')

  let disposed = false
  const onKey = event => { if (event.key === 'Escape') destroy() }
  const destroy = () => {
    if (disposed) return
    disposed = true
    documentRef.removeEventListener('keydown', onKey, true)
    delete documentRef.body.dataset.dshPreviewOpen
    documentRef.body.style.removeProperty('--dsh-preview-width')
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

  const renderTable = rows => {
    body.textContent = ''
    const table = documentRef.createElement('table')
    table.className = 'dsh-file-resource-preview-table'
    rows.forEach((row, index) => {
      const tr = documentRef.createElement('tr')
      if (index === 0) tr.dataset.head = 'true'
      for (const cell of row) {
        const td = documentRef.createElement('td')
        td.textContent = String(cell ?? '')
        tr.append(td)
      }
      table.append(tr)
    })
    body.append(table)
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
    const rows = isSpreadsheetKind(preview.kind) ? spreadsheetTable(preview.text) : null
    if (rows !== null) renderTable(rows)
    else render(preview.text || '')
    truncated.hidden = preview.truncated !== true
    truncated.textContent = t('preview-truncated') ?? 'Preview truncated'
  } catch (error) {
    if (disposed) return
    body.textContent = ''
    const hint = documentRef.createElement('p')
    hint.className = 'dsh-file-resource-preview-status'
    const detail = String(error?.message ?? '')
    hint.textContent = /no attached file|not attached/iu.test(detail)
      ? (t('preview-not-in-session') ?? 'Not attached to this conversation')
      : (t('preview-failed') ?? 'Preview unavailable')
    body.append(hint)
  }
}