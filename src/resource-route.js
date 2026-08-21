import { validateBrowserRequest, validateResourceId, validateSessionId } from './resource-security.js'
import { RESOURCE_ENDPOINT } from './shared.js'

export { RESOURCE_ENDPOINT }

class RequestTooLargeError extends Error {}

async function readBody(request, limit) {
  const declared = Number.parseInt(String(request.headers?.['content-length'] ?? ''), 10)
  if (Number.isFinite(declared) && declared > limit) throw new RequestTooLargeError()
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > limit) throw new RequestTooLargeError()
    chunks.push(bytes)
  }
  return Buffer.concat(chunks, size)
}

function send(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(JSON.stringify(body))
}

function decodeHeader(value, label) {
  if (typeof value !== 'string' || value === '') throw new Error(`missing ${label}`)
  try {
    return decodeURIComponent(value)
  } catch {
    throw new Error(`invalid ${label}`)
  }
}

function header(request, name) {
  const value = request.headers?.[name]
  return Array.isArray(value) ? value[0] : value
}

export function createResourceRoute(service, {
  maxFileBytes = 50 * 1024 * 1024,
  logger = { warn() {} },
  wake,
} = {}) {
  return {
    kind: 'exact',
    path: RESOURCE_ENDPOINT,
    async handler(request, response) {
      try {
        validateBrowserRequest(request)
      } catch {
        send(response, 403, { ok: false, error: 'Forbidden.' })
        return
      }
      const controller = new AbortController()
      const onAborted = () => { controller.abort() }
      request.once?.('aborted', onAborted)
      try {
        const operation = header(request, 'x-dsh-operation')
        const declaredLength = Number.parseInt(String(header(request, 'content-length') ?? ''), 10)
        if (operation === 'upload' && Number.isFinite(declaredLength) && declaredLength > maxFileBytes) {
          throw new RequestTooLargeError()
        }
        const sessionId = validateSessionId(header(request, 'x-dsh-session'))
        if (operation === 'upload' && request.method === 'POST') {
          const bytes = await readBody(request, maxFileBytes)
          const resource = await service.upload({
            sessionId,
            fileName: decodeHeader(header(request, 'x-dsh-file-name'), 'file name'),
            mediaType: decodeHeader(header(request, 'x-dsh-media-type') ?? encodeURIComponent('application/octet-stream'), 'media type'),
            bytes,
            signal: controller.signal,
          })
          send(response, 200, { ok: true, resource })
          return
        }
        if (operation === 'list' && request.method === 'GET') {
          send(response, 200, { ok: true, resources: await service.listPending(sessionId) })
          return
        }
        if (operation === 'remove' && request.method === 'DELETE') {
          const resourceId = validateResourceId(header(request, 'x-dsh-resource'))
          send(response, 200, { ok: true, ...(await service.remove(sessionId, resourceId)) })
          return
        }
        if ((operation === 'commit' || operation === 'wake') && request.method === 'POST') {
          const body = JSON.parse((await readBody(request, 64 * 1024)).toString('utf8') || '{}')
          const resourceIds = Array.isArray(body.resourceIds) ? body.resourceIds.map(validateResourceId) : []
          if (resourceIds.length === 0 || resourceIds.length > 20) throw new Error('invalid resource list')
          if (operation === 'wake') {
            if (typeof wake !== 'function') throw new Error('file-only send is unavailable')
            await wake(sessionId, resourceIds)
          }
          const result = await service.commit(sessionId, resourceIds)
          send(response, 200, { ok: true, ...result })
          return
        }
        send(response, 404, { ok: false, error: 'Unknown operation.' })
      } catch (error) {
        if (error instanceof RequestTooLargeError) {
          send(response, 413, { ok: false, error: `File exceeds ${maxFileBytes} bytes.` })
          return
        }
        logger.warn?.(`dsh-file-resource request failed: ${error instanceof Error ? error.message : String(error)}`)
        send(response, 400, { ok: false, error: 'The file could not be processed.' })
      } finally {
        request.off?.('aborted', onAborted)
      }
    },
  }
}
