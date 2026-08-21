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
  const onClick = event => {
    if (!owned || busy) return
    event.preventDefault()
    event.stopImmediatePropagation()
    busy = true
    button.disabled = true
    void Promise.resolve(onSend()).finally(() => { busy = false })
  }
  button.addEventListener('click', onClick, true)
  return {
    update(state) {
      if (state.eligible && !state.busy && !busy) {
        owned = true
      button.dataset.dshFileResourceSend = 'true'
        if (button.disabled) button.disabled = false
      } else {
        owned = false
      delete button.dataset.dshFileResourceSend
        if (!button.disabled) button.disabled = true
      }
    },
    dispose() {
      button.removeEventListener('click', onClick, true)
      if (owned) {
      delete button.dataset.dshFileResourceSend
        button.disabled = true
      }
      owned = false
    },
  }
}
