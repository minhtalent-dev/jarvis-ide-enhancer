# Changelog

All notable changes to the **JARVIS IDE Enhancer** extension will be documented in this file.

## [1.1.15] - 2026-10-11

### Fixed
- **Complete Elimination of Empty Tool/Terminal Output Boxes:** Removed `.interactive-session` CSS scope restriction and expanded selectors to cover `.chat-output-code-block`, `.interactive-result-code-block`, `.tool-output-part`, `.webview-output`, and collapsible thinking containers.
- **Enhanced Empty Detection Engine:** Intelligent separation of output text from header titles, reliably identifying silent command executions and hidden terminal widgets.

## [1.1.14] - 2026-10-11

### Added
- **JARVIS Hybrid Vault Manager:** Full export and restore capabilities for the entire Agent Customizations ecosystem (13 MCP Servers, 36 Skills, 6 Prompts & Rules, 5 Custom Model Providers, and Custom Styles).
- **AES-256-GCM Military-Grade Vault Encryption:** Encrypt and compress custom setups with a master passphrase, protecting all API keys, database connection strings, and private reverse proxy tunnels.
- **Zero-Leak Sanitized Template Export:** Automatic regex redaction of sensitive credentials, passwords, and machine-bound paths for safe sharing and public version control.
- **Cross-Platform Path Tokenization:** Normalizes absolute paths using `${userHome}` and `${mcpStorage}` across Windows, macOS, and Linux.
- **New Commands:**
  - `JARVIS: Export Agent Customizations Vault` (`jarvisEnhancer.exportVault`)
  - `JARVIS: Import Agent Customizations Vault` (`jarvisEnhancer.importVault`)

## [1.1.13] - 2026-10-11

### Fixed
- **Empty Terminal Container Suppression (Hybrid Guard):** Completely eliminated empty rectangular tool/terminal boxes in chat response when commands run silently without output (e.g. `node --check`).
- **ANSI & Zero-Width Space Sanitization:** Advanced filter strips terminal escape sequences (`\u001b`) and whitespace to reliably detect truly silent commands.

## [1.1.12] - 2026-10-11

### Added
- **Macro Auto-Discovery Engine:** Automatically scans and parses custom macro definitions from `.instructions.md` rule files across user profiles and workspace configurations.
- **Cloud Settings Sync Integration:** Discovered macros are synchronized into `jarvisEnhancer.customMacros` global settings and backed up to GitHub Settings Sync across all devices.
- **Rule File Watcher:** Live background watcher automatically updates autocomplete suggestions whenever `.instructions.md` files are edited or created.
- **New Command:** `JARVIS: Discover Macros & Sync Settings` (`jarvisEnhancer.discoverMacros`).

## [1.1.11] - 2026-10-11

### Added
- **Backtick Macro Autocomplete Popup:** Interactive floating suggestion menu appearing directly at cursor position when typing backtick commands (`fp, `tt, `rcm, `wtn, etc.) in Chat Input with ArrowUp/ArrowDown navigation and Tab/Enter completion.
- **Self-Healing Patch Daemon:** Automated non-blocking background repair service running on startup to verify and restore workbench patches after VS Code updates.
- **New Command:** `JARVIS: Run Self-Healing & Verify Patches` (`jarvisEnhancer.runSelfHealing`).

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
