import assert from 'node:assert/strict'
import test from 'node:test'

import { chunkText, readSelection, resourcePrompt } from '../src/resource-reader.js'

test('chunks text on readable boundaries and preserves every character', () => {
  const text = 'Heading\n\nFirst paragraph.\n\nSecond paragraph is longer.'
  const chunks = chunkText(text, { maxChars: 24 })
  assert.equal(chunks.length > 1, true)
  assert.equal(chunks.map(chunk => chunk.text).join(''), text)
  assert.deepEqual(chunks.map(chunk => chunk.index), chunks.map((_, index) => index))
})

test('reads bounded chunks and exposes an explicit continuation cursor', () => {
  const resource = {
    resourceId: 'res_1234',
    fileName: 'notes.txt',
    kind: 'text',
    chunks: [{ index: 0, text: '0123456789', metadata: {} }],
  }
  const result = readSelection(resource, { selector: 'chunk:0', offset: 2, limit: 4 })
  assert.equal(result.text, '2345')
  assert.equal(result.nextOffset, 6)
  assert.equal(result.truncated, true)
})

test('builds compact prompt context without including document contents', () => {
  const prompt = resourcePrompt([{
    resourceId: 'res_deadbeef', fileName: 'budget.xlsx', kind: 'xlsx', size: 12345, unitCount: 4,
  }])
  assert.match(prompt, /res_deadbeef/)
  assert.match(prompt, /budget\.xlsx/)
  assert.doesNotMatch(prompt, /document contents/i)
  assert.equal(prompt.length < 500, true)
})
