import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

import { createResourceRoute } from './resource-route.js'
import { ResourceService } from './resource-service.js'
import { ResourceStore } from './resource-store.js'
import { createReadResourceTool } from './resource-tool.js'
import { ATTACH_COMMAND } from './shared.js'

export const name = 'dsh-file-resource'
export const inject = ['commands', 'webServer', 'tools', 'systemPrompt', 'agents']

const WEB_ONLY_MESSAGE = 'Open the Web + menu and choose “attach” to browse files.'

function dshHome() {
  const configured = String(process.env.DSH_HOME ?? '').trim()
  if (configured === '') return join(homedir(), '.dsh')
  if (configured === '~') return homedir()
  if (configured.startsWith('~/') || configured.startsWith('~\\')) return resolve(homedir(), configured.slice(2))
  return isAbsolute(configured) ? resolve(configured) : resolve(configured)
}

export function createFileOnlyMessage() {
  return Object.freeze({
    id: randomUUID(),
    role: 'user',
    content: Object.freeze([Object.freeze({
      type: 'text',
      text: 'Read the newly attached files with read_uploaded_resource. Give the user a concise, useful summary with the key facts and concrete values. Do not ask them to restate the upload.',
    })]),
    source: Object.freeze({ kind: 'plugin', plugin: name }),
  })
}

export async function apply(ctx, config = {}) {
  await ctx.effect(async () => {
    const storeOptions = {
      root: config.resourceRoot ?? join(dshHome(), 'resources', 'dsh-file-resource', 'v1'),
      ...config.maxFileBytes === undefined ? {} : { maxFileBytes: config.maxFileBytes },
      ...config.maxBatchBytes === undefined ? {} : { maxBatchBytes: config.maxBatchBytes },
      ...config.maxCacheBytes === undefined ? {} : { maxCacheBytes: config.maxCacheBytes },
      ...config.maxFilesPerSession === undefined ? {} : { maxFilesPerSession: config.maxFilesPerSession },
      ...config.unreferencedTtlMs === undefined ? {} : { unreferencedTtlMs: config.unreferencedTtlMs },
    }
    const store = new ResourceStore(storeOptions)
    await store.open()
    await store.collectGarbage()
    const service = new ResourceService({ store })

    const wake = async (sessionId, resourceIds) => {
      const attached = new Set((await service.listAll(sessionId)).map(resource => resource.resourceId))
      if (resourceIds.some(resourceId => !attached.has(resourceId))) throw new Error('resource is not attached to this session')
      const agent = ctx.agents.get(sessionId)
      if (agent === undefined) throw new Error('session is not live')
      agent.send(createFileOnlyMessage(), 'next-turn', true)
    }

    const disposers = [
      ctx.commands.register({
        name: ATTACH_COMMAND,
        description: '浏览文件（图片、PDF、Word、Excel、PPT、文本）',
        handler: () => Promise.resolve({ kind: 'error', text: WEB_ONLY_MESSAGE }),
      }),
      ctx.webServer.register(createResourceRoute(service, {
        maxFileBytes: store.limits.maxFileBytes,
        logger: ctx.logger,
        wake,
      })),
      ctx.tools.register(createReadResourceTool(service)),
      ctx.systemPrompt.section({
        name: 'dsh-file-resource:resources',
        order: 180,
        text: ({ agent }) => agent === undefined ? '' : service.promptFor(agent.id),
      }),
    ]

    return async () => {
      for (const dispose of disposers.reverse()) await Promise.resolve(dispose?.())
      await store.close()
    }
  }, 'dsh-file-resource: resource runtime')
}
