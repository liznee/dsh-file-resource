# Changelog

All notable changes to this project are documented in this file.

## [0.4.7] - 2026-08-29

### Fixed

- **Split view alignment**: shrinking only the outer `[data-conversation-scroll]`
  wrapper (which holds both the messages and the composer) so the conversation
  column shifts together — previously the composer bar was shrunk twice while
  the message history did not move, breaking alignment with the preview panel.

## [0.4.6] - 2026-08-29

### Fixed

- **Preview only opens for real files**: the plugin keeps a per-conversation
  registry of file names actually attached or sent by this conversation (in
  localStorage), and `@` references are checked against it before opening the
  panel. Email addresses (`@163.com`) or arbitrary `@text` in the chat no
  longer trigger anything, and clicks inside the composer card are ignored
  entirely.

## [0.4.5] - 2026-08-29

### Changed

- **Spreadsheet previews render as a real table** with cell gridlines and a
  bolded header row (xlsx / ods / csv / tsv), instead of raw tab text. Note:
  the extractor reads cell values only — colors, fonts and merged cells are
  not preserved in the preview.
- **The preview panel aligns with the conversation layout**: its top and
  bottom edges now line up with the chat's vertical bounds instead of floating
  as a full-height overlay.

## [0.4.4] - 2026-08-29

### Fixed

- **Previews of sent files stop breaking when the pending attachment is
  removed**: the store now keeps a per-conversation **send history** (recorded
  on commit, deduplicated, unaffected by removing the draft card). Preview
  resolves through the live attachment first, then the conversation's send
  history, so a file you already sent in this conversation can always be
  previewed again.

## [0.4.3] - 2026-08-29

### Fixed

- **Preview failures now explain themselves**: the preview route returns the
  concrete reason (e.g. "no attached file with that name in this session")
  and the panel shows an actionable hint ("此文件不在当前会话的附件里…") instead
  of the generic "无法预览此文件". File-name matching also tolerates the
  surrounding quotes some reference chips carry.

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

[0.4.7]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.7
[0.4.6]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.6
[0.4.5]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.5
[0.4.4]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.4
[0.4.3]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.3
[0.4.2]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.2
[0.4.1]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.1
[0.4.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.4.0
[0.3.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.3.0
[0.2.1]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.2.1
[0.2.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.2.0
[0.1.1]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.1.1
[0.1.0]: https://github.com/liznee/dsh-file-resource/releases/tag/v0.1.0
