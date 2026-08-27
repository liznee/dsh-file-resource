import { RESOURCE_ENDPOINT } from '../shared.js'

function abortError() {
  return new DOMException('Upload cancelled', 'AbortError')
}

function responseBody(xhr) {
  if (xhr.response !== null && typeof xhr.response === 'object') return xhr.response
  if (typeof xhr.responseText === 'string' && xhr.responseText !== '') {
    try { return JSON.parse(xhr.responseText) } catch { return null }
  }
  return null
}

export function uploadBrowserResource({
  sessionId,
  file,
  onProgress = () => {},
  onProcessing = () => {},
  XMLHttpRequestCtor = XMLHttpRequest,
}) {
  const xhr = new XMLHttpRequestCtor()
  xhr.open('POST', RESOURCE_ENDPOINT)
  xhr.responseType = 'json'
  xhr.setRequestHeader('X-DSH-File-Resource', '1')
  xhr.setRequestHeader('X-DSH-Operation', 'upload')
  xhr.setRequestHeader('X-DSH-Session', sessionId)
  xhr.setRequestHeader('X-DSH-File-Name', encodeURIComponent(file.name))
  xhr.setRequestHeader('X-DSH-Media-Type', encodeURIComponent(file.type || 'application/octet-stream'))

  let settled = false
  let rejectPromise
  const promise = new Promise((resolve, reject) => {
    rejectPromise = reject
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total)
    })
    xhr.upload.addEventListener('load', onProcessing)
    xhr.addEventListener('load', () => {
      if (settled) return
      settled = true
      const body = responseBody(xhr)
      if (xhr.status >= 200 && xhr.status < 300 && body?.ok === true) resolve(body.resource)
      else reject(new Error(body?.error || `Upload failed (${xhr.status})`))
    })
    xhr.addEventListener('error', () => {
      if (settled) return
      settled = true
      reject(new Error('Upload connection failed'))
    })
    xhr.addEventListener('abort', () => {
      if (settled) return
      settled = true
      reject(abortError())
    })
  })
  xhr.send(file)
  return {
    promise,
    abort() {
      if (settled) return
      xhr.abort()
      if (!settled) {
        settled = true
        rejectPromise(abortError())
      }
    },
  }
}

export async function resourceOperation(sessionId, operation, {
  method = 'POST',
  resourceId,
  resourceIds,
  fetchImpl = fetch,
} = {}) {
  const headers = {
    'X-DSH-File-Resource': '1',
    'X-DSH-Operation': operation,
    'X-DSH-Session': sessionId,
  }
  if (resourceId !== undefined) headers['X-DSH-Resource'] = resourceId
  const response = await fetchImpl(RESOURCE_ENDPOINT, {
    method,
    headers,
    ...(resourceIds === undefined ? {} : { body: JSON.stringify({ resourceIds }) }),
  })
  const body = await response.json()
  if (!response.ok || body?.ok !== true) throw new Error(body?.error || `Resource request failed (${response.status})`)
  return body
}

export function shouldCommitDraftFiles(previous, current) {
  const wasBusy = previous?.phase === 'adjudicating' || previous?.phase === 'submitting'
  return wasBusy && current?.phase === 'plain' && current.draft === ''
}

export function bindFileOnlySendButton(button, { onSend }) {
  let owned = false
  let busy = false
  let lastReactDisabled = false
  const onClick = event => {
    if (!owned || busy) return
    event.preventDefault()
    event.stopImmediatePropagation()
    busy = true
    // 用 inert 而不是 disabled 阻止重入：disabled 属性归 React 所有，
    // 插件改写它会让 React 的下一次 diff 无法纠偏，导致按钮永久变灰。
    button.inert = true
    button.dataset.dshFileResourceSendBusy = 'true'
    // .then(onSend) 而非直接调用：onSend 同步抛错时 finally 也必须执行，
    // 否则 busy/inert 永久卡住。catch 吞掉飞行错误（wired onSend 内部已自行处理）。
    void Promise.resolve().then(onSend).catch(() => {}).finally(() => {
      busy = false
      button.inert = false
      delete button.dataset.dshFileResourceSendBusy
    })
  }
  button.addEventListener('click', onClick, true)
  return {
    update(state) {
      lastReactDisabled = state.reactDisabled === true
      if (state.eligible && !state.busy && !busy) {
        owned = true
        button.dataset.dshFileResourceSend = 'true'
        if (button.disabled) button.disabled = false
      } else if (owned) {
        // 仅在插件自己劫持启用过、且 React 语义现在是禁用（空草稿或忙）时恢复。
        // 其他情况（如用户已打字，React 自己启用了按钮）绝不能碰 disabled。
        owned = false
        delete button.dataset.dshFileResourceSend
        if (lastReactDisabled && !button.disabled) button.disabled = true
      } else {
        delete button.dataset.dshFileResourceSend
      }
    },
    dispose() {
      button.removeEventListener('click', onClick, true)
      if (owned) {
        owned = false
        delete button.dataset.dshFileResourceSend
        // 卸载时若 React 语义为禁用，把按钮恢复成它期望的样子再离场。
        if (lastReactDisabled && !button.disabled) button.disabled = true
      }
    },
  }
}
