# Changelog

All notable changes to this project are documented in this file.

## [0.4.2] - 2026-08-29

### Fixed

- **Drag-and-drop no longer triggers the native "images only" notice**: file
  drags are fully captured by the plugin (the Harness native drop overlay and
  its `仅支持 PNG/JPG/WebP/GIF` prompt no longer appear), and also **fixed the
  duplicate-attachment loop** — the synthetic drop re-dispatched for the native
  image pipeline used to re-enter the plugin's own drop listener.
- **Clicking the blue `@fileName` chip now previews again**: the Harness chip
  hides the leading `@` in its visible text, so the preview matcher now
  resolves the name from the chip's `data-ref-chip`/`title` attributes
  (falling back to plain `@name` text).

## [0.4.1] - 2026-08-29

### Removed

- **The attachment `@`-picker is removed.** `@` in the composer is the DeepSeek
  Harness native workspace-file / session reference surface; the plugin no
  longer registers an overlapping attachment list there. Attachments still
  appear automatically as `@fileName` mentions in sent messages and stay
  previewable by clicking them in the conversation.

## [0.4.0] - 2026-08-29

### Added

- **Right-side file preview**: click an `@fileName` reference in the
  conversation to open a slide-over preview panel on the right with a bounded
  read of the file (new session-scoped `preview` route operation). Esc, the
  backdrop, or the × button closes it.

## [0.3.0] - 2026-08-29

### Added

- **Visible attachments in sent messages**: when a message goes out with ready
  documents, the draft is completed with `@fileName …` mentions first (both via
  the send button and plain Enter), so the conversation shows exactly which
  files were attached — no more silent sends. The model maps the `@name` to the
  resource ID and reads it on demand. The legacy hidden file-only wake message
  is replaced by this visible flow.

## [0.2.1] - 2026-08-29

### Added

- **Global drag-and-drop**: drag files anywhere over the window — a
  "release to attach" overlay appears and releasing routes images through the
  native Harness pipeline and documents through the plugin upload.
- **Document paste**: `Ctrl+V` with copied files in the composer attaches the
  non-image files; image-only pastes are left to the native pipeline.

### Fixed

- **@-mention reliability**: token detection now reads the live textarea value
  instead of the React draft snapshot, so the popup opens correctly even
  mid-keystroke.

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

[0.4.2]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.2
[0.4.1]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.1
[0.4.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.0
[0.3.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.3.0
[0.2.1]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.2.1
[0.2.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.2.0
[0.1.1]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.1.1
[0.1.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.1.0
