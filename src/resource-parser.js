import { readFile } from 'node:fs/promises'

import { chunkText } from './resource-reader.js'

const ARCHIVE_KINDS = new Set(['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'epub'])

function decodeText(bytes) {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le', { fatal: true }).decode(bytes.subarray(2))
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be', { fatal: true }).decode(bytes.subarray(2))
  }
  const start = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(start))
  } catch {
    throw new Error('unsupported text encoding; save this file as UTF-8 or UTF-16')
  }
}

function normalizeChunks(value) {
  const chunks = Array.isArray(value) ? value : Array.isArray(value?.chunks) ? value.chunks : []
  return chunks.map((chunk, index) => ({
    index,
    text: String(chunk?.text ?? ''),
    metadata: chunk?.metadata !== null && typeof chunk?.metadata === 'object' ? { ...chunk.metadata } : {},
  }))
}

function extractedLength(chunks) {
  return chunks.reduce((sum, chunk) => sum + chunk.text.length, 0)
}

async function defaultArchiveParserLoader() {
  return import('./archive-parser.js')
}

async function defaultPdfParserLoader() {
  return import('./pdf-parser.js')
}

export async function parseResource(resource, {
  loadArchiveParser = defaultArchiveParserLoader,
  loadPdfParser = defaultPdfParserLoader,
  loadPdfJs,
  maxExtractedChars = 10_000_000,
  chunkChars = 12_000,
  signal,
} = {}) {
  signal?.throwIfAborted()
  if (resource.kind === 'text') {
    const bytes = await readFile(resource.objectPath)
    signal?.throwIfAborted()
    const text = decodeText(bytes)
    if (text.length > maxExtractedChars) throw new Error(`extracted content exceeds ${maxExtractedChars} characters`)
    return { kind: 'text', chunks: chunkText(text, { maxChars: chunkChars }) }
  }
  const bytes = await readFile(resource.objectPath)
  signal?.throwIfAborted()
  let parsed
  if (resource.kind === 'pdf') {
    const { parsePdf } = await loadPdfParser()
    parsed = await parsePdf(bytes, { chunkChars, loadPdfJs, maxExtractedChars, signal })
  } else if (ARCHIVE_KINDS.has(resource.kind)) {
    const { parseArchive } = await loadArchiveParser()
    parsed = await parseArchive(bytes, { kind: resource.kind, chunkChars, maxExtractedChars, signal })
  } else {
    throw new Error(`no parser for resource type: ${resource.kind}`)
  }
  const chunks = normalizeChunks(parsed?.chunks)
  if (extractedLength(chunks) > maxExtractedChars) {
    throw new Error(`extracted content exceeds ${maxExtractedChars} characters`)
  }
  return { kind: resource.kind, chunks }
}

/** Small cooperative semaphore: heavyweight parsers never compete for the Host heap. */
export class ParseQueue {
  constructor({ concurrency = 1 } = {}) {
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('concurrency must be a positive integer')
    this.concurrency = concurrency
    this.active = 0
    this.waiters = []
    this.pending = 0
  }

  async run(task) {
    this.pending += 1
    if (this.active >= this.concurrency) await new Promise(resolve => { this.waiters.push(resolve) })
    this.pending -= 1
    this.active += 1
    try {
      return await task()
    } finally {
      this.active -= 1
      this.waiters.shift()?.()
    }
  }
}
