import assert from 'node:assert/strict'
import test from 'node:test'

import { apply as applyHost, createFileOnlyMessage, inject as hostInject, name } from '../src/index.js'
import {
  ATTACH_COMMAND,
  createAttachDecoration,
  findWakeMarkerRow,
  inject as clientInject,
} from '../src/client/index.js'

test('file-only wake gives the model a concrete hidden instruction', () => {
  const message = createFileOnlyMessage()
  assert.equal(message.role, 'user')
  assert.equal(message.source.plugin, 'dsh-file-upload')
  assert.match(message.content[0].text, /read.*attached files/iu)
  assert.match(message.content[0].text, /key facts/iu)
})

test('locates the complete Harness context row for the hidden wake marker', () => {
  const row = { hidden: false }
  const source = {
    closest: selector => selector === '[data-chat-flow-kind="context"]' ? row : null,
    parentElement: null,
  }
  assert.equal(findWakeMarkerRow(source), row)
})

test('host half registers an alphabetically leading attach command', async () => {
  let definition
  let route
  let tool
  let section
  const ctx = {
    commands: {
      register(value) {
        definition = value
        return () => {}
      },
    },
    webServer: { register(value) { route = value; return () => {} } },
    tools: { register(value) { tool = value; return () => {} } },
    systemPrompt: { section(value) { section = value; return () => {} } },
    agents: { get() { return undefined } },
    logger: { warn() {} },
    async effect(install) { return install() },
  }

  const root = await import('node:fs/promises').then(({ mkdtemp }) => mkdtemp(`${process.cwd()}\\test-host-`))
  try {
    await applyHost(ctx, { resourceRoot: root })

    assert.equal(name, 'dsh-file-upload')
    assert.deepEqual(hostInject, ['commands', 'webServer', 'tools', 'systemPrompt', 'agents'])
    assert.equal(definition.name, ATTACH_COMMAND)
    assert.match(definition.description, /浏览文件/)
    assert.equal(route.path, '/dsh-file-upload/v1')
    assert.equal(tool.name, 'read_uploaded_resource')
    assert.equal(section.name, 'dsh-file-upload:resources')
    assert.deepEqual(await definition.handler({ rawInput: '' }), {
      kind: 'error',
      text: 'Open the Web + menu and choose “attach” to browse files.',
    })
  } finally {
    await import('node:fs/promises').then(({ rm }) => rm(root, { recursive: true, force: true }))
  }
})

test('client decoration opens the native picker from the existing command row', async () => {
  let opened = 0
  const decoration = createAttachDecoration({ open: () => { opened += 1 } })

  assert.equal(decoration.name, ATTACH_COMMAND)
  assert.equal(decoration.available({ sessionId: 'session-1' }), true)
  assert.equal(decoration.ui.kind, 'popupSelect')
  assert.deepEqual(await decoration.ui.options({ sessionId: 'session-1' }, new AbortController().signal), [])
  assert.equal(opened, 1)
})

test('client decoration returns a rejected promise when native activation fails', async () => {
  const decoration = createAttachDecoration({
    open: () => { throw new Error('picker denied') },
  })

  const result = decoration.ui.options({ sessionId: 'session-1' }, new AbortController().signal)

  assert.equal(result instanceof Promise, true)
  await assert.rejects(result, /picker denied/)
})

test('client half declares the menu, slot, and locale services it uses', () => {
  assert.deepEqual(clientInject, ['commandUi', 'slots', 'locale'])
})
