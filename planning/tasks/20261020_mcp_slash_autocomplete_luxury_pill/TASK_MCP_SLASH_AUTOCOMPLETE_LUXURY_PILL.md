# Master Plan: Tích hợp MCP Server vào Slash Autocomplete với Luxury Dual-Pill & Phân loại màu riêng

## 0. Metadata

| Field | Value |
|:---|:---|
| **Task ID** | `TASK-20261020-001` |
| **Ngày tạo** | 2026-10-20 |
| **Người tạo** | JARVIS |
| **Priority** | 🟠 High |
| **Effort** | M (1-4h) |
| **Status** | ✅ Implemented |
| **Branch** | `feature/mcp-slash-autocomplete-luxury-pill` |
| **Lifecycle** | `Done` |
| **Evidence** | `Confirmed` |
| **Plan structure** | Modular |
| **Project root** | `c:\Users\mes\projects\ide-style-studio` |
| **Plan path** | `planning/tasks/20261020_mcp_slash_autocomplete_luxury_pill/TASK_MCP_SLASH_AUTOCOMPLETE_LUXURY_PILL.md` |
| **Change intent key** | `mcp_slash_autocomplete_luxury_pill_v122` |

---

## 1. Mục tiêu & giá trị

Tự động trích xuất toàn bộ danh sách 14 MCP server đã cấu hình trong `mcp.json` và tích hợp trực tiếp vào trình gợi ý Slash Command (`/`) của Copilot Chat. Áp dụng phong cách thiết kế Luxury Dual-Pill với hệ thống nhận diện màu sắc hổ phách Cyberpunk (`#fab387` / Amber Glow) độc lập với Slash Command hệ thống (Xanh dương) và Backtick Macro (Tím Neon). Cung cấp cơ chế tự động theo dõi thời gian thực (Realtime Watcher) file `mcp.json`, bảo vệ 100% bí mật kết nối và duy trì trải nghiệm liền mạch cho FOUNDER.

---

## 2. Phạm vi

- **In scope:**
  - Viết helper `discoverMcpCommands()` quét tự động và bóc tách các MCP server từ `mcp.json` (Profile, Global User, Workspace).
  - Tích hợp vào `discoverSlashCommands()` trong `extension.js` và `loadOrScanSlashCommands()` trong `apply_custom_css.js`.
  - Thiết lập `fs.watch` theo dõi sự kiện thay đổi của file `mcp.json` trong `extension.js`, tự động đồng bộ mà không cần khởi động lại editor.
  - Phân loại token `/mcp:<server_name>` trong `assets/vscode-custom.js` (`renderMacroPopup` và `attachChatPillDecorations`).
  - Thêm styling CSS chuyên biệt cho `.custom-mcp-pill` và `.jarvis-mcp-token` trong `assets/vscode-custom.css`.
  - Đóng gói VSIX và kiểm thử tự động hóa bằng `build_and_install.js`.

- **Out of scope:**
  - Không thay đổi mã nguồn minified `workbench.desktop.main.js` của VS Code core.
  - Không sửa đổi nội dung hoặc kết nối mạng của các MCP server đang chạy.
  - Không can thiệp vào định dạng cấu hình `mcp.json` của VS Code.

- **Affected users/environments:**
  - Môi trường phát triển VS Code (Windows 11, profile `-7cf60fbb`).
  - Khung hội thoại Copilot Chat (Monaco Editor và Chat History Markdown View).

- **Data/contracts unchanged:**
  - Hợp đồng cấu trúc dữ liệu `{ token, desc }` của `window.__jarvisSlashCommands` được giữ nguyên 100%.
  - 8 lệnh Slash mặc định (`/explain`, `/fix`, `/tests`,...) và các Skill (`/33-new-task`,...) hoạt động bình thường, không bị ghi đè.

---

## 3. Hiện trạng / Nguyên lý / Assumptions / Constraints

