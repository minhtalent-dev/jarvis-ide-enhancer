![JARVIS IDE Enhancer Logo](assets/icon.png)

# JARVIS IDE Enhancer

**Bespoke Luxury Visuals & Intelligent Prompt Engineering for VS Code**

[![Version](https://img.shields.io/badge/version-v1.1.47-89b4fa.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-89dceb.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/vscode-%5E1.85.0-74c7ec.svg)](https://code.visualstudio.com/)
[![Architecture](https://img.shields.io/badge/architecture-Zero--Crash-a6e3a1.svg)](#-zero-crash-architecture)

Craft an elite, high-performance workspace for Founders & Developers: 3D Isometric Neon Cursor, signature JARVIS Copilot Chat placeholder with Vietnamese flags, seamless mid-prompt Slash Command Intellisense, and automated zero-crash styling synchronization.

---

## 🌟 Overview

**JARVIS IDE Enhancer** elevates VS Code and GitHub Copilot Chat into an exquisite, high-efficiency development cockpit:

- **Elite Aesthetics:** Soft-glowing 3D Isometric cursor with GPU-accelerated central vector star and elegant national-flag-accented JARVIS placeholder.
- **Accelerated Interaction:** Unlock mid-prompt Slash Command suggestions, visually distinguishing built-in system workflows (Blue Pills) from custom founder macros (Purple Pills).
- **End-to-End Visual Consistency:** Uniform styling across Monaco input editors, queued prompts, chat history bubbles, and inline request editors.
- **Zero-Crash Resilience & Multi-Device Sync:** Safe, non-destructive file operations with V8 AST pre-compilation validation, fully integrated with GitHub Settings Sync across all workstations.

---

## 🚀 Core Features

### 1. 3D Isometric Glowing Cursor & JARVIS Chat Placeholder

- **3D Isometric Neon Cursor:** Smooth `#c084fc` rounded caret with soft ambient bloom, paired with an isometric 3D spatial window housing a central vector star optimized via GPU-accelerated SVG. Unobtrusive to text selection and mouse dragging.
- **JARVIS Ready Chat Placeholder:** When the Copilot chat input is empty, the generic prompt is replaced with a centered, distinguished `JARVIS READY FOR COMMAND` banner accented with Vietnamese national flags. Automatically vanishes instantly on the first keystroke with zero cursor jump.

![3D Isometric Glowing Cursor & JARVIS Chat Placeholder](docs/images/3d-cursor-placeholder.png)

---

### 2. Multi-Prompt Slash Command Intellisense (Blue Pills)

- **Mid-Prompt Slash Suggestions:** Bypass VS Code's restriction that only allows slash commands at the very beginning of a prompt. Trigger intellisense for `/workflow`, `/rule`, `/skill` anywhere after spaces, `>`, colons, or semicolons.
- **Slash Command Blue Pills:** Every slash command token is automatically enclosed in an elegant blue pill badge (`#89b4fa` / `rgba(38, 71, 120, 0.4)`), offering instant visual structure for chained, multi-step workflows.

![Multi-Prompt Slash Command Intellisense](docs/images/slash-command-pills.png)

---

### 3. Custom Backtick Macro Highlighting (Purple Pills)

- **Founder Shortcut Highlighting:** Automatically detects and styles user-defined macro abbreviations (e.g., `` `fp ``, `` `tt ``, `` `wtn ``, `` `rp ``, `` `git ``) with a signature purple glow (`#d8b4fe`, border `rgba(192, 132, 252, 0.45)`, shadow `rgba(168, 85, 247, 0.25)`).
- **Intelligent Tokenizer:** Powered by RegExp Negative Lookahead to ensure standard Markdown inline code blocks (`` `inline code` ``) remain untouched without unwanted styling.

![Custom Backtick Macro Highlighting](docs/images/backtick-macro-pills.png)

---

### 4. Interactive Floating Autocomplete (Slash `/` & Macro `` ` ``)

- **Universal Floating Suggestion Widget:** Typing either a slash (`/`) or backtick (`` ` ``) in the Chat Input editor triggers an instant glassmorphism floating autocomplete popup right at your cursor.
- **Dynamic Skill & Macro Registry:** Automatically discovers and categorizes all 36+ skills and workflows (`.agents/skills`, `.copilot/skills`, `.claude/skills`), built-in slash commands, and founder macro abbreviations with rich descriptions.
- **Keyboard Navigation & Instant Insertion:** Seamlessly navigate suggestions via `ArrowUp` and `ArrowDown`, accept with `Enter` or `Tab`, and dismiss with `Escape`. Selected tokens insert cleanly with trailing space, ready for chaining.
- **Zero-Crash Client Architecture:** 100% pure client-side popup running smoothly without requiring risky modifications to VS Code's core bundle.

---

### 5. Full Lifecycle Consistency (Chat Input, History & Inline Edit)

- **Uniform Lifecycle Styling:** Blue pill styling for Slash Commands and purple pills for Backtick Macros persist across the Monaco Input Editor, queued requests, chat history bubbles, and inline edit sessions.
- **Markdown Backtick Restorer:** Eliminates common Markdown parser issues that strip leading backticks, faithfully rendering exact prompt tokens in conversation bubbles.
- **High-Performance DOM Processing:** Utilizes `MutationObserver` paired with `TreeWalker` targeting text nodes directly (< 0.1ms latency, zero UI jank).

![Full Lifecycle Visual Consistency](docs/images/chat-history-overview.png)

---

### 6. Centered Chat Tables & Streamlined Markdown

- **Centered Data Tables:** Automatically aligns Markdown tables within Copilot Chat responses (`margin: 0 auto; display: table`), transforming technical reports and data matrices into clean dashboards.
- **Decluttered Prompt Formatting:** Strips redundant gray code borders in user prompt bubbles for a modern, sleek appearance.
- **Smooth Continuous Progress Spinner:** Input border animation runs seamlessly during AI generation via `@property --chat-input-anim-angle`, unaffected by OS-level Reduce Motion settings.

---

### 7. Cloud Settings Sync (Multi-Device)

- **Cloud-Backed Personalization:** Extend and customize CSS and JS directly through configuration keys:
  - `jarvisEnhancer.customCSS`: Append or override bespoke CSS rules.
  - `jarvisEnhancer.customJS`: Append or override custom UI scripts.
- **Automatic GitHub Settings Sync:** Settings persist in VS Code `settings.json`, syncing across all developer workstations (desktops, laptops, remote servers) upon GitHub login.
- **Instant Silent Synchronization:** The extension silently mirrors configuration changes into local disk assets (`~/.jarvis/style/`) in real-time.

---

### 8. Automated Self-Healing Patch Daemon

- **Zero-Friction VS Code Update Recovery:** VS Code updates often wipe custom file injections in `workbench.desktop.main.js` and `workbench.html`. The Self-Healing Daemon silently inspects patch integrity upon extension startup.
- **Non-Blocking Background Repair:** Runs with debounced delays to ensure zero impact on editor startup performance, auto-reapplying patches and notifying you with a 1-click Reload prompt.
- **Configurable Daemon Lifecycle:** Easily toggled via `jarvisEnhancer.enableSelfHealing` in VS Code settings.

---

### 9. Macro Auto-Discovery & Settings Sync Engine

- **Automatic Rule Harvesting:** Scans and extracts custom founder macro abbreviations directly from `.instructions.md` rule files across user profiles, global prompts, and open workspaces.
- **GitHub Settings Sync Integration:** Discovered macros are stored in `jarvisEnhancer.customMacros` and automatically synchronized across all machines via GitHub Settings Sync.
- **Live Rule File Watcher:** File watchers observe `.instructions.md` changes and dynamically update macro autocomplete popup registries in real time.

---

### 10. Zero-FOUC Empty Terminal Suppression

- **Hybrid CSS & JS Guard:** Completely eliminates empty rectangular tool/terminal execution boxes in GitHub Copilot Chat when commands run silently without output (e.g. `node --check` or silent scripts).
- **Zero-FOUC (Flash of Unstyled Content):** Leverages Chromium native CSS `:has()` rules to suppress empty execution containers instantaneously without visual jitter.
- **ANSI Escape & Whitespace Sanitization:** Intelligent JS DOM observer strips xterm escape sequences (`\u001b`) and whitespace to reliably distinguish truly silent commands from active logs, preserving 100% visibility for commands with real stdout/stderr and standard Markdown code blocks.

---

### 11. JARVIS Hybrid Vault Manager (Agent Customizations Sync)

- **Complete Agent Ecosystem Export & Restore:** Back up and restore all 5 agent customization pillars across machines: 13 MCP Servers (`mcp.json`, `settings.json`), 36 Skills (`~/.agents/skills/`, `~/.copilot/skills/`, `~/.claude/skills/`), 6 Prompts & Rules, 5 Custom Model Providers (`chatLanguageModels.json`), and custom styling assets.
- **AES-256-GCM Military-Grade Encryption:** Protect your private API keys, database connection strings, and secure tunnels behind a single Master Passphrase with scrypt KDF and Gzip compression (`.jarvis-vault`).
- **Zero-Leak Sanitized Template:** Automatically redacts sensitive passwords, credentials, and machine-bound paths with cross-platform tokenization (`${userHome}`, `${mcpStorage}`) for safe sharing and public version control.
- **Automated SecretStorage & Profile Binding:** Intelligently discovers active profiles and seamlessly restores credentials to native VS Code SecretStorage (`context.secrets`) on target devices.

---

### 12. GitHub Cloud Settings Sync Integration

- **Zero-File Cloud Synchronization:** Encrypts and compresses all agent customizations into an armored AES-256-GCM payload stored directly within VS Code application configuration (`jarvisEnhancer.cloudVaultPayload`), syncing silently across machines through native GitHub Settings Sync.
- **Auto-Detection on Target Devices:** Extension observes incoming cloud payloads upon VS Code startup, notifying the user and offering one-click interactive restoration with master passphrase verification.
- **End-to-End Key Security:** Passphrases are never synced or cached; decryption occurs entirely in-memory on the target machine with cross-platform path adaptation.

---

### 13. Unlocked Microsoft Native Prompt Timeline (Gutter & Ruler)

- **Unlocked Native Gutter Timeline:** Unlocks Microsoft's native prompt timeline (`sessions.chatTimeline.display: "gutter"`), providing an elegant vertical track of minimalist 4px dots along the left margin of Copilot Chat with zero interference with text selection.
- **Glassmorphism Preview Card:** Hovering any dot displays a frosted-glass question preview popup (`backdrop-filter: blur(20px)`), with turn timestamps, query titles, and diff review actions.
- **Balanced Margin & Anti-Clipping:** Perfectly balances left and right padding (`12px`) across chat response containers, eliminating awkward whitespace while ensuring prompts never collide with gutter dots.
- **Automated Update-Proof AST Patching:** Structural AST matching automatically adapts to internal compiler name mangling across minor and major VS Code updates.

---

## 🛠️ Setup & Usage

### Prerequisites

Install the official stylesheet loader: [Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css) (`be5invis.vscode-custom-css`).

### Quick Start (One-Click Master Restore)

1. **Install Extension:** Install `JARVIS IDE Enhancer` from a packaged `.vsix` file or extension marketplace.
2. **One-Click Master Restore:**
   - Open Command Palette (`Ctrl+Shift+P` on Windows/Linux or `Cmd+Shift+P` on macOS).
   - Run: **`JARVIS: Master Sync & Patch All (One-Click Restore)`**.
   - The master controller automatically synchronizes all 24+ macros, compiles 3D cursor styling, unlocks all 7 core bundle patches, injects `workbench.html`, and purges stale V8 bytecode cache in under 1.5s.
3. **Restart VS Code:**
   - Close all open VS Code windows and reopen (or execute `Developer: Reload Window`).

### Terminal One-Liner (After VS Code Updates)

Whenever VS Code updates and wipes patches, simply run this one-liner in terminal:

```bash
node patch_all.js
# Or via global task: Ctrl+Shift+P -> Tasks: Run Task -> ⚡ Patch Chat Slash Intellisense
```

---

## ⌨️ Available Commands

| Command Title (Command Palette) | Command ID | Description |
|:---|:---|:---|
| `JARVIS: Master Sync & Patch All (One-Click Restore)` | `jarvisEnhancer.masterRestore` | **All-in-one:** Syncs styles, extracts macros, patches all core bundles, injects HTML, and purges V8 cache. |
| `JARVIS: Discover Macros & Sync Settings` | `jarvisEnhancer.discoverMacros` | Scans `.instructions.md` rule files, extracts custom macro abbreviations, and syncs them to global settings and cloud sync. |
| `JARVIS: Edit Custom CSS` | `jarvisEnhancer.editCSS` | Directly opens `~/.jarvis/style/vscode-custom.css` in editor for live styling adjustments. |
| `JARVIS: Edit Custom JS` | `jarvisEnhancer.editJS` | Directly opens `~/.jarvis/style/vscode-custom.js` in editor for UI script enhancements. |
| `JARVIS: Export Agent Customizations Vault` | `jarvisEnhancer.exportVault` | Bundles and exports MCP servers, skills, prompts, models, and styles into an encrypted vault or sanitized template. |
| `JARVIS: Import Agent Customizations Vault` | `jarvisEnhancer.importVault` | Restores agent customizations from a `.jarvis-vault` package or template, auto-rehydrating paths and secrets. |
| `JARVIS: Push Agent Customizations to Cloud (Settings Sync)` | `jarvisEnhancer.pushCloudVault` | Encrypts complete agent customizations and publishes payload to GitHub Settings Sync for seamless multi-device replication. |
| `JARVIS: Pull & Restore Agent Customizations from Cloud` | `jarvisEnhancer.pullCloudVault` | Pulls synchronized vault payload from cloud settings, prompts for passphrase, and restores environment. |

---

## 📂 File Structure

```text
~/.jarvis/style/
├── vscode-custom.css    # Bundled CSS stylesheets: 3D cursor, placeholder, and pill badges
└── vscode-custom.js     # Bundled JS client bridge: Monaco hook, tokenizer, and history observer
```

Extension repository structure:
```text
ide-style-studio/
├── assets/
│   ├── icon.png                 # Official JARVIS IDE Enhancer icon
│   ├── vscode-custom.css        # Packaged source CSS
│   └── vscode-custom.js         # Packaged source JS
├── docs/
│   └── images/                  # High-resolution feature documentation screenshots
├── apply_custom_css.js          # Dynamic workbench.html injector with mtime sorting
├── apply_workbench_patch.js     # 7-layer structural AST patcher for VS Code core bundle
├── extension.js                 # Primary extension controller with Master Restore and Self-Healing
├── package.json                 # Extension manifest declaring commands, settings, and metadata
└── patch_all.js                 # One-click master restore runner for terminal & tasks
```

---

## 🛡️ Zero-Crash Architecture

`JARVIS IDE Enhancer` is engineered with defensive design principles:

1. **Process Isolation:**
   - The Extension Host runs in an isolated Node.js worker, never injecting unverified code directly into the renderer DOM.
   - Styling injection is delegated to the proven architecture of `be5invis.vscode-custom-css`.
2. **Non-Destructive Backups:**
   - Prior to modifying core bundle files (`workbench.desktop.main.js`), an exact `.bak` snapshot is automatically generated.
3. **Pre-Write V8 AST Syntax Verification:**
   - All patched payloads must pass AST compilation via Node.js `vm.Script`. If any syntax error or corrupt structure is detected, file writes abort immediately, eliminating black screens or broken installations.
4. **Resource Guarding & Anti-Leak Safeguards:**
   - Observers (`MutationObserver`, `TreeWalker`) employ guard flags (`__historyDecorated`) and targeted scope selectors, ensuring zero memory leaks and negligible CPU overhead.

---

## 📄 License

Licensed under the [MIT License](LICENSE). Free for personal and commercial development.



