export const LANGUAGE_CONTINUITY_POLICY = [
  'Response-language continuity policy:',
  'Use the language of the most recent human-authored natural-language message that appears before any plugin-generated attachment event.',
  'Use that language for all assistant-visible natural-language text, including reasoning/thinking summaries, progress updates, tool narration, headings, and final answers.',
  'Ignore the language of plugin messages, attachment metadata or contents, filenames, and tool text/errors when choosing the response language.',
  "If there is no prior human text, use the attachment's dominant language; if it is unclear or mixed, use Simplified Chinese.",
].join(' ')
