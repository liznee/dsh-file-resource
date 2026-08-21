import { posix } from 'node:path'

import { chunkText } from './resource-reader.js'

const MAX_ARCHIVE_ENTRIES = 10_000
const MAX_EXPANDED_BYTES = 256 * 1024 * 1024

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/giu, (_match, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/gu, (_match, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'").replaceAll('&amp;', '&')
}

function attribute(markup, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const match = markup.match(new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'iu'))
  return match === null ? undefined : decodeEntities(match[1] ?? match[2] ?? '')
}

function stripMarkup(value) {
  return decodeEntities(value.replace(/<[^>]*>/gu, '')).replaceAll('\r', '')
}

function textElements(value, localName = 't') {
  const pattern = new RegExp(`<(?:(?:[\\w-]+):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w-]+):)?${localName}>`, 'giu')
  return [...value.matchAll(pattern)].map(match => stripMarkup(match[1])).join('')
}

function paragraphText(value, prefix) {
  const tabs = value.replace(new RegExp(`<${prefix}:tab\\b[^>]*/>`, 'giu'), '\t')
    .replace(new RegExp(`<${prefix}:(?:br|cr)\\b[^>]*/>`, 'giu'), '\n')
  return stripMarkup(tabs).trim()
}

function numberedPath(left, right) {
  const number = path => Number.parseInt(path.match(/(\d+)(?=\.xml$)/u)?.[1] ?? '0', 10)
  return number(left) - number(right) || left.localeCompare(right)
}

function xml(entries, name) {
  const value = entries[name]
  return value === undefined ? '' : new TextDecoder().decode(value)
}

function appendText(chunks, text, metadata, { chunkChars, maxExtractedChars, total }) {
  const normalized = text.trim()
  if (normalized === '') return total
  const nextTotal = total + normalized.length
  if (nextTotal > maxExtractedChars) throw new Error(`extracted content exceeds ${maxExtractedChars} characters`)
  for (const chunk of chunkText(normalized, { maxChars: chunkChars })) {
    chunks.push({ index: chunks.length, text: chunk.text, metadata: { ...metadata } })
  }
  return nextTotal
}

function parseDocx(entries, options) {
  const names = Object.keys(entries).filter(name => /^word\/(?:document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/u.test(name))
  names.sort((left, right) => left === 'word/document.xml' ? -1 : right === 'word/document.xml' ? 1 : left.localeCompare(right))
  const paragraphs = []
  for (const name of names) {
    options.signal?.throwIfAborted()
    for (const match of xml(entries, name).matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/giu)) {
      const text = paragraphText(match[1], 'w')
      if (text !== '') paragraphs.push(text)
    }
  }
  const chunks = []
  appendText(chunks, paragraphs.join('\n'), {}, { ...options, total: 0 })
  return chunks
}

function relationshipTargets(value) {
  const targets = new Map()
  for (const match of value.matchAll(/<Relationship\b([^>]*)\/?\s*>/giu)) {
    const id = attribute(match[1], 'Id')
    const target = attribute(match[1], 'Target')
    if (id !== undefined && target !== undefined) targets.set(id, target)
  }
  return targets
}

function workbookSheets(entries) {
  const workbook = xml(entries, 'xl/workbook.xml')
  const relationships = relationshipTargets(xml(entries, 'xl/_rels/workbook.xml.rels'))
  const sheets = []
  for (const match of workbook.matchAll(/<sheet\b([^>]*)\/?\s*>/giu)) {
    const id = attribute(match[1], 'r:id')
    const target = id === undefined ? undefined : relationships.get(id)
    const normalized = target === undefined ? undefined
      : posix.normalize(target.startsWith('/') ? target.slice(1) : `xl/${target}`)
    sheets.push({ name: attribute(match[1], 'name') ?? `Sheet ${sheets.length + 1}`, target: normalized })
  }
  return sheets
}

function sharedStrings(entries) {
  const source = xml(entries, 'xl/sharedStrings.xml')
  return [...source.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/giu)].map(match => textElements(match[1]))
}

function worksheetText(source, strings) {
  const rows = []
  for (const row of source.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/giu)) {
    const cells = []
    for (const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/giu)) {
      const type = attribute(cell[1], 't')
      const value = cell[2].match(/<v\b[^>]*>([\s\S]*?)<\/v>/iu)?.[1]
      if (type === 's') cells.push(strings[Number.parseInt(stripMarkup(value ?? ''), 10)] ?? '')
      else if (type === 'inlineStr') cells.push(textElements(cell[2]))
      else if (type === 'str') cells.push(stripMarkup(value ?? ''))
      else cells.push(stripMarkup(value ?? textElements(cell[2])))
    }
    rows.push(cells.join('\t'))
  }
  return rows.join('\n')
}

function parseXlsx(entries, options) {
  const strings = sharedStrings(entries)
  const declared = workbookSheets(entries)
  const fallback = Object.keys(entries).filter(name => /^xl\/worksheets\/sheet\d+\.xml$/u.test(name)).sort(numberedPath)
  const sheets = declared.length === 0
    ? fallback.map((target, index) => ({ name: `Sheet ${index + 1}`, target }))
    : declared.map((sheet, index) => ({ ...sheet, target: entries[sheet.target] === undefined ? fallback[index] : sheet.target }))
  const chunks = []
  let total = 0
  for (const [index, sheet] of sheets.entries()) {
    options.signal?.throwIfAborted()
    if (sheet.target === undefined) continue
    total = appendText(chunks, worksheetText(xml(entries, sheet.target), strings), {
      sheetName: sheet.name, sheetNumber: index + 1,
    }, { ...options, total })
  }
  return chunks
}

