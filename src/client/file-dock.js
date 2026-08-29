import React from 'react'

import {
  bindAttachedSendButton,
  composeAttachedDraft,
  resourceOperation,
  shouldCommitDraftFiles,
  uploadBrowserResource,
} from './resources.js'
import { installPreviewStyles, openPreview, previewCandidateName, referenceChipName } from './preview.js'

const MAX_FILES = 20
const MAX_FILE_BYTES = 50 * 1024 * 1024
const MAX_BATCH_BYTES = 200 * 1024 * 1024

export const zh = {
  uploading: '正在上传', processing: '正在本地解析', ready: '已就绪', failed: '处理失败',
  cancel: '取消并移除文件', remove: '移除文件', tooMany: '一次最多添加 20 个文件',
  tooLarge: '单个文件不能超过 50 MB', batchTooLarge: '本次文件总大小不能超过 200 MB',
  sendFailed: '文件发送失败，请重试',
  preview: '文件预览', 'preview-close': '关闭预览', 'preview-loading': '正在读取预览…',
  'preview-truncated': '预览已截断，仅显示开头部分', 'preview-failed': '无法预览此文件',
  'preview-not-in-session': '此文件不在当前会话的附件里（可能是在另一个对话中上传的）',
}

export const en = {
  uploading: 'Uploading', processing: 'Processing locally', ready: 'Ready', failed: 'Failed',
  cancel: 'Cancel and remove file', remove: 'Remove file', tooMany: 'You can add up to 20 files at once',
  tooLarge: 'Each file must be 50 MB or smaller', batchTooLarge: 'The file batch must be 200 MB or smaller',
  sendFailed: 'The files could not be sent; try again',
  preview: 'File preview', 'preview-close': 'Close preview', 'preview-loading': 'Reading preview…',
  'preview-truncated': 'Preview truncated; only the beginning is shown', 'preview-failed': 'Preview unavailable for this file',
  'preview-not-in-session': 'This file is not attached to the current conversation (it may have been uploaded in another one)',
}

/**
 * React 语义下官方发送按钮应为禁用的条件（官方 empty || machineBusy 的镜像）。
 * 插件只在 React 本身想要禁用时才恢复自己劫持过的按钮，因此必须与官方逐项一致：
 * 忙阶段只有 adjudicating / submitting，其余相位只由「空草稿且无官方附件」决定。
 */
export function reactDisabledFromInput(state) {
  if (state === null || state === undefined) return true
  if (state.phase === 'adjudicating' || state.phase === 'submitting') return true
  return String(state?.draft ?? '').trim() === '' && (state.imageIds?.length ?? 0) === 0
}

export const FILE_DOCK_STYLES = `
.dsh-file-resource-dock { box-sizing: border-box; display: flex; flex-wrap: wrap; gap: 6px; margin: 0; max-width: 100%; padding: 4px 12px 2px; width: 100%; }
.dsh-file-resource-dock[hidden] { display: none; }
.dsh-file-resource-card { align-items: center; background: rgba(127,127,127,.10); border: 1px solid rgba(127,127,127,.18); border-radius: 10px; box-sizing: border-box; display: grid; flex: 0 1 220px; gap: 8px; grid-template-columns: 28px minmax(0,1fr) 28px; max-width: calc(100vw - 48px); min-height: 44px; padding: 6px 7px; width: 220px; }
.dsh-file-resource-card[data-status='error'] { border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #d88) 45%, transparent); }
.dsh-file-resource-icon { align-items: center; background: rgba(127,127,127,.16); border-radius: 7px; color: var(--dsw-alias-label-secondary); display: inline-flex; height: 28px; justify-content: center; width: 28px; }
.dsh-file-resource-copy { min-width: 0; }
.dsh-file-resource-name { color: var(--dsw-alias-label-primary); display: block; font-size: 13px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-file-resource-meta { color: var(--dsw-alias-label-secondary); display: block; font-size: 11px; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsh-file-resource-progress { background: rgba(127,127,127,.18); border-radius: 99px; display: block; height: 3px; margin-top: 4px; overflow: hidden; width: 100%; }
.dsh-file-resource-progress > i { background: var(--dsw-alias-label-primary); display: block; height: 100%; transition: width 120ms ease-out; }
.dsh-file-resource-cancel { align-items: center; background: rgba(127,127,127,.20); border: 0; border-radius: 999px; color: var(--dsw-alias-label-secondary); cursor: pointer; display: inline-flex; height: 28px; justify-content: center; padding: 0; width: 28px; }
.dsh-file-resource-cancel:hover { background: rgba(127,127,127,.30); color: var(--dsw-alias-label-primary); }
.dsh-file-resource-cancel:focus-visible { outline: 2px solid var(--dsw-alias-state-focus-primary, currentColor); outline-offset: 2px; }
/* 仅文件发送（wake 兼容）飞行中的视觉反馈：不触碰 React 拥有的 disabled 属性 */
[data-dsh-file-resource-send-busy] { cursor: default; opacity: .55; }
@media (prefers-reduced-motion: reduce) { .dsh-file-resource-progress > i { transition: none; } }
`