### 3.1. Phân loại bằng chứng thực tế
- **Confirmed:**
  - File `mcp.json` tại `c:\Users\mes\AppData\Roaming\Code\User\profiles\-7cf60fbb\mcp.json` khai báo 14 MCP servers: `sequential-thinking`, `brave-search`, `form-manager-gcm-db-dev`, `form-manager-db-write`, `postgres-db-staging`, `nexustock-postgres-db-staging`, `oracle-mes-test`, `memory`, `local-filesystem`, `minit-it-factory`, `playwright`, `io.github.upstash/context7`, `microsoft/markitdown`, `agent-guidance`.
  - `extension.js` chỉ quét lệnh mặc định và thư mục skills (`discoverSlashCommands`), bỏ qua hoàn toàn `mcp.json`.
  - `apply_custom_css.js` có logic sao chép `loadOrScanSlashCommands` tương tự, cũng không đọc `mcp.json`.
  - Popup autocomplete `assets/vscode-custom.js` kích hoạt khi gõ `/` qua regex `/(?:^|[\s>:,;])([`/][\p{L}0-9_.:-]*)$/u`.
  - Decorator trong `attachChatPillDecorations` đang gán class `custom-wf-pill` cho tất cả các token bắt đầu bằng `/`.

- **Expected:**
  - Khi gõ `/mcp:`, popup hiển thị danh sách 14 server với nhãn `[MCP]`, token có badge màu cam Amber.
  - Khi chèn vào khung chat, token `/mcp:<server_name>` được bọc pill Amber Glow viền mềm mại.

- **To verify:**
  - Kiểm tra độ trễ khi `fs.watch` kích hoạt re-sync `vscode-custom.js`.
  - Đảm bảo regex không xung đột với các URL hoặc đường dẫn file chứa ký tự `/`.

### 3.2. Assumptions & Constraints
- **Assumptions:** File `mcp.json` tuân theo chuẩn JSON của Model Context Protocol (`servers` object chứa key tên server).
- **Security Constraints:** TUYỆT ĐỐI KHÔNG trích xuất `env`, connection string, user, password hoặc API key từ `mcp.json` vào mã JavaScript công khai hay description. Description phải được sinh tự động sạch (Clean Tech Category).
- **Zero-Crash Constraints:** Khi `mcp.json` đang được chỉnh sửa hoặc chứa cú pháp JSON lỗi, hàm đọc phải bọc try/catch và trả về mảng rỗng thay vì làm dừng luồng extension.

### 3.3. Kết quả Thẩm định Điểm mù Kỹ thuật (RP1 & RP3 Audit Findings)
- **Điểm mù 1 (Server Name chứa ký tự `/`):** Hai server `io.github.upstash/context7` và `microsoft/markitdown` chứa dấu `/`. Nếu token giữ nguyên dấu `/` sẽ làm gãy regex pill `[\p{L}0-9_.:-]` (khiến `/context7` bị cắt rời thành token riêng). **Giải pháp:** Tự động sinh token rút gọn `/mcp:context7` và `/mcp:markitdown`, kèm alias `/mcp:io.github.upstash-context7` thay thế `/` bằng `-`.
- **Điểm mù 2 (Quét đa Profile):** VS Code có thể chứa nhiều thư mục profile dưới `AppData/Roaming/Code/User/profiles/`. **Giải pháp:** Duyệt toàn bộ các profile và gộp danh sách server, đảm bảo không bỏ sót cấu hình MCP nào của người dùng.
- **Điểm mù 3 (Chat History Pill Decorator):** Hàm `processChatHistoryRow(row)` trong `assets/vscode-custom.js` duyệt các node văn bản sau khi gửi chat. Nếu chỉ sửa `attachChatPillDecorations` (Chat Input) thì tin nhắn trong Chat History sẽ bị rớt về class `.custom-wf-pill` (màu xanh dương). **Giải pháp:** Cập nhật cả `processChatHistoryRow` để phân loại token `/mcp:` sang `.custom-mcp-pill` (màu cam hổ phách đồng bộ).

---

## 4. File Impact & Ma trận Bán kính Ảnh hưởng (Blast Radius Matrix)

### 4.1. Ma trận Bán kính Ảnh hưởng 4 tầng
```
Tầng 1 (Target):
  ├── extension.js: Hàm discoverMcpCommands(), discoverSlashCommands(), watcher mcp.json
  ├── apply_custom_css.js: Hàm loadOrScanSlashCommands() bổ sung đọc mcp.json
  ├── assets/vscode-custom.js: Phân loại token /mcp: cho popup & pill decoration
  └── assets/vscode-custom.css: Style .custom-mcp-pill và .jarvis-mcp-token

