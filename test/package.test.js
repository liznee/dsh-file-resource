import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

test('package exposes both DSH faces and its bundle patch', async () => {
  const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  const patch = await readFile(new URL('cordis.patch.yml', root), 'utf8')

  assert.equal(manifest.name, 'dsh-file-upload')
  assert.equal(manifest.exports['./client'], './lib/client.js')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.match(patch, /name: dsh-file-upload/)
  assert.equal(manifest.dependencies.officeparser, '7.8.0')
  assert.equal(manifest.overrides['pdfjs-dist'], '6.2.108')
  assert.equal(manifest.engines.node, '^22.19.0 || >=24.0.0')
})
