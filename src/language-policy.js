export function inferPreferredResponseLanguage(messages) {
  if (!Array.isArray(messages)) return 'auto'

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== 'user' || message?.source?.kind !== 'user' || !Array.isArray(message.content)) continue
    const text = message.content
      .filter(block => block?.type === 'text' && typeof block.text === 'string')
      .map(block => block.text)
      .join('\n')
      .trim()
    if (text === '') continue

    const hanCharacters = text.match(/\p{Script=Han}/gu)?.length ?? 0
    const latinWords = text.match(/\p{Script=Latin}+/gu)?.length ?? 0
    if (hanCharacters === 0 && latinWords === 0) continue
    return hanCharacters >= latinWords ? 'Simplified Chinese' : 'English'
  }

  return 'auto'
}

export function languageContinuityPolicy(preferredLanguage = 'auto') {
  return [
    'Response-language continuity policy:',
    'Use the language of the most recent human-authored natural-language message that appears before any plugin-generated attachment event.',
    'Use that language for all assistant-visible natural-language text, including reasoning/thinking summaries, progress updates, tool narration, headings, and final answers.',
    'Ignore the language of plugin messages, attachment metadata or contents, filenames, and tool text/errors when choosing the response language.',
    "If there is no prior human text, use the attachment's dominant language; if it is unclear or mixed, use Simplified Chinese.",
    preferredLanguage === 'auto' ? '' : `Preferred response language for the current attachment turn: ${preferredLanguage}.`,
  ].filter(Boolean).join(' ')
}

export const LANGUAGE_CONTINUITY_POLICY = languageContinuityPolicy()