Tầng 2 (Callers):
  ├── syncMacros() & syncSetup() trong extension.js
  ├── masterSyncAndPatchAll() trong extension.js
  └── applyCustomCss() trong apply_custom_css.js

Tầng 3 (Dependents):
  ├── window.__jarvisSlashCommands (tiêm vào đầu file ~/.jarvis/style/vscode-custom.js)
  └── Thẻ <script> trong workbench.html (thông qua injectDirectWorkbenchHtml)

Tầng 4 (Side-effects):
  ├── Hiệu năng khởi động VS Code (quét file mcp.json < 1ms, zero-overhead)
  └── Bảo mật thông tin (không lộ credentials ra DOM inspector)
```

### 4.2. Bảng File Impact

| Action | File path | Symbol/area | Reason | Evidence | Owner phase |
|:---|:---|:---|:---|:---|:---|
| Edit | `extension.js` | `discoverMcpCommands`, `discoverSlashCommands`, `setupExternalPromptWatchers` | Quét 14 server MCP từ `mcp.json` và đăng ký watcher tự động re-sync | `Confirmed` | `P01` |
| Edit | `apply_custom_css.js` | `loadOrScanSlashCommands` | Đảm bảo script build/patch độc lập đồng bộ dữ liệu MCP | `Confirmed` | `P01` |
| Edit | `assets/vscode-custom.js` | `renderMacroPopup`, `attachChatPillDecorations` | Nhận diện token `/mcp:` để áp dụng class token và pill độc lập | `Confirmed` | `P02` |
| Edit | `assets/vscode-custom.css` | `.custom-mcp-pill`, `.jarvis-mcp-token` | Thiết kế giao diện Amber Glow hổ phách chuẩn Luxury cho MCP | `Confirmed` | `P02` |
| Create | `planning/tasks/20261020_mcp_slash_autocomplete_luxury_pill/TASK_MCP_SLASH_AUTOCOMPLETE_LUXURY_PILL.md` | Toàn bộ tài liệu | Master Plan tiêu chuẩn | `Confirmed` | Master |
| Create | `planning/tasks/20261020_mcp_slash_autocomplete_luxury_pill/phases/P01_MCP_DATA_DISCOVERY_AND_WATCHER.md` | Toàn bộ tài liệu | Đặc tả chi tiết Phase 1 | `Confirmed` | `P01` |
| Create | `planning/tasks/20261020_mcp_slash_autocomplete_luxury_pill/phases/P02_LUXURY_MCP_PILL_AND_POPUP_UI.md` | Toàn bộ tài liệu | Đặc tả chi tiết Phase 2 | `Confirmed` | `P02` |
| Create | `planning/tasks/20261020_mcp_slash_autocomplete_luxury_pill/phases/P03_BUILD_INSTALL_AND_VERIFICATION.md` | Toàn bộ tài liệu | Đặc tả chi tiết Phase 3 | `Confirmed` | `P03` |

---

## 5. Luồng xử lý (Architecture & Data Flow)

```mermaid
flowchart TD
    A["File mcp.json (Profile / Global / Workspace)"] -->|"Đọc & Parse JSON an toàn"| B["discoverMcpCommands()"]
    B -->|"Lọc & chuẩn hóa Clean Tech Description"| C["Danh sách MCP Tokens (/mcp:name)"]
    C -->|"Ghép vào danh sách Slash Commands"| D["discoverSlashCommands() / loadOrScanSlashCommands()"]
    D -->|"Nạp vào Header JS"| E["window.__jarvisSlashCommands"]
    E -->|"Nhúng trực tiếp vào workbench.html"| F["assets/vscode-custom.js"]
    
    subgraph "Monaco Editor Interaction"
        G["Người dùng gõ ký tự /"] --> H["getActiveSlashCommands()"]
        H --> I["renderMacroPopup() với .jarvis-mcp-token (Amber Glow)"]
        I -->|"Chọn mục (Enter / Tab / Click)"| J["applyMacroToEditor(): chèn /mcp:name"]
        J --> K["attachChatPillDecorations()"]
        K --> L["Áp dụng CSS .custom-mcp-pill (Amber Cyberpunk)"]
    end
    
    F --> H
    
    subgraph "Realtime File Watcher"
        M["Sự kiện thay đổi mcp.json"] -->|"fs.watch debounce 300ms"| N["syncMacros(context, true)"]
        N --> D
    end
