import assert from 'node:assert/strict'
import test from 'node:test'

import { apply as applyHost, inject as hostInject, name } from '../src/index.js'
import {
  ATTACH_COMMAND,
  createAttachDecoration,
  inject as clientInject,
} from '../src/client/index.js'

test('host half registers an alphabetically leading attach command', async () => {
  let definition
  const ctx = {
    commands: {
      register(value) {
        definition = value
        return () => {}
      },
    },
    effect(install) { return install() },
  }

  applyHost(ctx)

  assert.equal(name, 'dsh-image-upload')
  assert.deepEqual(hostInject, ['commands'])
  assert.equal(definition.name, ATTACH_COMMAND)
  assert.match(definition.description, /Browse image files/)
  assert.deepEqual(await definition.handler({ rawInput: '' }), {
    kind: 'error',
    text: 'Open the Web + menu and choose “attach” to browse image files.',
  })
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

test('client half declares only the services it uses', () => {
  assert.deepEqual(clientInject, ['commandUi'])
})
