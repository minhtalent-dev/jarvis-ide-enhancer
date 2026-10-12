# Changelog

All notable changes to the **JARVIS IDE Enhancer** extension will be documented in this file.

## [1.1.30] - 2026-10-12

### Fixed
- **Khắc phục lỗi thiếu vạch mốc khi mở phiên chat cũ:** Bổ sung cơ chế phát hiện số lượng turn qua thuộc tính trợ năng `aria-setsize` và chỉ số `data-index`. Tự động hiển thị đầy đủ 100% các vạch mốc ngay khi mở chat mà không cần cuộn ngược lên trên.
- **Bộ nhớ đệm phiên thông minh (Session Cache):** Tự động ghi nhớ và phục hồi tiêu đề, thời gian và trích dẫn câu hỏi của toàn bộ các lượt chat qua bộ nhớ đệm `window.__jarvisSessionCache`.
- **Cơ chế tải bù tự động khi chuyển lượt (Snap Back-fill):** Khi bấm vào vạch mốc chưa tải trong DOM, hệ thống tự động cuộn đến vị trí tương ứng và nạp dữ liệu chi tiết vào thẻ xem trước.

## [1.1.29] - 2026-10-12

### Improved
- **Tinh chỉnh Chat Timeline Minimap chuẩn phong cách Codex:** Gỡ bỏ khối viewport xám thô, thay thế bằng thanh track mảnh 1px và vạch chỉ báo gradient tím neon thanh lịch.
- **Tối ưu khoảng cách vạch mốc:** Gom nhóm và phân bố khoảng cách tự nhiên (18px-30px) khi ít turn, loại bỏ hoàn toàn khoảng cách trống quá xa giữa các lượt hỏi.
- **Nâng cấp thẻ Hover Preview Card Glassmorphism:** Tích hợp icon bookmark SVG, tiêu đề prompt 2 dòng, tự động trích xuất 1-2 dòng đầu câu trả lời của AI và vùng cảm ứng rê chuột mở rộng.

## [1.1.28] - 2026-10-12

### Added
- **Thanh điều hướng Chat Timeline Minimap phong cách Codex:** Bổ sung thanh ray điều hướng trực quan nằm ở góc phải màn hình chat, cho phép bao quát nhanh toàn bộ các lượt trò chuyện và chuyển đổi nhanh giữa các câu hỏi.
- **Thẻ xem trước Glassmorphism Hover Preview Card:** Hiển thị thẻ tóm tắt nội dung khi rê chuột vào từng vạch mốc trên thanh điều hướng, tự động thích ứng màu sắc theo Theme hiện tại của trình soạn thảo.
- **Cơ chế cuộn mượt thông minh hỗ trợ danh sách ảo hóa:** Tự động điều hướng và cuộn mượt chính xác đến đúng câu hỏi được chọn kể cả trong các cuộc trò chuyện dài.

## [1.1.27] - 2026-10-12

