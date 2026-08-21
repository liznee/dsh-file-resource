export function createReadResourceTool(service) {
  return {
    name: 'read_uploaded_resource',
    description: 'Read a bounded chunk, page, slide, sheet, or search result from a file attached to this conversation.',
    parameters: {
      resource_id: { type: 'string', required: true, description: 'Opaque resource ID exactly as listed in the attached-files context.' },
      selector: { type: 'string', description: 'Optional selector: chunk:N, page:N, slide:N, sheet:NAME, search:TEXT, or summary.' },
      offset: { type: 'integer', description: 'Character offset within the selected result. Defaults to 0.' },
      limit: { type: 'integer', description: 'Maximum characters to return, from 1 to 24000. Defaults to 8000.' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{
        type: 'text',
        text: [
          `${value.fileName} (${value.kind}, ${value.selector})`,
          value.text,
          value.truncated ? `Continue with offset=${value.nextOffset}.` : '',
        ].filter(Boolean).join('\n\n'),
      }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      exec.signal?.throwIfAborted()
      const sessionId = exec.agent?.id
      if (typeof sessionId !== 'string' || sessionId === '') throw new Error('read_uploaded_resource requires an agent session')
      const result = await service.read(sessionId, args)
      exec.signal?.throwIfAborted()
      return result
    },
  }
}
