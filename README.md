# JARVIS IDE Enhancer

Enhance your VS Code and Copilot Chat workspace with luxury isometric 3D cursors, streamlined chat styles, multi-prompt slash command intellisense, and automated styling synchronization.

## Features

- **3D Isometric Glowing Cursor**: Modern, glowing purple cursor with a centered 3D vector star.
- **JARVIS Ready Chat Placeholder**: Custom Vietnamese flag placeholder for the Copilot chat input.
- **Multi-Prompt Slash Intellisense**: Trigger slash commands (`/workflow`, `/rule`, `/skill`) anywhere in your chat prompt after spaces or `>`.
- **Automatic Slash Command Pill Highlighting**: Clean visual pill badges for secondary workflow commands in the chat input.
- **Centered Chat Tables & Streamlined Markdown**: Perfectly centered tables and reset inline code pills in chat responses.
- **Zero-Crash Architecture**: Safe, atomic style synchronization and patch verification via V8 compilation check.

## Commands

- `JARVIS: Sync Setup & Apply Styles`: Automatically extracts bundled assets to your user profile and registers them in Custom CSS & JS Loader.
- `JARVIS: Patch Chat Slash Intellisense`: Safely patches VS Code bundle to unlock multi-prompt slash command suggestions and pill highlighting.
- `JARVIS: Edit Custom CSS`: Directly opens `~/.jarvis/style/vscode-custom.css` in editor for quick styling customization.
- `JARVIS: Edit Custom JS`: Directly opens `~/.jarvis/style/vscode-custom.js` in editor for customization.

## Configuration Files

The custom style and script files are located at:
- **CSS Styles**: `~/.jarvis/style/vscode-custom.css`
- **JS Script**: `~/.jarvis/style/vscode-custom.js`

You can edit them directly anytime via the commands above, then run `Reload Custom CSS and JS` to apply your changes.

## Cloud Settings Sync (Multi-Device)

Nhập CSS/JS trực tiếp vào setting `jarvisEnhancer.customCSS` và `jarvisEnhancer.customJS` trong VS Code Settings:
- Các cấu hình này được **GitHub Settings Sync** tự động đưa lên cloud và sync sang mọi máy tính của user.
- Mọi thiết bị khác chỉ cần đăng nhập tài khoản GitHub là nhận được trọn vẹn style và script cá nhân.
- Khi thay đổi setting, extension sẽ tự động ghi đè và đồng bộ sang file đĩa (`~/.jarvis/style/`) ngay lập tức trong chế độ silent.

## Requirements

Requires the [Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css) extension to inject the custom stylesheet.

## License

MIT License.

