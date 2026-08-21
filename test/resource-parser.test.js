import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { ParseQueue, parseResource } from '../src/resource-parser.js'

async function withFile(name, bytes, run) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-file-parser-'))
  const objectPath = join(root, name)
  await writeFile(objectPath, bytes)
  try {
    await run({ objectPath, fileName: name, resourceId: 'res_0123456789abcdef0123456789abcdef', size: bytes.length })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('parses UTF-8 and UTF-16 text locally without loading the office parser', async () => {
  let officeLoads = 0
  await withFile('notes.txt', Buffer.from('\ufeffhello 世界'), async resource => {
    const parsed = await parseResource({ ...resource, kind: 'text' }, {
      loadOfficeParser: async () => { officeLoads += 1; throw new Error('must not load') },
    })
    assert.equal(parsed.chunks.map(chunk => chunk.text).join(''), 'hello 世界')
  })
  await withFile('utf16.txt', Buffer.from('\ufeffhello', 'utf16le'), async resource => {
    const parsed = await parseResource({ ...resource, kind: 'text' })
    assert.equal(parsed.chunks[0].text, 'hello')
  })
  assert.equal(officeLoads, 0)
})

test('normalizes native office RAG chunks with page, slide and sheet selectors', async () => {
  const fakeOffice = {
    OfficeParser: { parseOffice: async () => ({ type: 'pptx', content: [] }) },
    OfficeGenerator: {
      generate: async (_ast, format) => {
        assert.equal(format, 'chunks')
        return { value: [
          { text: 'Slide one', metadata: { slideNumber: 1 } },
          { text: 'Slide two', metadata: { slideNumber: 2, sheetName: 'Data' } },
        ] }
      },
    },
  }
  await withFile('deck.pptx', Buffer.from('PK\u0003\u0004fixture'), async resource => {
    const parsed = await parseResource({ ...resource, kind: 'pptx' }, {
      loadOfficeParser: async () => fakeOffice,
    })
    assert.deepEqual(parsed.chunks, [
      { index: 0, text: 'Slide one', metadata: { slideNumber: 1 } },
      { index: 1, text: 'Slide two', metadata: { slideNumber: 2, sheetName: 'Data' } },
    ])
  })
})

test('bounds extracted output to prevent decompression and parser amplification', async () => {
  const fakeOffice = {
    OfficeParser: { parseOffice: async () => ({ type: 'docx' }) },
    OfficeGenerator: { generate: async () => ({ value: [{ text: 'x'.repeat(101), metadata: {} }] }) },
  }
  await withFile('large.docx', Buffer.from('PK\u0003\u0004fixture'), async resource => {
    await assert.rejects(() => parseResource({ ...resource, kind: 'docx' }, {
      loadOfficeParser: async () => fakeOffice,
      maxExtractedChars: 100,
    }), /extracted content exceeds 100 characters/)
  })
})

test('serializes CPU-heavy parses through a single background queue', async () => {
  const queue = new ParseQueue({ concurrency: 1 })
  let active = 0
  let peak = 0
  const job = () => queue.run(async () => {
    active += 1
    peak = Math.max(peak, active)
    await new Promise(resolve => setTimeout(resolve, 10))
    active -= 1
  })
  await Promise.all([job(), job(), job()])
  assert.equal(peak, 1)
  assert.equal(queue.pending, 0)
})
