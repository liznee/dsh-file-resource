# Changelog

All notable changes to this project are documented in this file.

## [0.2.0] - 2026-08-29

### Added

- **Codex-style `@` file references**: type `@` in the composer and a popup
  lists the attached (ready) documents; pick one to insert an `@name`
  reference into the draft. The model maps `@name` to the opaque resource ID
  listed in the attachment context and reads it with
  `read_uploaded_resource`. Keyboard supported: ↑/↓ to move, Enter to pick,
  Esc to dismiss; the popup opens above or below the composer depending on
  available space.

## [0.1.1] - 2026-08-27

### Fixed

- File-only send no longer permanently grays out the composer send button: the
  plugin stops mutating the React-owned `disabled` attribute and uses `inert`
  while a send is in flight, restoring `disabled` only when React semantics
  require it (empty draft or machine-busy phases).

## [0.1.0] - 2026-08-22

### Added

- Unified `attach` entry in the DeepSeek Harness Web composer.
- Native Harness image handling and private, session-scoped document resources.
- Local parsing for PDF, modern Office, OpenDocument, EPUB, RTF, text, and source files.
- Bounded model reads, archive-bomb defenses, cache quotas, and session isolation.
- Conversation-language continuity for attachment-only messages and document replies.
- Chinese and English interface copy, tests, package verification, and release documentation.

[0.2.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.2.0
[0.1.1]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.1.1
[0.1.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.1.0
