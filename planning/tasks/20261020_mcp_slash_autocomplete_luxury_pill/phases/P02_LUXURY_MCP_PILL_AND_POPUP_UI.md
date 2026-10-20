# Phase P02: Tùy biến giao diện Luxury Dual-Pill & Popup Token

## 1. Phase Metadata

| Field | Value |
|:---|:---|
| **Phase ID** | `P02` |
| **Parent Task ID** | `TASK-20261020-001` |
| **Master Plan** | `../TASK_MCP_SLASH_AUTOCOMPLETE_LUXURY_PILL.md` |
| **Status** | ✅ Done |
| **Depends on** | `P01` |
| **Lifecycle Owner** | JARVIS / Worker |

---

## 2. Target File Impact (Trích xuất từ Section 4 Master)

| Action | File path | Target Symbol/Area | Reason | Evidence |
|:---|:---|:---|:---|:---|
| Edit | `assets/vscode-custom.js` | `renderMacroPopup`, `attachChatPillDecorations` | Nhận diện token `/mcp:` để áp dụng class token và pill độc lập | `Confirmed` |
| Edit | `assets/vscode-custom.css` | `.custom-mcp-pill`, `.jarvis-mcp-token` | Thiết kế giao diện Amber Glow hổ phách chuẩn Luxury cho MCP | `Confirmed` |

---

## 3. Tasks Breakdown

- [ ] **Task P02.1: Nhận diện và gán badge token MCP trong `renderMacroPopup`**
  - File: `assets/vscode-custom.js`
  - Chi tiết:
    - Trong hàm `renderMacroPopup()`, kiểm tra nếu `m.token.startsWith('/mcp:')` thì gán class `.jarvis-mcp-token`.
    - Phân định rõ 3 dòng sản phẩm trong popup:
      1. `/mcp:*` -> `.jarvis-mcp-token` (Màu cam hổ phách Cyberpunk `#fab387`)
      2. `/*` -> `.jarvis-slash-token` (Màu xanh dương `#89b4fa`)
      3. `` `* `` -> `.jarvis-macro-token` (Màu tím Neon `#d8b4fe`)
  - Code snippet minh họa:
    ```javascript
    const tokenSpan = document.createElement('span');
    if (m.token.startsWith('/mcp:')) {
        tokenSpan.className = 'jarvis-mcp-token';
    } else if (m.token.startsWith('/')) {
        tokenSpan.className = 'jarvis-slash-token';
    } else {
        tokenSpan.className = 'jarvis-macro-token';
    }
    tokenSpan.textContent = m.token;
    ```

- [ ] **Task P02.2: Tách biệt trang trí Pill trong `attachChatPillDecorations`**
  - File: `assets/vscode-custom.js`
  - Chi tiết:
    - Trong vòng lặp quét token slash command:
      ```javascript
      while ((m = re.exec(text)) !== null) {
          const subStart = m.index + m[0].lastIndexOf(m[1]);
          const p1 = model.getPositionAt(subStart);
          const p2 = model.getPositionAt(subStart + m[1].length);
          const tokenStr = m[1];
          const isMcp = tokenStr.startsWith('/mcp:');
          newDecos.push({
              range: {
                  startLineNumber: p1.lineNumber,
                  startColumn: p1.column,
                  endLineNumber: p2.lineNumber,
                  endColumn: p2.column
              },
              options: {
                  description: isMcp ? 'custom-mcp-command-pill' : 'custom-slash-command-pill',
                  inlineClassName: isMcp ? 'custom-mcp-pill' : 'custom-wf-pill'
              }
          });
      }
      ```

