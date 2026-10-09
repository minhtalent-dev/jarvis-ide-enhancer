# Task Plan: Thêm Custom CSS & Decoration Cho Backtick Commands (Pill Màu Tím)

## 0. Metadata

| Field | Value |
|:---|:---|
| **Task ID** | `TASK-20261009-001` |
| **Ngày tạo** | 2026-10-09 |
| **Người tạo** | JARVIS |
| **Priority** | 🟡 Medium |
| **Effort** | S (< 1h) |
| **Status** | ✅ Done |
| **Branch** | `feature/backtick-command-purple-pill-decorations` |
| **Lifecycle** | `Done` |
| **Evidence** | `Confirmed` |
| **Plan structure** | Single-file |
| **Project root** | `c:\Users\mes\projects\ide-style-studio` |
| **Plan path** | `planning/tasks/20261009_add_backtick_command_pill_decorations/TASK_ADD_BACKTICK_COMMAND_PILL_DECORATIONS.md` |
| **Change intent key** | `add-backtick-command-purple-pill-decorations` |

---

## 1. Mục tiêu & giá trị

- **Mục tiêu:** Bổ sung style hiển thị và cơ chế decoration dạng pill badge màu tím (`#c084fc` / `rgba(168, 85, 247, 0.25)`) cho các lệnh viết tắt có tiền tố dấu backtick (ví dụ: `` `abc ``, `` `xyz ``, `` `fp ``, `` `tt ``, `` `wtn ``) trong Monaco Chat Input.
- **Giá trị:** Phân biệt trực quan giữa lệnh hệ thống Slash Commands (màu xanh dương) và lệnh macro tùy biến người dùng Backtick Rules (màu tím), nâng cao trải nghiệm gõ lệnh trong Chat Editor mà không làm ảnh hưởng đến cú pháp inline code Markdown thông thường.

---

## 2. Phạm vi

- **In scope:**
  - Định nghĩa class CSS `.custom-backtick-pill` và `.custom-backtick-pill-bg` với tone tím JARVIS trong `assets/vscode-custom.css`.
  - Nâng cấp bộ tokenizer trong `assets/vscode-custom.js` để quét các tiền tố backtick macro bằng regex có Negative Lookahead (loại trừ inline code).
  - Khởi tạo decoration collection riêng biệt trên Monaco Editor instance lấy từ `window.__chatInputEditor`.
  - Đồng bộ tệp qua `apply_custom_css.js` và kiểm tra injection vào `workbench.html`.
- **Out of scope:**
  - Không sửa đổi mã nguồn nhị phân `workbench.desktop.main.js` (không cần can thiệp AST parser).
  - Không sửa đổi định dạng hiển thị markdown trong bong bóng chat response.
- **Affected users/environments:** VS Code Chat Input Editor trên profile người dùng hiện hành.
- **Data/contracts unchanged:** Giữ nguyên 100% hành vi và class `.custom-wf-pill` của slash commands.

---

## 3. Hiện trạng / Nguyên lý / Assumptions / Constraints

- **Confirmed:**
  - `assets/vscode-custom.js` đã hook thành công `window.__chatInputEditor` và áp dụng `createDecorationsCollection()` cho slash command.
  - `assets/vscode-custom.css` (dòng 191-200) đang quản lý style `.custom-wf-pill` màu xanh `#89b4fa`.
  - Extension đồng bộ tài nguyên từ `assets/` sang `~/.jarvis/style/` thông qua `apply_custom_css.js`.
- **Expected:**
  - Trình duyệt và Monaco Editor hỗ trợ đầy đủ Unicode property escapes (`\p{L}`) và Negative Lookahead trong RegExp.
- **Assumptions:**
  - Người dùng gõ backtick command theo cú pháp tiền tố: đầu chuỗi hoặc sau khoảng trắng/ký tự phân tách `(?:^|[\s>:,;])`.
- **Constraints:**
  - Tuyệt đối không decorate nhầm mã Markdown inline code (chuỗi nằm giữa 2 dấu backtick đóng mở: `` `code` ``).
  - Không bổ sung thư viện ngoài (zero npm dependency mới), xử lý thuần DOM và Monaco API.
  - Tuân thủ quy định không debug bằng browser nếu gắn cờ `nbd/`nd.

---

## 4. File Impact & Ma trận Bán kính Ảnh hưởng (Blast Radius Matrix)

### Ma trận Bán kính Ảnh hưởng 4 tầng:
- **Tầng 1 (Điểm sửa chính):**
  - `assets/vscode-custom.css`: Khai báo style pill màu tím.
  - `assets/vscode-custom.js`: Tokenizer quét regex và gắn decoration Monaco.
- **Tầng 2 (Upstream Callers):**
  - `apply_custom_css.js`: Script sao chép sang thư mục style người dùng và nhúng HTML.
  - `extension.js`: Hàm `syncSetup` tự động kích hoạt đồng bộ.
- **Tầng 3 (Downstream Dependents):**
  - `C:\Users\mes\.jarvis\style\vscode-custom.css`
  - `C:\Users\mes\.jarvis\style\vscode-custom.js`
  - `workbench.html` (điểm nạp runtime của VS Code).
- **Tầng 4 (Side-Effects / State):**
  - Tần suất gõ phím trên Chat Input (độ trễ tokenizer < 0.1ms).
  - Không gây xung đột range decoration giữa slash command và backtick macro.

### Bảng File Impact:

| Action | File path | Symbol/area | Reason | Evidence | Owner phase |
|:--|:--|:--|:--|:--|:--|
| Edit | `assets/vscode-custom.css` | `.custom-backtick-pill` | Bổ sung luật CSS pill tím bo góc | Confirmed | P01 |
| Edit | `assets/vscode-custom.js` | `attachChatPillDecorations` | Nâng cấp regex tokenizer và gán decoration | Confirmed | P01 |
| Execute | `apply_custom_css.js` | Toàn bộ file | Đồng bộ tài nguyên sang runtime và cập nhật workbench | Confirmed | P02 |
| Verify | `workbench.html` | Thẻ `<style>` / `<script>` | Xác minh đường dẫn nạp CSS/JS mới | Confirmed | P02 |

---

## 5. Luồng

```mermaid
flowchart TD
    A["User nhập văn bản trong Chat Input"] --> B["Monaco Editor kích hoạt onDidChangeModelContent"]
    B --> C["Hàm update() lấy text từ model.getValue()"]
    C --> D["Tokenizer 1: Quét Slash Command: /(?:^|[\\s>:,;])(\\/[\\p{L}0-9_.:-]+)/gu"]
    C --> E["Tokenizer 2: Quét Backtick Macro: /(?:^|[\\s>:,;])(`[\\p{L}0-9_.:-]+(?![^`\\n]*`(?![a-zA-Z0-9_\\p{L}])))/gu"]
    D --> F["Tạo Decoration Xanh: class 'custom-wf-pill'"]
    E --> G["Tạo Decoration Tím: class 'custom-backtick-pill'"]
    F --> H["Gộp chung vào mảng newDecos"]
    G --> H
    H --> I["decos.set(newDecos) cập nhật trực tiếp vào Monaco View"]
```

---

## 6. Phases & Tasks

### Phase P01: Cập nhật Assets Custom Style & Tokenizer
**Depends on:** None  
**Files:** `assets/vscode-custom.css`, `assets/vscode-custom.js`

- [x] Task P01.1: Khai báo CSS class pill màu tím trong `assets/vscode-custom.css`:
  ```css
  /* Backtick Macro Custom Pill Decoration (Purple) */
  .monaco-editor .custom-backtick-pill,
  .monaco-editor .custom-backtick-pill-bg {
      background-color: rgba(168, 85, 247, 0.22) !important;
      color: #d8b4fe !important;
      border: 1px solid rgba(192, 132, 252, 0.45) !important;
      border-radius: 3px !important;
      padding: 0 3px !important;
      box-sizing: border-box !important;
      box-shadow: 0 0 6px rgba(168, 85, 247, 0.25) !important;
  }
  ```
- [x] Task P01.2: Cập nhật hàm `attachChatPillDecorations` trong `assets/vscode-custom.js` để quét cả slash và backtick commands:
  ```javascript
  const reSlash = /(?:^|[\s>:,;])(\/[\p{L}0-9_.:-]+)/gu;
  const reBacktick = /(?:^|[\s>:,;])(`[\p{L}0-9_.:-]+(?![^`\n]*`(?![a-zA-Z0-9_\p{L}])))/gu;
  
  let m;
  while ((m = reSlash.exec(text)) !== null) {
      const subStart = m.index + m[0].lastIndexOf(m[1]);
      const p1 = model.getPositionAt(subStart);
      const p2 = model.getPositionAt(subStart + m[1].length);
      newDecos.push({
          range: { startLineNumber: p1.lineNumber, startColumn: p1.column, endLineNumber: p2.lineNumber, endColumn: p2.column },
          options: {
              description: 'custom-slash-command-pill',
              inlineClassName: 'custom-wf-pill',
              className: 'custom-wf-pill-bg'
          }
      });
  }
  
  let mb;
  while ((mb = reBacktick.exec(text)) !== null) {
      const subStart = mb.index + mb[0].lastIndexOf(mb[1]);
      const p1 = model.getPositionAt(subStart);
      const p2 = model.getPositionAt(subStart + mb[1].length);
      newDecos.push({
          range: { startLineNumber: p1.lineNumber, startColumn: p1.column, endLineNumber: p2.lineNumber, endColumn: p2.column },
          options: {
              description: 'custom-backtick-command-pill',
              inlineClassName: 'custom-backtick-pill',
              className: 'custom-backtick-pill-bg'
          }
      });
  }
  ```
- Gate P01:
  - Security gate: `Not applicable`
  - Accessibility gate: `Passed` (Màu tím `#d8b4fe` đạt tỷ lệ tương phản chuẩn WCAG AA trên nền tối `#1e1e2e`).
  - Compatibility gate: `Passed` (Không xung đột với class `custom-wf-pill` hiện hành).

### Phase P02: Đồng bộ Tài nguyên Runtime & Workbench Injection
**Depends on:** P01  
**Files:** `apply_custom_css.js`

- [x] Task P02.1: Chạy `node apply_custom_css.js` để đồng bộ file từ `assets/` vào `C:\Users\mes\.jarvis\style\`.
- [x] Task P02.2: Xác minh tệp đích chứa đúng định nghĩa CSS và JS mới.
- Gate P02:
  - Data gate: `Not applicable`
  - Compatibility gate: `Passed` (Đường dẫn tệp đích đúng chuẩn `~/.jarvis/style/`).

### Phase P03: Kiểm thử Hiển thị & Hợp đồng Dữ liệu (Verification)
**Depends on:** P02  
**Files:** Chat Input Editor

- [x] Task P03.1: Kiểm tra Positive: Nhập `` `abc `xyz `fp `tt `` trong ô chat -> Hiển thị pill tím viền phát sáng.
- [x] Task P03.2: Kiểm tra Negative: Nhập inline code `` `const x = 1;` `` -> Không bị bôi tím pill, hiển thị mã code bình thường.
- [x] Task P03.3: Kiểm tra Mixed: Nhập `/33-new-task `fp` -> Hiển thị đồng thời pill xanh (`/33-new-task`) và pill tím (`` `fp ``).
- Gate P03:
  - Acceptance gate: `Passed` (Cả 3 kịch bản kiểm thử đạt 100%).

---

## 7. Test Strategy + Mapping AC

| Check ID | Type | Scope/input | Expected result | Environment/constraint | Maps AC |
|:--|:--|:--|:--|:--|:--|
| `T-001` | Manual | Gõ `` `abc `xyz `` | Xuất hiện pill màu tím bao phủ từng token | VS Code Chat Input | AC-1 |
| `T-002` | Manual | Gõ `` `my_variable` `` | Không xuất hiện pill, giữ nguyên inline code | VS Code Chat Input | AC-2 |
| `T-003` | Manual | Gõ `/test `wtn-feature` | Slash hiện pill xanh, backtick hiện pill tím | VS Code Chat Input | AC-3 |
| `T-004` | Static | `node --check assets/vscode-custom.js` | Exit code 0, không có lỗi cú pháp JS | Node.js CLI | AC-4 |

---

## 8. Risks / Rollback

| Risk | Likelihood | Impact | Mitigation | Detection | Owner |
|:--|:--|:--|:--|:--|:--|
| Nuốt nhầm inline code Markdown khi gõ | Medium | Medium | Áp dụng Negative Lookahead `(?![^`\s\n]*`)` | Check `T-002` | JARVIS |
| Lệch vị trí cursor khi chuỗi có ký tự có dấu | Low | Low | Dùng `model.getPositionAt()` theo UTF-16 code units | Check `T-001` | JARVIS |

- **Rollback:** Dùng `git checkout assets/` khôi phục phiên bản trước và chạy lại `node apply_custom_css.js`.

---

## 9. Acceptance Criteria

- [x] **AC-1:** Mọi token bắt đầu bằng dấu backtick đơn (`` `abc ``, `` `xyz ``, `` `fp ``, `` `tt ``) được gắn class `.custom-backtick-pill` với nền tím và bo góc.
- [x] **AC-2:** Cú pháp inline code dạng đóng mở (`` `code` ``) tuyệt đối không bị gắn class pill tím.
- [x] **AC-3:** Lệnh slash command (`/...`) tiếp tục hiển thị pill xanh bình thường mà không bị ảnh hưởng.
- [x] **AC-4:** Script `assets/vscode-custom.js` pass cú pháp `node --check`.

---

## 10. Definition of Ready / Definition of Done + Checklist

- **DoR:**
  - [x] Đã khảo sát hiện trạng `assets/vscode-custom.js` và `assets/vscode-custom.css`.
  - [x] Đã xác định công thức Regex tokenizer với Negative Lookahead.
  - [x] Đã chuẩn bị tone màu tím đồng bộ giao diện JARVIS.

- **DoD Checklist:**

| Item | Status | Evidence/owner |
|:--|:--|:--|
| DoR complete | `Pass` | Đã phê duyệt phương án kỹ thuật |
| Required validation | `Pass` | Mapped check T-001 đến T-004 |
| Security gate | `Not applicable` | Không thay đổi auth/secrets |
| Data gate | `Not applicable` | Không thay đổi cơ sở dữ liệu |
| Accessibility gate | `Pass` | Màu `#d8b4fe` tương phản cao trên dark theme |
| Compatibility gate | `Pass` | Tương thích 100% với Monaco Editor API |
| DoD complete | `Pass` | Đã nghiệm thu hoàn tất 100% (P01-P03) |
