import { basename, extname } from 'node:path'

export const SUPPORTED_EXTENSIONS = new Map([
  ['.txt', 'text'], ['.md', 'text'], ['.markdown', 'text'], ['.csv', 'text'],
  ['.tsv', 'text'], ['.json', 'text'], ['.jsonl', 'text'], ['.xml', 'text'],
  ['.html', 'text'], ['.htm', 'text'], ['.yaml', 'text'], ['.yml', 'text'],
  ['.log', 'text'], ['.ini', 'text'], ['.toml', 'text'], ['.sql', 'text'],
  ['.js', 'text'], ['.jsx', 'text'], ['.ts', 'text'], ['.tsx', 'text'],
  ['.py', 'text'], ['.java', 'text'], ['.c', 'text'], ['.h', 'text'],
  ['.cpp', 'text'], ['.hpp', 'text'], ['.cs', 'text'], ['.go', 'text'],
  ['.rs', 'text'], ['.rb', 'text'], ['.php', 'text'], ['.sh', 'text'],
  ['.ps1', 'text'], ['.bat', 'text'], ['.css', 'text'], ['.scss', 'text'],
  ['.pdf', 'pdf'], ['.docx', 'docx'], ['.xlsx', 'xlsx'], ['.pptx', 'pptx'],
  ['.odt', 'odt'], ['.ods', 'ods'], ['.odp', 'odp'], ['.rtf', 'rtf'],
  ['.epub', 'epub'],
  ['.png', 'image'], ['.jpg', 'image'], ['.jpeg', 'image'], ['.webp', 'image'], ['.gif', 'image'],
])

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/gu
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u

export function normalizeFileName(value) {
  if (typeof value !== 'string') throw new Error('invalid file name')
  const normalized = basename(value.replaceAll('\\', '/')).replace(CONTROL_CHARACTERS, '').trim()
  if (normalized === '' || normalized === '.' || normalized === '..') throw new Error('invalid file name')
  return normalized.slice(0, 255)
}

export function validateSessionId(value) {
  if (typeof value !== 'string' || !SESSION_ID.test(value)) throw new Error('invalid session id')
  return value
}

export function validateResourceId(value) {
  if (typeof value !== 'string' || !/^res_[a-f0-9]{32}$/u.test(value)) throw new Error('invalid resource id')
  return value
}

/** CSRF/source fence for browser-to-Host resource requests. */
export function validateBrowserRequest(request) {
  const headers = request?.headers ?? {}
  const method = String(request?.method ?? '').toUpperCase()
  const marker = headers['x-dsh-file-resource']
  const host = headers.host
  const origin = headers.origin
  const fetchSite = headers['sec-fetch-site']
  if (!['POST', 'GET', 'DELETE'].includes(method) || marker !== '1' || typeof host !== 'string') {
    throw new Error('forbidden browser request')
  }
  if (fetchSite !== undefined && fetchSite !== 'same-origin') throw new Error('forbidden cross-site request')
  if (origin !== undefined) {
    let parsed
    try {
      parsed = new URL(origin)
    } catch {
      throw new Error('forbidden origin')
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.host !== host) throw new Error('forbidden origin')
  }
}

function startsWith(bytes, signature) {
  return signature.every((value, index) => bytes[index] === value)
}

function appearsExecutable(bytes) {
  return startsWith(bytes, [0x4d, 0x5a])
    || startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])
    || startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe])
}

function inspectZipArchive(bytes, { maxEntries = 10_000, maxExpandedBytes = 256 * 1024 * 1024, maxRatio = 500 } = {}) {
  const minimumEocd = 22
  const start = Math.max(0, bytes.length - 65_557)
  let eocd = -1
  for (let offset = bytes.length - minimumEocd; offset >= start; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break }
  }
  if (eocd < 0) throw new Error('invalid ZIP archive')
  const entries = bytes.readUInt16LE(eocd + 10)
  const directorySize = bytes.readUInt32LE(eocd + 12)
  const directoryOffset = bytes.readUInt32LE(eocd + 16)
  if (entries === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
    throw new Error('ZIP64 archives are not supported')
  }
  if (entries > maxEntries || directoryOffset + directorySize > bytes.length) throw new Error('ZIP archive exceeds safe limits')
  let cursor = directoryOffset
  let compressed = 0
  let expanded = 0
  for (let index = 0; index < entries; index += 1) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('invalid ZIP central directory')
    compressed += bytes.readUInt32LE(cursor + 20)
    expanded += bytes.readUInt32LE(cursor + 24)
    const nameLength = bytes.readUInt16LE(cursor + 28)
    const extraLength = bytes.readUInt16LE(cursor + 30)
    const commentLength = bytes.readUInt16LE(cursor + 32)
    cursor += 46 + nameLength + extraLength + commentLength
  }
  if (expanded > maxExpandedBytes) throw new Error(`archive expands beyond ${maxExpandedBytes} bytes`)
  if (expanded > 1024 * 1024 && expanded / Math.max(1, compressed) > maxRatio) {
    throw new Error(`archive expansion ratio exceeds ${maxRatio}:1`)
  }
}

function validateMagic(kind, bytes) {
  if (appearsExecutable(bytes)) return false
  if (kind === 'text' || kind === 'rtf') return !bytes.subarray(0, 8_192).includes(0)
  if (kind === 'pdf') return bytes.subarray(0, 5).toString('ascii') === '%PDF-'
  if (['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'epub'].includes(kind)) {
    const zipMagic = startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
      || startsWith(bytes, [0x50, 0x4b, 0x05, 0x06])
      || startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])
    if (zipMagic) inspectZipArchive(bytes)
    return zipMagic
  }
  if (kind === 'image') {
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])
      || startsWith(bytes, [0xff, 0xd8, 0xff])
      || bytes.subarray(0, 6).toString('ascii').startsWith('GIF8')
      || (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP')
  }
  return false
}

export async function validateDeclaredFile({ fileName, mediaType = '', bytes }) {
  const normalizedName = normalizeFileName(fileName)
  const extension = extname(normalizedName).toLowerCase()
  const kind = SUPPORTED_EXTENSIONS.get(extension)
  if (kind === undefined) throw new Error(`unsupported file type: ${extension || '(none)'}`)
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)
  if (!validateMagic(kind, buffer)) throw new Error(`file content does not match ${extension}`)
  return { fileName: normalizedName, extension, kind, mediaType: String(mediaType || '') }
}