/** Mirror the dock into Harness's composer card without moving React-owned DOM. */
export function placeDockInsideComposer(dock, documentRef = document) {
  if (dock === null || dock === undefined) return { visible: dock, dispose: () => {} }
  const composer = documentRef.querySelector('[data-composer-card]')
  const scroll = composer?.querySelector?.('[data-input-scroll]')
  if (composer === null || composer === undefined || scroll === null || scroll === undefined
    || dock.parentNode === composer) return { visible: dock, dispose: () => {} }

  const visible = dock.cloneNode(true)
  dock.hidden = true
  visible.hidden = false
  visible.dataset.composerAttachment = 'true'
  composer.insertBefore(visible, scroll)
  const Observer = documentRef.defaultView?.MutationObserver ?? globalThis.MutationObserver
  const observer = typeof Observer === 'function'
    ? new Observer(() => { visible.innerHTML = dock.innerHTML })
    : null
  observer?.observe(dock, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  })

  return {
    visible,
    dispose() {
      observer?.disconnect()
      visible.remove()
      dock.hidden = false
    },
  }
}

/** Preserve remove/cancel behavior on the composer mirror outside React's event root. */
export function bindComposerDockActions(dock, lookupItem, onRemove) {
  const onClick = event => {
    const button = event.target?.closest?.('[data-file-resource-remove]')
    const localId = button?.dataset?.fileResourceRemove
    if (typeof localId !== 'string') return
    const item = lookupItem(localId)
    if (item === undefined) return
    event.preventDefault()
    event.stopPropagation()
    onRemove(item)
  }
  dock.addEventListener('click', onClick)
  return () => { dock.removeEventListener('click', onClick) }
}