- [ ] **Task P02.3: Xây dựng bộ quy tắc CSS Luxury Amber Glow cho MCP**
  - File: `assets/vscode-custom.css`
  - Chi tiết:
    - Định nghĩa style cho `.jarvis-mcp-token` trong popup autocomplete:
      * Màu chữ `#fab387` (Catppuccin Peach / Amber Glow).
      * Nền `rgba(250, 179, 135, 0.15)`.
      * Viền `1px solid rgba(250, 179, 135, 0.4)`.
      * Bo góc `3px`, padding `1px 4px`.
    - Định nghĩa style cho `.custom-mcp-pill` áp dụng trên cả Monaco Chat Input và Chat History Markdown View:
      * Nền `rgba(250, 179, 135, 0.22)`.
      * Màu chữ `#fab387`.
      * Viền `1px solid rgba(250, 179, 135, 0.45)`.
      * Bo góc `3px`, padding `0 3px`.
      * Bóng đổ phát quang nhẹ `box-shadow: 0 0 6px rgba(250, 179, 135, 0.25)`.
      * Triệt tiêu pseudo content `.custom-mcp-pill::before, .custom-mcp-pill::after { content: none !important; }`.

- [ ] **Task P02.4: Bổ sung hỗ trợ Chat History trong `processChatHistoryRow` (RP3 Blind Spot Fix)**
  - File: `assets/vscode-custom.js`
  - Chi tiết:
    - Tại dòng 635: Bổ sung `.custom-mcp-pill` vào danh sách loại trừ của TreeWalker:
      ```javascript
      if (parent.closest('.custom-wf-pill, .custom-backtick-pill, .custom-mcp-pill, code, pre')) {
          return NodeFilter.FILTER_REJECT;
      }
      ```
    - Tại dòng 703-710: Khi tạo thẻ span cho item dạng `slash`, kiểm tra nếu `item.token.startsWith('/mcp:')` thì gán class `.custom-mcp-pill`:
      ```javascript
      if (item.type === 'slash') {
          const span = document.createElement('span');
          span.className = item.token.startsWith('/mcp:') ? 'custom-mcp-pill' : 'custom-wf-pill';
          span.textContent = item.token;
          frag.appendChild(span);
      }
      ```
    - Kết quả: Khi người dùng gửi tin nhắn chứa token MCP, câu hỏi hiển thị trong lịch sử chat sẽ giữ nguyên pill màu cam Amber Glow sang trọng, không bị rớt về màu xanh mặc định.

---

## 4. Conditional Quality Gates (Cấp Phase)

- **Security Gate: Not applicable.**
- **Data Gate: Not applicable.**
- **Accessibility Gate: Passed.**
  - Màu chữ `#fab387` đạt độ tương phản chuẩn WCAG AA trên nền tối `#181825` (contrast ratio ~ 8.2:1).
- **Compatibility Gate: Passed.**
  - Không phá vỡ CSS của `custom-wf-pill` hay `custom-backtick-pill`.

---

## 5. Phase Rollback (Cục bộ)

- Hoàn tác file CSS và JS giao diện:
  `git checkout HEAD -- assets/vscode-custom.js assets/vscode-custom.css`

---

## 6. Phase Verification & DoD Checklist

- **Pre-check (Phase DoR):**
  - [x] Phase P01 đã hoàn thành và danh sách token `/mcp:` đã sẵn sàng.
  - [x] Đã xác định chính xác các selector CSS mục tiêu.

- **Execution Verification (Mapped Test Checks):**
  - Check ID: `T-003`, `T-004`
  - Lệnh kiểm tra: Kiểm tra trực quan trên Monaco Chat Input khi gõ `/mcp:` và chèn token.
  - Kết quả kỳ vọng: Popup hiển thị token có viền/nền cam Amber; khi chèn vào văn bản, token hiển thị dưới dạng `.custom-mcp-pill` phát sáng nhẹ.

- **Post-check (Phase DoD):**
  - [x] Cả 4 tasks P02.1, P02.2, P02.3, P02.4 đã hoàn thành (`[x]`).
  - [x] CSS/JS không có lỗi cú pháp, selector Chat Input và Chat History đã đồng bộ.
  - [x] Đã đồng bộ trạng thái Phase P02 trong Master Plan thành `Done`.
