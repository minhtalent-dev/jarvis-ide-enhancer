# Changelog

All notable changes to the **JARVIS IDE Enhancer** extension will be documented in this file.

## [1.1.10] - 2026-10-11

### Fixed
- **Multi-Macro Request Unwrapping:** Resolved an issue where multiple backtick commands in a single prompt caused pill styling to disappear in conversation history.
- **Virtualized List Resilience:** Fixed style dropping when scrolling or recycling chat rows in Monaco list view.
- **Dynamic Polling Guard:** Added automated background reconciliation to keep pill decorations synchronized after asynchronous markdown renders.

## [1.1.9] - 2026-10-09

### Added
- **Backtick Macro Highlighting (Purple Pills):** Signature purple styling for custom prompt commands (`fp, `tt, `rcm, `wtn, etc.) across chat input and history.
- **2-Tier Tokenizer Engine:** Intelligent parsing that cleanly differentiates between standard Markdown inline code blocks and custom macro commands.
- **End-to-End Chat History Styling:** Uniform pill badges across chat input, queued requests, chat history bubbles, and inline request editor sessions.

### Fixed
- Resolved style bleeding into assistant response markdown messages.
- Fixed dual-layer border artifacts on Monaco editor pill decorations.

## [1.1.8] - 2026-10-08

### Added
- Multi-Prompt Slash Command Intellisense (`/workflow`, `/rule`, `/skill`) anywhere in prompt sentences.
- Automated slash command blue pill highlighting.

## [1.1.0] - 2026-10-07

### Initial Release
- 3D Isometric Neon Cursor with centered vector star.
- JARVIS Ready Chat Placeholder with national flags.
- Zero-Crash Architecture with automated styling synchronization.
