/**
 * Codex-style file mentions: type `@` in the composer and pick an attached
 * document. The inserted `@name` reference is just text in the draft — the
 * host prompt maps the name back to the opaque resource ID the model reads
 * with read_uploaded_resource.
 */

/** Composer textarea seat used by the callback menu and the mention popup. */
export const COMPOSER_SELECTOR = '[data-composer-card] textarea:not(:disabled)'

/**
 * Find an open `@token` (no spaces, no `@`) ending exactly at the caret.
 * Returns `{ start, end, query }` with `start` pointing at the `@`, or null.
 */
export function detectMentionToken(text, caret) {
  const draft = String(text ?? '')
  const index = Math.max(0, Math.min(draft.length, Math.max(0, Number(caret) || 0)))
  const before = draft.slice(0, index)
  const match = /(^|\s)@([^\s@]*)$/u.exec(before)
  if (match === null) return null
  return {
    start: index - match[0].length + match[1].length,
    end: index,
    query: match[2],
  }
}

/** Insert `@fileName` in place of the open token, keeping the rest of the draft. */
export function replaceMention(draft, token, fileName) {
  const value = String(draft ?? '')
  return `${value.slice(0, token.start)}@${String(fileName)}${value.slice(token.end)}`
}

function anchorRect(textarea) {
  try {
    const rect = textarea?.getBoundingClientRect?.()
    return rect === undefined || rect === null ? null : rect
  } catch {
    return null
  }
}

/**
 * Imperative bridge between the composer textarea and the mention popup.
 * Every DOM touch is guarded so the module is safe in non-browser tests.
 */
export class MentionController {
  constructor({ documentRef, getDraft, setDraft, getReadyFiles, onState }) {
    this.documentRef = documentRef
    this.getDraft = getDraft
    this.setDraft = setDraft
    this.getReadyFiles = getReadyFiles
    this.onState = onState
    this.textarea = null
    this.open = null
    this.disposed = false
    this.view = null
    this.restoreId = null
    this.closeId = null
  }

  attach() {
    if (this.disposed) return this
    const documentRef = this.documentRef
    if (typeof documentRef !== 'object' || documentRef === null
      || typeof documentRef.addEventListener !== 'function') return this
    this.view = documentRef.defaultView ?? null
    this.syncTextarea()
    documentRef.addEventListener('focusin', this.handleFocusIn, true)
    documentRef.addEventListener('pointerdown', this.handlePointerDown, true)
    if (this.view !== null && typeof this.view.addEventListener === 'function') {
      this.view.addEventListener('resize', this.handleResize)
      this.view.addEventListener('scroll', this.handleScroll, true)
    }
    return this
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.detachTextarea()
    const documentRef = this.documentRef
    if (typeof documentRef?.removeEventListener === 'function') {
      documentRef.removeEventListener('focusin', this.handleFocusIn, true)
      documentRef.removeEventListener('pointerdown', this.handlePointerDown, true)
    }
    if (this.view !== null && typeof this.view.removeEventListener === 'function') {
      this.view.removeEventListener('resize', this.handleResize)
      this.view.removeEventListener('scroll', this.handleScroll, true)
    }
    this.view = null
    this.closeLater()
    this.commit()
    this.open = null
    if (this.onState !== undefined) this.onState(null)
  }

  detachTextarea() {
    if (this.textarea === null) return
    const textarea = this.textarea
    this.textarea = null
    textarea.removeEventListener('input', this.handleInput, true)
    textarea.removeEventListener('keydown', this.handleKeyDown, true)
    textarea.removeEventListener('blur', this.handleBlur, true)
  }

  syncTextarea() {
    if (this.disposed) return
    const documentRef = this.documentRef
    if (typeof documentRef?.querySelector !== 'function') return
    const next = documentRef.querySelector(COMPOSER_SELECTOR) ?? null
    if (next === this.textarea) return
    this.detachTextarea()
    this.textarea = next
    if (next === null) return
    next.addEventListener('input', this.handleInput, true)
    next.addEventListener('keydown', this.handleKeyDown, true)
    next.addEventListener('blur', this.handleBlur, true)
  }

