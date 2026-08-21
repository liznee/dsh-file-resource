import { chunkText } from './resource-reader.js'

const MAX_PDF_PAGES = 2_000
const MAX_IMAGE_PIXELS = 16_777_216

async function defaultPdfJsLoader() {
  // PDF.js' Node entry evaluates rendering-only DOM globals at import time.
  // Text extraction never uses them, so provide import-scoped inert shims
  // instead of pulling the large native canvas optional dependency.
  const missingMatrix = globalThis.DOMMatrix === undefined
  const missingPath = globalThis.Path2D === undefined
  if (missingMatrix) globalThis.DOMMatrix = class TextOnlyDOMMatrix {}
  if (missingPath) globalThis.Path2D = class TextOnlyPath2D {}
  try {
    return await import('pdfjs-dist/legacy/build/pdf.mjs')
  } finally {
    if (missingMatrix) delete globalThis.DOMMatrix
    if (missingPath) delete globalThis.Path2D
  }
}

function pageText(items) {
  let value = ''
  for (const item of items) {
    if (typeof item?.str !== 'string') continue
    value += item.str
    if (item.hasEOL) value += '\n'
    else if (item.str !== '' && !/\s$/u.test(item.str)) value += ' '
  }
  return value.trim()
}

export async function parsePdf(bytes, {
  chunkChars = 12_000,
  loadPdfJs = defaultPdfJsLoader,
  maxExtractedChars = 10_000_000,
  maxPages = MAX_PDF_PAGES,
  signal,
} = {}) {
  signal?.throwIfAborted()
  const pdfjs = await loadPdfJs()
  signal?.throwIfAborted()
  const task = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableFontFace: true,
    enableScripting: false,
    isEvalSupported: false,
    maxImageSize: MAX_IMAGE_PIXELS,
    stopEvent: true,
    verbosity: 0,
  })
  let document
  try {
    document = await task.promise
    if (!Number.isInteger(document.numPages) || document.numPages < 1 || document.numPages > maxPages) {
      throw new Error(`PDF page count exceeds ${maxPages}`)
    }
    const chunks = []
    let total = 0
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      signal?.throwIfAborted()
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent({ disableNormalization: false, includeMarkedContent: false })
      const text = pageText(content.items)
      total += text.length
      if (total > maxExtractedChars) throw new Error(`extracted content exceeds ${maxExtractedChars} characters`)
      if (text !== '') {
        for (const chunk of chunkText(text, { maxChars: chunkChars })) {
          chunks.push({ index: chunks.length, text: chunk.text, metadata: { pageNumber } })
        }
      }
      page.cleanup?.()
    }
    if (chunks.length === 0) throw new Error('no readable text found in PDF; scanned PDFs require OCR')
    return { kind: 'pdf', chunks }
  } finally {
    await Promise.resolve(document?.destroy?.())
    await Promise.resolve(task.destroy?.())
  }
}