function sizeText(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon() {
  return React.createElement('svg', { 'aria-hidden': true, fill: 'none', height: 17, viewBox: '0 0 24 24', width: 17 },
    React.createElement('path', { d: 'M7 3h7l4 4v14H7zM14 3v5h5', stroke: 'currentColor', strokeLinejoin: 'round', strokeWidth: 1.7 }))
}

function CloseIcon() {
  return React.createElement('svg', { 'aria-hidden': true, fill: 'none', height: 15, viewBox: '0 0 24 24', width: 15 },
    React.createElement('path', { d: 'm7 7 10 10M17 7 7 17', stroke: 'currentColor', strokeLinecap: 'round', strokeWidth: 2 }))
}

export function ResourceCard({ item, onRemove, t }) {
  const progress = Math.max(0, Math.min(1, Number(item.progress) || 0))
  const status = item.status === 'uploading'
    ? `${t('uploading')} ${Math.round(progress * 100)}%`
    : item.status === 'processing' ? t('processing')
      : item.status === 'ready' ? t('ready')
        : `${t('failed')}${item.error ? `：${item.error}` : ''}`
  const canceling = item.status === 'uploading' || item.status === 'processing'
  return React.createElement('div', {
    className: 'dsh-file-resource-card', 'data-file-resource-card': true, 'data-status': item.status,
  },
  React.createElement('span', { className: 'dsh-file-resource-icon' }, React.createElement(FileIcon)),
  React.createElement('span', { className: 'dsh-file-resource-copy' },
    React.createElement('span', { className: 'dsh-file-resource-name', title: item.fileName }, item.fileName),
    React.createElement('span', { className: 'dsh-file-resource-meta' }, `${sizeText(item.size)} · ${status}`),
    item.status === 'uploading' && React.createElement('span', {
      'aria-label': status, 'aria-valuemax': 100, 'aria-valuemin': 0,
      'aria-valuenow': Math.round(progress * 100), className: 'dsh-file-resource-progress', role: 'progressbar',
    }, React.createElement('i', { style: { width: `${Math.round(progress * 100)}%` } }))),
  React.createElement('button', {
    'aria-label': canceling ? t('cancel') : t('remove'), className: 'dsh-file-resource-cancel',
    'data-file-resource-remove': item.localId,
    onClick: () => { onRemove(item) }, title: canceling ? t('cancel') : t('remove'), type: 'button',
  }, React.createElement(CloseIcon)))
}

function errorItem(message) {
  return { localId: crypto.randomUUID(), fileName: message, size: 0, status: 'error', progress: 0, error: '' }
}

function arrowSendButton(documentRef) {
  return documentRef.querySelector('[data-composer-card] button svg path[d^="M8.3125"]')?.closest('button') ?? null
}

export function FileResourceDock({ sessionId, input, inputActions, t }) {
  const [items, setItems] = React.useState([])
  const dockRef = React.useRef(null)
  const operations = React.useRef(new Map())
  const live = React.useRef({ input, items })
  const previousInput = React.useRef(input)
  const sendingIds = React.useRef([])
  const syncButton = React.useRef(() => {})
  const knownFiles = React.useRef(new Set())
  live.current = { input, inputActions, items }

  const knownStorageKey = `dsh-file-resource:names:${sessionId}`
  const loadKnownFiles = React.useCallback(() => {
    const names = new Set()
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(knownStorageKey)
        if (raw !== null) {
          for (const name of JSON.parse(raw)) names.add(String(name))
        }
      }
    } catch {}
    return names
  }, [knownStorageKey])
  const persistKnownFiles = React.useCallback(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(knownStorageKey, JSON.stringify([...knownFiles.current]))
      }
    } catch {}
  }, [knownStorageKey])

  React.useEffect(() => {
    knownFiles.current = loadKnownFiles()
  }, [loadKnownFiles])

  React.useEffect(() => {
    let changed = false
    for (const item of items) {
      if (item.status === 'ready' && !knownFiles.current.has(item.fileName)) {
        knownFiles.current.add(item.fileName)
        changed = true
      }
    }
    if (changed) persistKnownFiles()
  }, [items, persistKnownFiles])

  const update = React.useCallback((localId, patch) => {
    setItems(current => current.map(item => item.localId === localId ? { ...item, ...patch } : item))
  }, [])

  const intake = React.useCallback(async files => {
    const currentBytes = live.current.items.reduce((sum, item) => sum + item.size, 0)
    if (live.current.items.length + files.length > MAX_FILES) {
      setItems(current => [...current, errorItem(t('tooMany'))]); return
    }
    if (files.some(file => file.size > MAX_FILE_BYTES)) {
      setItems(current => [...current, errorItem(t('tooLarge'))]); return
    }
    if (currentBytes + files.reduce((sum, file) => sum + file.size, 0) > MAX_BATCH_BYTES) {
      setItems(current => [...current, errorItem(t('batchTooLarge'))]); return
    }
    const queued = files.map(file => ({
      localId: crypto.randomUUID(), file, fileName: file.name, size: file.size, status: 'uploading', progress: 0,
    }))
    for (const item of queued) operations.current.set(item.localId, 'queued')
    setItems(current => [...current, ...queued])
    for (const item of queued) {
      if (operations.current.get(item.localId) === null) continue
      const operation = uploadBrowserResource({
        sessionId, file: item.file,
        onProgress: progress => { update(item.localId, { progress }) },
        onProcessing: () => { update(item.localId, { status: 'processing', progress: 1 }) },
      })
      operations.current.set(item.localId, operation)
      try {
        const resource = await operation.promise
        operations.current.delete(item.localId)
        update(item.localId, { ...resource, fileName: item.fileName, size: item.size, status: 'ready', progress: 1, file: undefined })
      } catch (error) {
        operations.current.delete(item.localId)
        if (error?.name === 'AbortError') setItems(current => current.filter(candidate => candidate.localId !== item.localId))
        else update(item.localId, { status: 'error', error: error instanceof Error ? error.message : String(error) })
      }
    }
  }, [sessionId, t, update])

  React.useEffect(() => {
    let active = true
    void resourceOperation(sessionId, 'list', { method: 'GET' }).then(body => {
      if (!active || body.resources.length === 0) return
      setItems(body.resources.map(resource => ({ ...resource, localId: crypto.randomUUID(), status: 'ready', progress: 1 })))
    }).catch(() => {})
    const onSelected = event => {
      const files = Array.isArray(event.detail?.files) ? event.detail.files : []
      if (files.length > 0) void intake(files)
    }
    document.addEventListener('dsh-file-resource:selected', onSelected)
    return () => {
      active = false
      document.removeEventListener('dsh-file-resource:selected', onSelected)
      for (const operation of operations.current.values()) operation?.abort?.()
      operations.current.clear()
    }
  }, [intake, sessionId])

  const remove = React.useCallback(item => {
    const operation = operations.current.get(item.localId)
    if (operation !== undefined) {
      operations.current.set(item.localId, null)
      operation?.abort?.()
    }
    setItems(current => current.filter(candidate => candidate.localId !== item.localId))
    if (item.resourceId !== undefined) {
      void resourceOperation(sessionId, 'remove', { method: 'DELETE', resourceId: item.resourceId }).catch(() => {})
    }
  }, [sessionId])

  React.useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const removeStyles = installPreviewStyles(document)
    const onPreviewClick = event => {
      const target = event?.target
      if (typeof target?.closest === 'function' && target.closest(
        '[data-composer-card],[data-file-resource-dock],[data-file-resource-preview],.dsh-file-resource-preview',
      ) !== null) return
      const name = referenceChipName(target) ?? previewCandidateName(target)
      if (name === null) return
      // 只有本会话真正发过/正在挂着的文件才允许打开预览；
      // @163.com、随手打的 @文字 之类一律忽略。
      if (!knownFiles.current.has(name)) return
      event.preventDefault()
      void openPreview({ document, sessionId, fileName: name, t })
    }
    document.addEventListener('click', onPreviewClick, true)
    return () => {
      document.removeEventListener('click', onPreviewClick, true)
      removeStyles()
    }
  }, [sessionId, t])

  React.useEffect(() => {
    const previous = previousInput.current
    const readyIds = items.filter(item => item.status === 'ready').map(item => item.resourceId)
    const previousDraft = String(previous?.draft ?? '')
    const enteringBusy = previous?.phase === 'plain'
      && (input?.phase === 'adjudicating' || input?.phase === 'submitting')
      && previousDraft.trim() !== '' && !previousDraft.trimStart().startsWith('/')
    if (enteringBusy && readyIds.length > 0) sendingIds.current = readyIds
    if (sendingIds.current.length > 0 && shouldCommitDraftFiles(previous, input)) {
      const committed = [...sendingIds.current]
      sendingIds.current = []
      void resourceOperation(sessionId, 'commit', { resourceIds: committed }).then(() => {
        setItems(current => current.filter(item => !committed.includes(item.resourceId)))
      }).catch(() => {})
    }
    previousInput.current = input
    syncButton.current()
  }, [input, items, sessionId])

  React.useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return undefined
    let button = null
    let binding = null

    const attachedNames = () => live.current.items
      .filter(item => item.status === 'ready')
      .map(item => item.fileName)

    const sendWithAttachments = () => {
      const state = live.current.input
      if (state?.phase !== 'plain') return false
      const next = composeAttachedDraft(state?.draft ?? '', attachedNames())
      if (String(state?.draft ?? '') === next) return false
      if (live.current.inputActions?.setDraft) live.current.inputActions.setDraft(next)
      live.current.inputActions?.submit()
      return true
    }

    // Enter sends: intercept only when ready documents are attached.
    const onKeyDown = event => {
      if (event.defaultPrevented || event.isComposing) return
      if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (typeof target?.closest !== 'function' || target.closest('[data-composer-card]') === null) return
      if (attachedNames().length === 0) return
      event.preventDefault()
      event.stopImmediatePropagation()
      sendWithAttachments()
    }

    const sync = () => {
      const next = arrowSendButton(document)
      if (next !== button) {
        binding?.dispose()
        button = next
        binding = button === null ? null : bindAttachedSendButton(button, {
          getDraft: () => live.current.input?.draft ?? '',
          setDraft: value => {
            if (live.current.input?.phase === 'plain') live.current.inputActions?.setDraft(value)
          },
          submit: () => { live.current.inputActions?.submit() },
          getReadyNames: attachedNames,
        })
      }
      const state = live.current.input
      binding?.update({
        eligible: attachedNames().length > 0 && state?.phase === 'plain',
        busy: state?.phase === 'adjudicating' || state?.phase === 'submitting',
        reactDisabled: reactDisabledFromInput(state),
      })
    }
    syncButton.current = sync
    document.addEventListener('keydown', onKeyDown, true)
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['disabled'] })
    sync()
    return () => {
      syncButton.current = () => {}
      document.removeEventListener('keydown', onKeyDown, true)
      observer.disconnect()
      binding?.dispose()
    }
  }, [sessionId, t])

  React.useLayoutEffect(() => {
    if (items.length === 0 || typeof document === 'undefined') return undefined
    const dock = dockRef.current
    const mounted = placeDockInsideComposer(dock, document)
    const unbind = mounted.visible !== dock
      ? bindComposerDockActions(
          mounted.visible,
          localId => live.current.items.find(item => item.localId === localId),
          remove,
        )
      : () => {}
    return () => {
      unbind()
      mounted.dispose()
    }
  }, [items.length > 0, remove, sessionId])

  if (items.length === 0) return null
  return React.createElement('div', {
    className: 'dsh-file-resource-dock', 'data-file-resource-dock': true, ref: dockRef,
  },
    ...items.map(item => React.createElement(ResourceCard, { item, key: item.localId, onRemove: remove, t })))
}