  handleInput = event => {
    this.syncTextarea()
    if (this.textarea !== null && event?.target === this.textarea) this.refresh()
  }

  handleBlur = () => this.delayClose()

  handleFocusIn = () => {
    this.syncTextarea()
  }

  handlePointerDown = event => {
    if (event?.target?.closest?.('[data-file-resource-mention]') !== null) return
    this.delayClose()
  }

  handleResize = () => this.syncAnchor()

  handleScroll = () => this.syncAnchor()

  handleKeyDown = event => {
    const open = this.open
    if (open === null) return
    const key = String(event?.key ?? '')
    if (key === 'ArrowDown') {
      event.preventDefault()
      this.move(1)
    } else if (key === 'ArrowUp') {
      event.preventDefault()
      this.move(-1)
    } else if (key === 'Enter') {
      event.preventDefault()
      event.stopImmediatePropagation()
      this.commit(open.files[open.index]?.name)
    } else if (key === 'Escape') {
      event.preventDefault()
      this.close()
    }
  }

  refresh() {
    if (this.disposed || this.textarea === null) return
    const token = detectMentionToken(this.getDraft(), this.textarea.selectionStart)
    const files = (this.getReadyFiles ?? (() => []))()
    if (token === null || files.length === 0) {
      this.close()
      return
    }
    const same = this.open !== null && this.open.start === token.start && this.open.end === token.end
    this.open = {
      start: token.start,
      end: token.end,
      query: token.query,
      files,
      index: same ? Math.min(this.open.index, files.length - 1) : 0,
    }
    this.publish()
  }

  move(delta) {
    if (this.open === null) return
    const count = this.open.files.length
    if (count === 0) return
    this.open = { ...this.open, index: (this.open.index + delta + count) % count }
    this.publish()
  }

  commit(fileName) {
    const open = this.open
    if (open === null || typeof fileName !== 'string' || fileName === '') return
    const next = replaceMention(this.getDraft(), open, fileName)
    this.close()
    this.setDraft(next)
    const caret = open.end + 1 + fileName.length
    this.restoreCaret(caret)
  }

  close() {
    this.closeLater()
    if (this.open === null) return
    this.open = null
    this.publish()
  }

  closeLater() {
    if (this.closeId !== null) {
      this.view?.clearTimeout?.(this.closeId)
      this.closeId = null
    }
  }

  delayClose() {
    if (this.view === null || typeof this.view.setTimeout !== 'function') {
      this.close()
      return
    }
    this.closeLater()
    this.closeId = this.view.setTimeout(() => {
      this.closeId = null
      if (this.open !== null) this.close()
    }, 180)
  }

  restoreCaret(caret) {
    if (this.view === null || typeof this.view.requestAnimationFrame !== 'function') return
    this.restoreId = this.view.requestAnimationFrame(() => {
      this.restoreId = null
      this.restoreId = this.view.requestAnimationFrame(() => {
        this.restoreId = null
        const textarea = this.textarea
        if (textarea === null) return
        try {
          textarea.focus()
          textarea.setSelectionRange(caret, caret)
        } catch {}
      })
    })
  }

  syncAnchor() {
    if (this.open === null || this.view === null) return
    const rect = anchorRect(this.textarea)
    if (rect === null || rect.width === 0 && rect.height === 0) return
    this.publish(rect)
  }

  publish(rectOverride = null) {
    if (this.onState === undefined) return
    const open = this.open
    if (open === null) {
      this.onState(null)
      return
    }
    const rect = rectOverride ?? anchorRect(this.textarea)
    const height = this.view?.innerHeight ?? 0
    const spaceBelow = rect === null ? 0 : height - rect.bottom - 8
    const spaceAbove = rect === null ? 0 : rect.top - 8
    this.onState({
      open: true,
      query: open.query,
      files: open.files,
      index: open.index,
      left: rect === null ? 12 : Math.max(8, rect.left),
      textareaTop: rect === null ? null : rect.top,
      textareaBottom: rect === null ? null : rect.bottom,
      viewportHeight: height,
      above: rect !== null && spaceBelow < 196 && spaceBelow < spaceAbove,
    })
  }
}