import assert from 'node:assert/strict'
import test from 'node:test'
import { strToU8, zipSync } from 'fflate'

import {
  normalizeFileName,
  validateBrowserRequest,
  validateDeclaredFile,
  validateSessionId,
} from '../src/resource-security.js'

test('normalizes file names without accepting paths or control characters', () => {
  assert.equal(normalizeFileName('C:\\Users\\me\\report.docx'), 'report.docx')
  assert.equal(normalizeFileName('../../secret\u0000.txt'), 'secret.txt')
  assert.throws(() => normalizeFileName('..'), /invalid file name/)
})

test('validates opaque session ids and rejects path-shaped values', () => {
  assert.equal(validateSessionId('session-1234:abc'), 'session-1234:abc')
  assert.throws(() => validateSessionId('../session'), /invalid session id/)
  assert.throws(() => validateSessionId('a/b'), /invalid session id/)
})

test('requires same-origin browser requests with an unforgeable custom header', () => {
  assert.doesNotThrow(() => validateBrowserRequest({
    method: 'POST',
    headers: {
      host: '127.0.0.1:3080',
      origin: 'http://127.0.0.1:3080',
      'sec-fetch-site': 'same-origin',
      'x-dsh-file-upload': '1',
    },
  }))
  assert.throws(() => validateBrowserRequest({
    method: 'POST', headers: { host: '127.0.0.1:3080', origin: 'https://evil.example' },
  }), /forbidden/)
})

test('uses extension and magic bytes together and rejects executable masquerades', async () => {
  assert.equal((await validateDeclaredFile({
    fileName: 'notes.txt', mediaType: 'text/plain', bytes: Buffer.from('plain text'),
  })).kind, 'text')
  await assert.rejects(() => validateDeclaredFile({
    fileName: 'notes.txt', mediaType: 'text/plain', bytes: Buffer.from('MZ executable'),
  }), /content does not match/)
  await assert.rejects(() => validateDeclaredFile({
    fileName: 'payload.exe', mediaType: 'application/octet-stream', bytes: Buffer.from('MZ'),
  }), /unsupported file type/)
})

test('rejects highly amplified ZIP documents before the office parser sees them', async () => {
  const bomb = Buffer.from(zipSync({ 'word/document.xml': strToU8('x'.repeat(2_000_000)) }, { level: 9 }))
  await assert.rejects(() => validateDeclaredFile({
    fileName: 'bomb.docx',
    mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes: bomb,
  }), /archive expansion ratio/)
})
