import assert from 'node:assert/strict'
import test from 'node:test'

import { inferPreferredResponseLanguage } from '../src/language-policy.js'

function message(text, sourceKind = 'user') {
  return {
    role: 'user',
    source: { kind: sourceKind },
    content: [{ type: 'text', text }],
  }
}

test('keeps Chinese when an English plugin attachment event follows Chinese conversation', () => {
  const language = inferPreferredResponseLanguage([
    message('请分析我接下来上传的表格，并说明重要数据。'),
    message('Read the newly attached English workbook.', 'plugin'),
  ])

  assert.equal(language, 'Simplified Chinese')
})

test('keeps English when Chinese attachment text follows English conversation', () => {
  const language = inferPreferredResponseLanguage([
    message('Please summarize the next document and explain the key numbers.'),
    message('这是附件解析器生成的中文提示。', 'plugin'),
  ])

  assert.equal(language, 'English')
})

test('uses the latest human-authored message and ignores filenames and plugin messages', () => {
  const language = inferPreferredResponseLanguage([
    message('请继续使用中文。'),
    message('Please switch to English for my next request.'),
    message('请读取 中文报表.xlsx', 'plugin'),
  ])

  assert.equal(language, 'English')
})

test('falls back to automatic document-language selection without human text', () => {
  assert.equal(inferPreferredResponseLanguage([
    message('Read the attached file.', 'plugin'),
  ]), 'auto')
})