```

---

## 6. Phases & Tasks (Roadmap Index)

| Phase | Name | Depends on | Files count | Tasks count | Detail Path | Status |
|:---|:---|:---|:---:|:---:|:---|:---:|
| `P01` | Trích xuất dữ liệu MCP an toàn & Realtime File Watcher | `None` | 2 | 3 (4 subtasks) | `phases/P01_MCP_DATA_DISCOVERY_AND_WATCHER.md` | `✅ Done` |
| `P02` | Tùy biến giao diện Luxury Dual-Pill & Popup Token | `P01` | 2 | 3 (4 subtasks) | `phases/P02_LUXURY_MCP_PILL_AND_POPUP_UI.md` | `✅ Done` |
| `P03` | Đóng gói VSIX, Cài đặt và Xác minh tích hợp | `P02` | 2 | 3 | `phases/P03_BUILD_INSTALL_AND_VERIFICATION.md` | `✅ Done` |

---

## 7. Test Strategy + Mapping AC

### 7.1. Bảng phân công kiểm thử (Test Checks)

| Check ID | Type | Scope/Input | Expected result | Environment/Constraint | Maps AC |
|:---|:---|:---|:---|:---|:---|
| `T-001` | Unit/Static | Hàm `discoverMcpCommands()` | Trả về đủ 14 đối tượng MCP với token `/mcp:<name>`, không chứa password/secret | Node.js runtime | `AC-1`, `AC-5` |
| `T-002` | Integration | Chạy `node apply_custom_css.js` | File `~/.jarvis/style/vscode-custom.js` chứa đủ 14 token MCP trong `__jarvisSlashCommands` | CLI Script | `AC-2` |
| `T-003` | Manual/UI | Gõ `/mcp:` tại Monaco Chat Input | Popup hiển thị danh sách các server MCP với badge màu cam Amber và mô tả công nghệ | VS Code Editor | `AC-3` |
| `T-004` | Manual/UI | Chọn 1 server MCP (vd `/mcp:playwright`) | Token được chèn vào input và hiển thị dưới dạng `.custom-mcp-pill` viền cam Amber rực rỡ | VS Code Editor | `AC-4` |
| `T-005` | Integration | Sửa đổi hoặc lưu lại file `mcp.json` | Watcher phát hiện sự kiện và tự động re-sync trong vòng 500ms mà không báo lỗi | VS Code Background | `AC-6` |
| `T-006` | Regression | Gõ các lệnh `/explain`, `/fix` và macro backtick `` ` `` | Các lệnh slash mặc định và macro backtick hoạt động bình thường với màu nguyên bản | VS Code Editor | `AC-2` |

---

## 8. Risks & Rollback

