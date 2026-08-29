import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { previewCandidateName, referenceChipName } from '../src/client/preview.js'

function node(text, parent = null) {
  return { textContent: text, parentElement: parent }
}

function chip({ title = '@剑来收藏卡册.xlsx', text = '剑来收藏卡册.xlsx' } = {}) {
  const element = { textContent: text, getAttribute: name => name === 'title' ? title : null }
  return {
    textContent: text,
    closest: selector => selector === '[data-ref-chip]' ? element : null,
    getAttribute: () => null,
  }
}

describe('referenceChipName', () => {
  it('resolves the file name from a Harness ref chip whose visible text omits @', () => {
    assert.equal(referenceChipName(chip()), '剑来收藏卡册.xlsx')
    // 蓝色 chip 的 title 可能是带路径的引用，取 basename
    assert.equal(referenceChipName(chip({ title: '@C:\\work\\files\\report.pdf' })), 'report.pdf')
    assert.equal(referenceChipName(chip({ title: '@"带引号 文件.docx"' })), '带引号 文件.docx')
  })

  it('returns null outside a ref chip', () => {
    assert.equal(referenceChipName(node('剑来收藏卡册.xlsx')), null)
    assert.equal(referenceChipName(node('@report.pdf')), null) // 文本形式交给 previewCandidateName
    assert.equal(referenceChipName(null), null)
  })
})
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