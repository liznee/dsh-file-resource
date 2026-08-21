import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { strToU8, zipSync } from 'fflate'

import { parseResource } from '../src/resource-parser.js'

function archive(entries) {
  return Buffer.from(zipSync(Object.fromEntries(Object.entries(entries).map(([name, value]) => [name, strToU8(value)]))))
}

async function parse(kind, fileName, bytes) {
  const root = await mkdtemp(join(tmpdir(), `dsh-${kind}-`))
  const objectPath = join(root, fileName)
  await writeFile(objectPath, bytes)
  try {
    return await parseResource({ kind, fileName, objectPath, size: bytes.length })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('extracts shared-string workbooks and preserves sheet selectors', async () => {
  const bytes = archive({
    'xl/workbook.xml': '<workbook xmlns:r="r"><sheets><sheet name="First" r:id="rId1"/><sheet name="Second" r:id="rId2"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>',
    'xl/sharedStrings.xml': '<sst><si><t>Shared value</t></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData><row><c t="s"><v>0</v></c></row></sheetData></worksheet>',
    'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row><c t="inlineStr"><is><t>Inline value</t></is></c></row></sheetData></worksheet>',
  })
  const parsed = await parse('xlsx', 'book.xlsx', bytes)
  assert.deepEqual(parsed.chunks.map(chunk => [chunk.metadata.sheetName, chunk.text]), [
    ['First', 'Shared value'], ['Second', 'Inline value'],
  ])
})

for (const [kind, fileName, content, expected, metadata] of [
  ['odt', 'notes.odt', '<office:document><office:body><office:text><text:p>Hello &amp; ODT</text:p></office:text></office:body></office:document>', 'Hello & ODT', {}],
  ['ods', 'table.ods', '<office:document><table:table table:name="Budget"><table:table-row><table:table-cell><text:p>Revenue</text:p></table:table-cell><table:table-cell><text:p>42</text:p></table:table-cell></table:table-row></table:table></office:document>', 'Revenue\t42', { sheetName: 'Budget' }],
  ['odp', 'slides.odp', '<office:document><draw:page><text:p>Slide one</text:p></draw:page><draw:page><text:p>Slide two</text:p></draw:page></office:document>', 'Slide two', { slideNumber: 2 }],
]) {
  test(`extracts ${kind.toUpperCase()} text and structural metadata`, async () => {
    const parsed = await parse(kind, fileName, archive({ 'content.xml': content }))
    const match = parsed.chunks.find(chunk => chunk.text.includes(expected))
    assert.ok(match)
    for (const [key, value] of Object.entries(metadata)) assert.equal(match.metadata[key], value)
  })
}

test('extracts EPUB chapters without retaining script or style contents', async () => {
  const parsed = await parse('epub', 'book.epub', archive({
    'OEBPS/chapter1.xhtml': '<html><head><style>secret-style</style></head><body><h1>Chapter</h1><p>Hello EPUB</p><script>secret-script</script></body></html>',
  }))
  const text = parsed.chunks.map(chunk => chunk.text).join('\n')
  assert.match(text, /Chapter\s+Hello EPUB/u)
  assert.doesNotMatch(text, /secret/u)
})

test('extracts bounded RTF text and unicode escapes', async () => {
  const parsed = await parse('rtf', 'note.rtf', Buffer.from('{\\rtf1\\ansi Hello\\par world \\u19990?}'))
  assert.match(parsed.chunks[0].text, /Hello\s+world 世/u)
})