### Added
- **Gợi ý tự động thông minh cho Slash Command & Macro:** Bổ sung cửa sổ gợi ý nổi thông minh hỗ trợ cả lệnh gạch chéo (`/`) và macro (``` ` ```), tự động nhận diện toàn bộ danh mục kỹ năng và lệnh quy trình làm việc.
- **Tự động quét kỹ năng quy trình:** Tích hợp bộ quét tự động danh mục quy trình làm việc và kỹ năng sẵn có trên máy để hiển thị đầy đủ trong bảng gợi ý chat.
- **Tự động dọn sạch V8 Bytecode Cache (Zero-PowerShell):** Tự động dọn dẹp cache bytecode đa nền tảng sau khi vá file, đảm bảo các máy mới nhận diện ngay lập tức mà không cần chạy lệnh PowerShell thủ công.

### Fixed
- **Bảo toàn hiển thị Terminal có nội dung trong Chat:** Khắc phục triệt để lỗi bộ lọc khiến các thẻ terminal có dữ liệu bị ẩn nhầm trên giao diện chat. Chỉ ẩn thông báo rỗng khi lệnh thực sự không có kết quả xuất ra.

### Improved
- **Trải nghiệm giao diện đồng bộ & an toàn:** Nâng cấp độ ổn định của hệ thống hiển thị huy hiệu lệnh, tối ưu hóa giao diện nổi hoạt động độc lập và mượt mà trên mọi thiết bị.

## [1.1.26] - 2026-10-12

### Fixed
- **Multi-Slash Intellisense Unblocked:** Removed core gate `parsedInput.parts.find(instanceof Pm)` preventing completion suggestions for the 2nd, 3rd, and subsequent slash commands.
- **Zero-Crash Universal Self-Healing Engine:** Fully automated, silent patching on extension activation with snippet-level V8 verification and automatic `.bak` rollback on any failure.

## [1.1.25] - 2026-10-12

### Fixed
- **Unblocked Subsequent Slash Commands Intellisense:** Removed core parser restriction (`parsedInput.parts.find(instanceof Pm)`) that blocked intellisense completion suggestions for the 2nd, 3rd, and subsequent slash commands in multi-command prompts.

## [1.1.24] - 2026-10-12

### Fixed
- **Permanent Fix for Black Screen Risk:** Completely eliminated dangerous regex overrides on `setDecorationsByType` that caused V8 syntax errors (`SyntaxError: Unexpected identifier '_m'`).
- **Unified 3-Tier Multi-Channel Editor Attachment:** Expanded fallback DOM selectors for `.chat-input-container` and `[class*="interactive-input"]`, ensuring autocomplete popup and purple pill decorations attach reliably on both desktop and laptop environments.
- **Isolated Snippet Validation:** Core patching now strictly validates isolated snippets via `vm.Script` before writing, preventing false positives and black screen lockups.

## [1.1.23] - 2026-10-11

### Added
- **Pure PowerShell Core Patcher (`patch_core.ps1`):** Standalone zero-dependency PowerShell patch script for environments without global Node.js on system PATH.
- **Direct 1-Liner PowerShell Patch:** Single-command offline core bundle patcher for instant terminal recovery.

## [1.1.22] - 2026-10-11

### Fixed
- **Multi-Channel Chat Input Bridge:** Added 3-tier fallback editor discovery (`window.__chatInputEditor`, `window.__allCodeEditors`, and DOM `.__monacoEditor` query) ensuring autocomplete and pill decorations attach immediately across all client environments and profiles.
- **Invariant `addCodeEditor` Lifecycle Hook:** Exposes `window.__codeEditorService=this` and delayed container resolution (`setTimeout`) to resolve input editors created in memory before DOM mounting.

## [1.1.21] - 2026-10-11

### Fixed
- **Restored Terminal Tool Cards:** Fixed overly aggressive CSS and DOM parent-level suppression that accidentally caused running and completed terminal command cards to disappear from the chat response view.

## [1.1.20] - 2026-10-11

### Fixed
- **Auto-Closing Quote Resilience:** Fixed macro token recognition and purple pill highlighting when typing macros with VS Code's automatic quote closing (e.g. `` `fp` ``).
- **Universal `addCodeEditor` Hook:** Replaced brittle constructor pattern with invariant `addCodeEditor` service hook, guaranteeing 100% editor attachment across all VS Code ESM releases.
- **Native Multi-Slash Command Decoration:** Injected native multi-slash decorations directly into core bundle for complete secondary command highlighting.

## [1.1.19] - 2026-10-11

### Fixed
- **Bulletproof Snippet-Level V8 Validation:** Replaced full-bundle classic script parsing with isolated snippet-level V8 compilation and file integrity bounds. Completely eliminates false-positive `Unexpected token 'export'` and `Unexpected token '{'` errors on all modern VS Code ESM builds (such as build `110a328ea5`).

## [1.1.18] - 2026-10-11

### Fixed
- **ESM-Compatible V8 Syntax Validation:** Fixed `Unexpected token 'export'` error during core bundle patching on modern VS Code ESM releases (such as build `110a328ea5`), unblocking Self-Healing daemon and Monaco Chat Input hooks across diverse client machines.

## [1.1.17] - 2026-10-11

### Added
- **Seamless Cloud Vault Sync via GitHub Settings Sync:** Encrypted AES-256-GCM customizations payload (`jarvisEnhancer.cloudVaultPayload`) is automatically synchronized across devices using native VS Code GitHub Settings Sync without manual file transfers.
- **Auto-Detection on New Machines:** Extension automatically detects new vault payloads on startup and prompts for master passphrase to restore the complete environment in one click.
- **New Commands:**
  - `JARVIS: Push Agent Customizations to Cloud (Settings Sync)` (`jarvisEnhancer.pushCloudVault`)
  - `JARVIS: Pull & Restore Agent Customizations from Cloud` (`jarvisEnhancer.pullCloudVault`)

## [1.1.16] - 2026-10-11

### Fixed
- **Cleaned Command Palette Titles:** Removed redundant `"JARVIS: "` prefix from command titles in `package.json`, eliminating the duplicate `"JARVIS: JARVIS:"` display in Command Palette.
- **Full Profile-Aware Extension Deployment:** Ensured all 8 extension commands (including Vault Export/Import) are correctly deployed to custom active profiles.

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