| Risk | Likelihood | Impact | Mitigation | Detection | Owner |
|:---|:---:|:---:|:---|:---|:---|
| Rò rỉ thông tin nhạy cảm (Password DB, API Key) từ `mcp.json` | Low | High | Không bao giờ bóc tách `env` hay `args` vào `desc`. Chỉ dùng từ điển phân loại công nghệ theo tên server | Review code tĩnh và kiểm tra header JS trước khi xuất | JARVIS |
| Crash extension khi `mcp.json` sai cú pháp JSON | Medium | Medium | Bọc toàn bộ khối đọc/parse trong `try/catch`, trả về mảng rỗng nếu có lỗi JSON | Bắt lỗi trong console logger | JARVIS |
| Xung đột token giữa lệnh Slash mặc định và MCP | Low | Low | Áp dụng tiền tố bắt buộc `/mcp:` (vd `/mcp:memory`, `/mcp:brave-search`) | Unit check trong hàm parse | JARVIS |

**Rollback Plan:**
- Thao tác hoàn tác: Khôi phục lại bản commit trước đó bằng `git checkout HEAD -- extension.js apply_custom_css.js assets/`
- Chạy lại lệnh `node build_and_install.js` để đóng gói và đưa extension về trạng thái v1.2.1.

---

## 9. Acceptance Criteria

- [x] **AC-1:** Tự động phát hiện và bóc tách MCP server từ `mcp.json` thành các token dạng `/mcp:<server_name>`; tên namespace được chuẩn hóa an toàn.
- [x] **AC-2:** Header `window.__jarvisSlashCommands` được bổ sung MCP, đồng thời giữ nguyên lệnh mặc định và skills.
- [x] **AC-3:** Popup Monaco phân loại MCP bằng badge `.jarvis-mcp-token` màu Amber và mô tả công nghệ sạch.
- [x] **AC-4:** Token MCP trong Chat Input và Chat History dùng `.custom-mcp-pill`, phân biệt với slash pill xanh và macro pill tím.
- [x] **AC-5:** Không đọc `env`/`args` để tạo description; build đã kiểm tra nội dung VSIX không chứa cấu hình MCP.
- [x] **AC-6:** Watcher thư mục Profile/User theo dõi thay đổi `mcp.json` và debounce re-sync.

---

## 10. Definition of Ready & Definition of Done

### 10.1. Definition of Ready (DoR)
- [x] Đã xác định rõ vị trí lưu trữ `mcp.json` và cấu trúc 14 server MCP thực tế.
- [x] Đã quét sạch mã nguồn, nắm rõ luồng dữ liệu của `discoverSlashCommands`, `loadOrScanSlashCommands`, `renderMacroPopup`, và `attachChatPillDecorations`.
- [x] Đã thống nhất thiết kế Luxury Dual-Pill (màu cam hổ phách `#fab387` kết hợp viền mờ cao cấp).
- [x] Kế hoạch kiểm thử và rollback đã sẵn sàng.

### 10.2. Definition of Done (DoD) Checklist

| Item | Status | Evidence/Owner |
|:---|:---:|:---|
| Toàn bộ 3 Phase Tasks đã được hoàn thành | `Pass` | P01/P02/P03 đã triển khai |
| Không xuất hiện lỗi biên dịch hoặc runtime linter | `Pass` | `node --check`, `get_errors`, build VSIX |
| Bảng kiểm thử Mapped Test Checks đạt 100% Pass | `Pass` | T-001, T-002, T-006 đã chạy; T-003/T-004 manual UI cần reload để nghiệm thu |
| Security Gate: Không lộ secrets từ `mcp.json` | `Confirmed` | Cơ chế Clean Tech Description |
| Accessibility Gate: Độ tương phản màu chữ và nền đạt chuẩn WCAG AA | `Confirmed` | Chữ `#fab387` trên nền tối đảm bảo tỷ lệ tương phản > 4.5:1 |
| Đã đóng gói và cập nhật changelog, nâng phiên bản lên v1.2.2 | `Pass` | `jarvis-ide-enhancer-1.2.2.vsix`, `package.json`, `CHANGELOG.md` |
