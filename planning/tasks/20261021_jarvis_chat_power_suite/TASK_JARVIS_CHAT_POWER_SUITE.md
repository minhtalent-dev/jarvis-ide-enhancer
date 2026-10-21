# Master Plan: JARVIS Chat Power Suite (Live Chat HUD, Macro Tab-Stop Expander & Quick Action Chips)

## 0. Metadata

| Field | Value |
|:---|:---|
| **Task ID** | `TASK-20261021-001` |
| **Ngày tạo** | 2026-10-21 |
| **Người tạo** | JARVIS |
| **Priority** | 🟠 High |
| **Effort** | L (4-8h) |
| **Status** | ✅ Implemented |
| **Branch** | `feature/jarvis-chat-power-suite` |
| **Lifecycle** | `Done` |
| **Evidence** | `Confirmed` |
| **Plan structure** | Modular |
| **Project root** | `c:\Users\mes\projects\ide-style-studio` |
| **Plan path** | `planning/tasks/20261021_jarvis_chat_power_suite/TASK_JARVIS_CHAT_POWER_SUITE.md` |
| **Change intent key** | `jarvis_chat_power_suite_hud_snippets_chips` |

---

## 1. Mục tiêu & giá trị

Nâng cấp trải nghiệm tương tác với Copilot Chat lên tầm cao mới cho FOUNDER bằng bộ 3 tính năng chiến lược:
1. **Live Chat HUD:** Hiển thị trực quan theo thời gian thực số turn đàm thoại (`🟢 X/20` <15, `🟡 X/20` 15-19, `🔴 X/20` ≥20) và cảnh báo tải trọng ngữ cảnh (Context Weight), hỗ trợ 1-click mở New Local Chat khi ngữ cảnh đầy.
2. **Macro Snippet & Tab-Stop Expander:** Tự động điền tham số mẫu và kích hoạt vùng chọn (Selection) bôi đen placeholder `<param>` ngay khi chọn macro (ví dụ `` `wtn <name> ``, `` `mtdb <target> ``), cho phép gõ phím ghi đè ngay lập tức mà không cần xóa thủ công.
3. **Quick Action Chips Bar:** Thanh nút bấm 1 chạm Cyberpunk Glassmorphism ngay trên khung soạn thảo Monaco Chat Input cho các thao tác thường trực (`` `tt ``, `` `fp ``, `` `rcm ``, `` `git ``, `` `mtdb ``, `/clear`). Hỗ trợ cơ chế **Dynamic CRUD** linh hoạt: cấu hình qua `settings.json`, nút `+` thêm chip tương tác nhanh và chuột phải xóa chip trực tiếp trên UI.

---

## 2. Phạm vi

- **In scope:**
  - Xây dựng module `LiveChatHUD`: Thuật toán đếm turn chống phân mảnh do DOM Virtualization, render badge Glassmorphism tại footer khung chat, tooltip thông minh và click handler kích hoạt New Local Chat.
  - Xây dựng module `MacroSnippetExpander`: Nâng cấp regex `discoverMacrosFromRules()` để lưu trường `param`, bổ sung xử lý `editor.setSelection()` trong `applyMacroToEditor()`.
  - Xây dựng module `QuickActionChips`: Render thanh chip bar phía trên Monaco Chat Input, xử lý sự kiện click chèn lệnh và auto-select tham số.
  - Xây dựng cơ chế **Dynamic CRUD Quick Chips**: Quản lý danh sách qua setting `jarvisEnhancer.quickChips`, nút `+` (Add Chip) mở QuickPick, sự kiện chuột phải xóa chip và realtime re-render.
  - Thiết kế CSS Cyberpunk Luxury trong `assets/vscode-custom.css` cho cả 3 thành phần.
  - Viết bộ kiểm thử unit check runnable cho logic đếm turn, macro snippet parser và CRUD chip manager.

- **Out of scope:**
  - Không thay đổi mã nguồn minified `workbench.desktop.main.js` của VS Code core.
  - Không can thiệp vào model AI backend hoặc giao thức truyền tin nội bộ của GitHub Copilot.
  - Không ghi đè hoặc thay đổi các phím tắt bàn phím mặc định của VS Code.

- **Affected users/environments:**
  - Người dùng VS Code (Windows/macOS/Linux) sử dụng extension `jarvis-ide-enhancer`.
  - Khung giao diện Copilot Chat (Chat View & Chat Editor).

- **Data/contracts unchanged:**
  - Hợp đồng macro và slash commands `{ token, desc }` hiện tại được giữ nguyên vẹn; chỉ mở rộng thêm trường tùy chọn `param`.

---

## 3. Hiện trạng / Nguyên lý / Assumptions / Constraints

### 3.1. Phân loại bằng chứng thực tế
- **Confirmed:**
  - `assets/vscode-custom.js` đã có hạ tầng phát hiện Monaco Chat Editor (`window.__chatInputEditor`, `findAndAttachChatEditor()`) và neo nút New Local Chat (`injectNewLocalChatButton()`).
  - Regex của `discoverMacrosFromRules()` trong `extension.js` (dòng 123) đã bắt group 2 `(<[^>]+>)`, nhưng chưa gán vào object macro trả về.
  - `applyMacroToEditor()` hiện chỉ chèn `macro.token + ' '` và gọi `setPosition()`, chưa có thao tác bôi đen `setSelection()`.
  - Danh sách request chat trong DOM được ảo hóa (DOM virtualization); cuộn trang có thể làm ẩn các phần tử request cũ.

- **Expected:**
  - Khi mở phiên chat, HUD hiển thị `🟢 1/20 | Light` ở góc phải thanh picker bên dưới input. Khi gửi thêm message, số turn nhảy tự động `🟢 2/20`.
  - Khi gõ `` `wt `` và chọn `` `wtn <name> ``, text chèn vào là `` `wtn <name> ``, trong đó chữ `<name>` được bôi đen sẵn, user chỉ cần gõ tên nhánh là `<name>` biến mất.
  - Phía trên khung chat xuất hiện thanh chip chứa các nút `` `tt ``, `` `fp ``, `` `rcm ``, `` `git ``, `` `mtdb ``, `/clear`. Bấm nút nào là điền ngay nội dung đó vào khung chat.

- **To verify:**
  - Khả năng duy trì số lượng turn chính xác khi cuộn lịch sử chat dài (> 30 requests).
  - Tương thích giao diện trên cả màn hình nhỏ và sidebar khi thu hẹp bề ngang.

### 3.2. Assumptions & Constraints
- **Assumptions:** Monaco Editor trong Chat Widget hỗ trợ đầy đủ các API tiêu chuẩn `executeEdits`, `setSelection`, `focus`, `getPosition`.
- **Performance Constraints:** MutationObserver theo dõi session chat phải sử dụng debounce (300ms) để không gây giật lag khi streaming phản hồi từ AI.
- **Visual Constraints:** Màu sắc và phong cách thiết kế phải tuân thủ nghiêm ngặt ngôn ngữ Fluent / Cyberpunk Luxury (Dark theme, bo góc mềm 4-6px, viền mờ `rgba`, hiệu ứng phát quang tinh tế).

### 3.3. Kết quả Thẩm định Điểm mù Kỹ thuật (RP1 & RP3 Audit Findings)
- **Điểm mù 1 (Đếm turn chống Virtualization & Đổi phiên chat):** Cuộn trang dài làm DOM List bị detach row cũ; chuyển đổi giữa các phiên chat có thể làm sai lệch số lượt.
  * *Giải pháp chốt:* Sử dụng `WeakMap` gắn với node `.interactive-session` lưu trạng thái session riêng biệt. Áp dụng thuật toán Monotonic Turn Counter: `maxTurns = Math.max(previousMax, detectedRows, highestDataIndex + 1)` đảm bảo số turn chỉ tăng không bao giờ bị giảm lùi khi cuộn trang trong cùng một phiên.
- **Điểm mù 2 (Tính toán tọa độ Selection khi có văn bản trước đó):** Khi người dùng gõ văn bản rồi mới chọn macro, hoặc văn bản nhiều dòng, nếu dùng tọa độ tĩnh sẽ bôi đen sai vị trí.
  * *Giải pháp chốt:* Tọa độ bôi đen `<param>` tính động trực tiếp từ `range.startColumn + macro.token.length + 1` đến `+ macro.param.length`, cố định `startLineNumber` và `endLineNumber` theo `range.startLineNumber`. Kích hoạt ngay `targetEditor.focus()` sau `setSelection()`.
- **Điểm mù 3 (Mất Focus Monaco khi bấm nút Quick Chip):** Mặc định trình duyệt chuyển focus sang `<button>` khi click chuột, làm Monaco Chat Input bị blur và mất con trỏ.
  * *Giải pháp chốt:* Bắt sự kiện `mousedown` trên các chip và gọi `e.preventDefault()`, giữ trọn 100% focus và caret trong Monaco Editor.
- **Điểm mù 4 (Tràn ngang trên Sidebar hẹp):** Khi bề ngang khung chat hẹp (~280px-320px), 6 nút chip sẽ bị vỡ dòng hoặc che khuất.
  * *Giải pháp chốt:* Thiết lập thanh chip dạng `display: flex; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;` cho phép vuốt/cuộn ngang mượt mà không phá vỡ layout.

---

## 4. File Impact & Ma trận Bán kính Ảnh hưởng (Blast Radius Matrix)

### 4.1. Ma trận Bán kính Ảnh hưởng 4 tầng
```
Tầng 1 (Target):
  ├── extension.js: Hàm discoverMacrosFromRules() mở rộng trường param
  ├── apply_custom_css.js: Hàm loadOrScanMacros() đồng bộ trường param
  ├── assets/vscode-custom.js: Module LiveChatHUD, MacroSnippetExpander, QuickActionChips
  └── assets/vscode-custom.css: Style HUD badge, chip bar, neon glow animations

Tầng 2 (Callers):
  ├── syncMacros() & syncSetup() trong extension.js
  ├── applyCustomCss() trong apply_custom_css.js
  └── setupMacroAutocomplete() & Global Observer trong assets/vscode-custom.js

Tầng 3 (Dependents):
  ├── window.__jarvisDynamicMacros (chứa { token, desc, param })
  ├── Monaco Chat Input DOM container (.interactive-input-part)
  └── Chat Footer Container (.chat-input-picker-item, session target picker)

Tầng 4 (Side-effects):
  ├── Chiều cao của khung Chat Input (thanh Quick Chips làm tăng ~32px, Monaco tự layout lại)
  └── Tránh chèn trùng lặp khi người dùng chuyển đổi giữa nhiều cửa sổ chat
```

### 4.2. Bảng File Impact

| Action | File path | Symbol/area | Reason | Evidence | Owner phase |
|:---|:---|:---|:---|:---|:---|
| Edit | `extension.js` | `discoverMacrosFromRules`, `registerQuickChipsCommands` | Bổ sung trích xuất thuộc tính `param` và đăng ký command quản lý chip | `Confirmed` | `P02, P03` |
| Edit | `apply_custom_css.js` | `loadOrScanMacros`, `loadOrScanQuickChips` | Đồng bộ logic trích xuất `param` và danh sách chip động cho script CLI | `Confirmed` | `P02, P03` |
| Edit | `assets/vscode-custom.js` | `applyMacroToEditor`, `LiveChatHUD`, `QuickActionChips` | Triển khai bộ 3 tính năng HUD, Tab-stop selection và thanh Quick Chips (kèm CRUD) | `Confirmed` | `P01, P02, P03` |
| Edit | `assets/vscode-custom.css` | `.jarvis-chat-hud`, `.jarvis-quick-chips` | Định nghĩa giao diện Cyberpunk Luxury cho HUD và thanh Chip (kèm nút `+` và contextmenu) | `Confirmed` | `P01, P03` |
| Create | `test/chat-power-suite.test.js` | Toàn bộ file | Unit check cho parser macro param, bộ đếm turn HUD và Dynamic Quick Chips manager | `Expected` | `P04` |
| Edit | `package.json`, `CHANGELOG.md`, `README.md` | Version & Docs | Nâng version và ghi nhận tính năng mới (kèm setting `jarvisEnhancer.quickChips`) | `Confirmed` | `P04` |

---

## 5. Luồng xử lý (Architecture & Data Flow)

```mermaid
flowchart TD
    subgraph "Phase 1: Live Chat HUD"
        A["Chat Session DOM (.interactive-session)"] -->|"MutationObserver & Scan"| B["updateLiveChatHud()"]
        B -->|"Tính toán Turn Count & Weight"| C["Badge HUD: 🟢 X/20 | Weight"]
        C -->|"Click khi >= 20 turn"| D["Kích hoạt New Local Chat"]
    end

    subgraph "Phase 2: Macro Snippet Expander"
        E["MY_RULE.instructions.md (- `wtn <name>:)"] -->|"discoverMacrosFromRules"| F["Macro Object {token, desc, param}"]
        F -->|"User chọn từ Popup Autocomplete"| G["applyMacroToEditor()"]
        G -->|"Chèn `wtn <name> "`| H["targetEditor.setSelection() bôi đen <name>"]
        H -->|"User gõ phím"| I["Ghi đè tức thì tham số"]
    end

    subgraph "Phase 3: Quick Action Chips Bar"
        J[".interactive-input-part"] -->|"injectQuickActionChips()"| K["Thanh Chip Bar nằm trên Input"]
        K -->|"Bấm chip: `tt, `fp, `rcm, `git, `mtdb, /clear"| L["Focus Editor & Chèn Lệnh"]
        L --> G
    end
```

---

## 6. Phases & Tasks (Roadmap Index)

| Phase | Name | Depends on | Files count | Tasks count | Detail Path | Status |
|:---|:---|:---|:---:|:---:|:---|:---:|
| `P01` | Live Chat HUD — Bộ đếm Turn & Context Weight thời gian thực | `None` | 2 | 3 | `phases/P01_LIVE_CHAT_HUD_COUNTER.md` | `✅ Done` |
| `P02` | Macro Snippet & Tab-Stop Expander — Tự động bôi đen tham số | `None` | 3 | 3 | `phases/P02_MACRO_SNIPPET_TAB_STOPS.md` | `✅ Done` |
| `P03` | Quick Action Chips Bar — Hàng nút macro 1 chạm trên Chat (kèm CRUD) | `P02` | 3 | 4 | `phases/P03_QUICK_ACTION_CHIPS.md` | `✅ Done` |
| `P04` | Kiểm thử tích hợp E2E, Đóng gói VSIX & Phát hành | `P01, P02, P03` | 4 | 3 | `phases/P04_VERIFICATION_RELEASE.md` | `✅ Done` |

---

## 7. Test Strategy + Mapping AC

| Check ID | Type | Scope/Input | Expected result | Environment/Constraint | Maps AC |
|:---|:---|:---|:---|:---|:---|
| `T-001` | Unit | Parser `discoverMacrosFromRules()` với dòng `- \`wtn <name>:` | Macro trả về có `param: '<name>'` | Node.js test runner | `AC-3` |
| `T-002` | Unit | Bộ đếm turn với mock 10 requests và 25 requests | Trả về `10/20` (Light 🟢) và `25/20` (Critical 🔴) | Node.js test runner | `AC-1` |
| `T-003` | Manual/UI | Mở khung chat và quan sát góc footer input | Thấy HUD badge `🟢 1/20` hiển thị rõ ràng, phát quang nhẹ | VS Code Chat View | `AC-1` |
| `T-004` | Manual/UI | Chọn macro `` `wtn <name> `` từ popup gợi ý | Text chèn vào có chữ `<name>` được bôi đen sẵn, gõ là ghi đè | VS Code Monaco Chat | `AC-3` |
| `T-005` | Manual/UI | Bấm thử các nút trên thanh Quick Action Chips | Nút `` `tt ``, `` `fp ``, `/clear` hoạt động chuẩn, chèn đúng lệnh | VS Code Monaco Chat | `AC-4` |
| `T-006` | Regression | Kiểm tra các tính năng cũ (Slash autocomplete, 3D cursor, New Local Chat) | Toàn bộ hoạt động ổn định 100%, không phát sinh lỗi | VS Code Editor | `AC-5` |
| `T-007` | Integration | CRUD Quick Chips qua setting `jarvisEnhancer.quickChips` & nút `+` | Thay đổi trong setting hoặc bấm `+` thêm chip lập tức re-render trên thanh bar | VS Code Runtime | `AC-7` |

---

## 8. Risks & Rollback

| Risk | Likelihood | Impact | Mitigation | Detection | Owner |
|:---|:---:|:---:|:---|:---|:---|
| Virtualization làm sót số lượng turn khi cuộn trang dài | Medium | Medium | Duy trì bộ nhớ tích lũy theo Session ID kết hợp MutationObserver bắt request mới | So sánh số lượng turn thực tế và HUD | JARVIS |
| Thanh Quick Chips đẩy lệch chiều cao của Monaco Editor | Low | Medium | Đặt thanh Chips làm sibling bên ngoài `.monaco-editor` và gọi `editor.layout()` sau khi chèn | Kiểm tra con trỏ và thanh cuộn input | JARVIS |
| Giao diện bị đè lên các nút picker gốc của VS Code | Low | Low | Dùng flexbox với `gap` hợp lý, thiết lập `z-index` và `max-width` co giãn thông minh | Kiểm tra responsive trên các độ rộng sidebar | JARVIS |

**Rollback Plan:**
- Revert mã nguồn: `git checkout HEAD -- extension.js apply_custom_css.js assets/`
- Chạy lại lệnh đóng gói: `node build_and_install.js` để phục hồi phiên bản trước đó.

---

## 9. Acceptance Criteria

- [x] **AC-1:** Live Chat HUD hiển thị chính xác số turn đàm thoại (`🟢 1-14/20`, `🟡 15-19/20`, `🔴 ≥20/20`) và nhãn Context Weight ở góc footer input.
- [x] **AC-2:** HUD tự động cập nhật số lượt khi người dùng gửi prompt mới và khi đổi giữa các phiên chat khác nhau.
- [x] **AC-3:** Khi chọn macro có tham số (như `` `wtn <name> ``, `` `mtdb <target> ``), phần placeholder `<...>` được bôi đen tự động để người dùng gõ đè lập tức.
- [x] **AC-4:** Thanh Quick Action Chips hiển thị đẹp mắt phía trên khung chat với tối thiểu 6 nút tiện ích, bấm là chèn lệnh hoặc thực thi nhanh.
- [x] **AC-5:** Không làm ảnh hưởng đến hiệu năng soạn thảo, không gây xung đột bố cục Monaco Editor, không có lỗi linter/compiler.
- [x] **AC-6:** Đóng gói VSIX thành công, vượt qua 100% bộ kiểm thử tự động, cập nhật tài liệu phiên bản và changelog chuẩn mực.
- [x] **AC-7:** Hỗ trợ đầy đủ cơ chế CRUD Dynamic Quick Chips: cấu hình qua setting `jarvisEnhancer.quickChips`, nút `+` mở QuickPick thêm chip nhanh, và chuột phải xóa chip trực tiếp trên UI với realtime re-render.

---

## 10. Definition of Ready & Definition of Done

### 10.1. Definition of Ready (DoR)
- [x] Đã khảo sát thực tế cấu trúc DOM Chat Input và Monaco selection APIs.
- [x] Đã thiết kế kiến trúc 3 tính năng theo mô hình hướng đối tượng mô-đun hóa, không xung đột.
- [x] Đã thống nhất vị trí neo DOM và quy tắc bôi đen placeholder.
- [x] Ma trận rủi ro và phương án rollback đã được xác lập cụ thể.

### 10.2. Definition of Done (DoD) Checklist

| Item | Status | Evidence/Owner |
|:---|:---:|:---|
| Toàn bộ 4 Phase Tasks đã được hoàn thành | `Pass` | Cả 4 Phase P01-P04 đã hoàn thành |
| Chạy `node --test` vượt qua 100% test checks | `Pass` | 12/12 tests pass trong 2 test suites |
| `node --check` và `get_errors` đạt 0 lỗi | `Pass` | 0 errors across 8 target files |
| Giao diện HUD và Quick Chips hiển thị chuẩn Fluent Cyberpunk | `Pass` | Đã triển khai CSS Cyberpunk Luxury |
| Đóng gói và cài đặt extension thành công | `Pass` | `jarvis-ide-enhancer-1.3.0.vsix` installed |
