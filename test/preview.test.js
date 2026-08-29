import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { previewCandidateName } from '../src/client/preview.js'

function node(text, parent = null) {
  return { textContent: text, parentElement: parent }
}

describe('previewCandidateName', () => {
  it('extracts a short @name from the clicked element', () => {
    assert.equal(previewCandidateName(node('@剑来收藏卡册.xlsx')), '剑来收藏卡册.xlsx')
    assert.equal(previewCandidateName(node('a.pdf')), null)
  })

  it('walks up to a containing element for chip-like markup', () => {
    const chip = node('@report.pdf')
    const wrapper = node('@report.pdf', chip)
    assert.equal(previewCandidateName(wrapper), 'report.pdf')
  })

  it('rejects sentences, bare @, and long text', () => {
    assert.equal(previewCandidateName(node('@dsh launch')), null)
    assert.equal(previewCandidateName(node('@')), null)
    assert.equal(previewCandidateName(node('@' + 'x'.repeat(200))), null)
    assert.equal(previewCandidateName(node('plain text here')), null)
    assert.equal(previewCandidateName(null), null)
  })
})