function parsePptx(entries, options) {
  const slides = Object.keys(entries).filter(name => /^ppt\/slides\/slide\d+\.xml$/u.test(name)).sort(numberedPath)
  const chunks = []
  let total = 0
  for (const [index, name] of slides.entries()) {
    options.signal?.throwIfAborted()
    const paragraphs = [...xml(entries, name).matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/giu)]
      .map(match => textElements(match[1])).filter(Boolean)
    total = appendText(chunks, paragraphs.join('\n'), { slideNumber: index + 1 }, { ...options, total })
  }
  return chunks
}

function odfParagraphs(value) {
  return [...value.matchAll(/<text:(?:p|h)\b[^>]*>([\s\S]*?)<\/text:(?:p|h)>/giu)]
    .map(match => stripMarkup(match[1].replace(/<text:tab\b[^>]*\/>/giu, '\t').replace(/<text:line-break\b[^>]*\/>/giu, '\n')))
    .filter(text => text.trim() !== '')
}

function parseOdf(entries, kind, options) {
  const source = xml(entries, 'content.xml')
  const chunks = []
  let total = 0
  if (kind === 'ods') {
    const tables = [...source.matchAll(/<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/giu)]
    for (const [index, table] of tables.entries()) {
      const name = attribute(table[1], 'table:name') ?? `Sheet ${index + 1}`
      const rows = [...table[2].matchAll(/<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/giu)]
        .map(row => [...row[1].matchAll(/<table:table-cell\b[^>]*>([\s\S]*?)<\/table:table-cell>/giu)]
          .map(cell => odfParagraphs(cell[1]).join(' ')).join('\t'))
      total = appendText(chunks, rows.join('\n'), { sheetName: name, sheetNumber: index + 1 }, { ...options, total })
    }
  } else if (kind === 'odp') {
    const pages = [...source.matchAll(/<draw:page\b[^>]*>([\s\S]*?)<\/draw:page>/giu)]
    for (const [index, page] of pages.entries()) {
      total = appendText(chunks, odfParagraphs(page[1]).join('\n'), { slideNumber: index + 1 }, { ...options, total })
    }
  } else {
    total = appendText(chunks, odfParagraphs(source).join('\n'), {}, { ...options, total })
  }
  return chunks
}

function parseEpub(entries, options) {
  const pages = Object.keys(entries).filter(name => /\.(?:xhtml|html|htm)$/iu.test(name)).sort()
  const chunks = []
  let total = 0
  for (const [index, name] of pages.entries()) {
    options.signal?.throwIfAborted()
    const source = xml(entries, name).replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/giu, '')
      .replace(/<\/(?:p|div|h[1-6]|li|tr)>/giu, '\n')
    total = appendText(chunks, stripMarkup(source), { pageNumber: index + 1 }, { ...options, total })
  }
  return chunks
}

function parseRtf(bytes, options) {
  const decoder = new TextDecoder('windows-1252')
  let value = decoder.decode(bytes)
  value = value.replace(/\\'([0-9a-f]{2})/giu, (_match, hex) => decoder.decode(Uint8Array.of(Number.parseInt(hex, 16))))
    .replace(/\\u(-?\d+)\??/gu, (_match, number) => String.fromCodePoint((Number(number) + 65536) % 65536))
    .replace(/\\(?:par|line)\b\s?/giu, '\n').replace(/\\tab\b\s?/giu, '\t')
    .replace(/\\[a-z]+-?\d*\s?/giu, '').replace(/\\[{}\\]/gu, match => match.slice(1))
    .replace(/[{}]/gu, '')
  const chunks = []
  appendText(chunks, value, {}, { ...options, total: 0 })
  return chunks
}

function wantedEntry(kind, name) {
  if (kind === 'docx') return /^word\/(?:document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/u.test(name)
  if (kind === 'xlsx') return name === 'xl/workbook.xml' || name === 'xl/_rels/workbook.xml.rels'
    || name === 'xl/sharedStrings.xml' || /^xl\/worksheets\/sheet\d+\.xml$/u.test(name)
  if (kind === 'pptx') return /^ppt\/slides\/slide\d+\.xml$/u.test(name)
  if (kind === 'odt' || kind === 'ods' || kind === 'odp') return name === 'content.xml'
  if (kind === 'epub') return /\.(?:xhtml|html|htm)$/iu.test(name)
  return false
}

export async function parseArchive(bytes, {
  kind, chunkChars = 12_000, maxExtractedChars = 10_000_000, signal,
} = {}) {
  signal?.throwIfAborted()
  const options = { chunkChars, maxExtractedChars, signal }
  if (kind === 'rtf') return { kind, chunks: parseRtf(bytes, options) }
  const { unzipSync } = await import('fflate')
  let entriesSeen = 0
  let expandedBytes = 0
  const entries = unzipSync(bytes, {
    filter(file) {
      entriesSeen += 1
      expandedBytes += Number(file.originalSize ?? 0)
      if (entriesSeen > MAX_ARCHIVE_ENTRIES || expandedBytes > MAX_EXPANDED_BYTES) {
        throw new Error('ZIP archive exceeds safe limits')
      }
      return wantedEntry(kind, file.name)
    },
  })
  signal?.throwIfAborted()
  let chunks
  if (kind === 'docx') chunks = parseDocx(entries, options)
  else if (kind === 'xlsx') chunks = parseXlsx(entries, options)
  else if (kind === 'pptx') chunks = parsePptx(entries, options)
  else if (kind === 'odt' || kind === 'ods' || kind === 'odp') chunks = parseOdf(entries, kind, options)
  else if (kind === 'epub') chunks = parseEpub(entries, options)
  else throw new Error(`no archive parser for resource type: ${kind}`)
  if (chunks.length === 0) throw new Error('no readable text found in document')
  return { kind, chunks }
}
