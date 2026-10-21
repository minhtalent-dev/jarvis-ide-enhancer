# Phase P01: Live Chat HUD — Bộ đếm Turn & Context Weight thời gian thực

## 1. Phase Metadata

| Field | Value |
|:---|:---|
| **Phase ID** | `P01` |
| **Parent Task ID** | `TASK-20261021-001` |
| **Master Plan** | `../TASK_JARVIS_CHAT_POWER_SUITE.md` |
| **Status** | ✅ Done |
| **Depends on** | `None` |
| **Lifecycle Owner** | JARVIS / Worker |

---

## 2. Target File Impact (Trích xuất từ Section 4 Master)

| Action | File path | Target Symbol/Area | Reason | Evidence |
|:---|:---|:---|:---|:---|
| Edit | `assets/vscode-custom.js` | Module `LiveChatHUD`, `renderLiveChatHud`, `updateTurnCounter` | Xây dựng logic đếm turn và cập nhật widget HUD | `Confirmed` |
| Edit | `assets/vscode-custom.css` | `.jarvis-chat-hud-badge`, `.hud-indicator-dot` | Thiết kế Glassmorphism badge và hiệu ứng màu sắc | `Confirmed` |

---

## 3. Tasks Breakdown

- [x] **Task P01.1: Xây dựng thuật toán đếm Turn chống ảo hóa (Virtualization-Resistant Counter)**
  - File: `assets/vscode-custom.js`
  - Chi tiết:
    - Tạo đối tượng quản lý trạng thái phiên: `window.__jarvisSessionTurnMap = new WeakMap();` (gắn trực tiếp với DOM node `.interactive-session` tránh rò rỉ bộ nhớ khi đóng/mở chat).
    - Viết hàm `countSessionTurns(sessionEl)`:
      * Lấy hoặc khởi tạo state của session: `let state = window.__jarvisSessionTurnMap.get(sessionEl) || { maxTurns: 0 };`
      * Quét toàn bộ các request row hiện có:
        ```javascript
        const requestNodes = sessionEl.querySelectorAll(
            '.interactive-request, .chat-item.request, .monaco-list-row.request, [data-index].request, .chat-row.request, .chat-request'
        );
        ```
      * Thuật toán Monotonic Turn Counter: Tìm `highestIndex` từ thuộc tính `data-index` của các row tìm thấy.
        Số lượt đàm thoại được chốt bằng giá trị lớn nhất từng thấy trong phiên:
        `state.maxTurns = Math.max(state.maxTurns, requestNodes.length, highestIndex + 1);`
        `window.__jarvisSessionTurnMap.set(sessionEl, state);`
      * Tính toán phân loại tải trọng Context (Context Weight) theo MY_RULE #21:
        - `turns < 15`: Trạng thái `🟢 Light` (màu xanh lá `#a6e3a1`)
        - `15 <= turns < 20`: Trạng thái `🟡 Medium` (màu vàng `#f9e2af`)
        - `turns >= 20`: Trạng thái `🔴 Critical` (màu đỏ `#f38ba8`)
    - Code snippet minh họa:
      ```javascript
      function calculateContextWeight(turns) {
          if (turns >= 20) return { label: 'Critical', color: '#f38ba8', dot: '🔴' };
          if (turns >= 15) return { label: 'Medium', color: '#f9e2af', dot: '🟡' };
          return { label: 'Light', color: '#a6e3a1', dot: '🟢' };
      }
      ```

- [x] **Task P01.2: Neo và render HUD Badge tại chân khung Chat Input**
  - File: `assets/vscode-custom.js`
  - Chi tiết:
    - Tìm anchor container: Vùng footer của input box cạnh các nút chọn Model / Target / Permission:
      `const footer = document.querySelector('.chat-input-picker-item, .chat-session-target-picker-item')?.parentElement || document.querySelector('.interactive-input-part');`
    - Tạo phần tử HUD: `<div class="jarvis-chat-hud-badge" id="jarvis-chat-hud-badge">`
      * Nội dung: `<span class="hud-dot">🟢</span> <span class="hud-text">1/20</span> <span class="hud-separator">|</span> <span class="hud-weight">Light</span>`
      * Thuộc tính `title`: "Lượt trò chuyện trong phiên hiện tại. Khi vượt ngưỡng 20, bấm để mở New Local Chat nhằm bảo vệ Context Window."
    - Đăng ký `MutationObserver` lắng nghe khi có request mới xuất hiện trong session, gọi `debouncedUpdateHud()`.

- [x] **Task P01.3: Tích hợp hành động click mở New Local Chat và CSS Styling**
  - Files: `assets/vscode-custom.js`, `assets/vscode-custom.css`
  - Chi tiết:
    - Khi người dùng click vào HUD Badge:
      * Nếu `turns >= 20`: Tự động gọi `handleNewLocalChatClick()` (tái sử dụng action từ v1.2.1) để tạo ngay phiên chat mới với quyền tự động Allow all.
      * Nếu `turns < 20`: Hiển thị tooltip thông báo "Context vẫn tối ưu (Light)".
    - Định nghĩa CSS trong `assets/vscode-custom.css`:
      ```css
      .jarvis-chat-hud-badge {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 2px 8px !important;
          border-radius: 12px !important;
          background: rgba(24, 24, 37, 0.65) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(137, 180, 250, 0.25) !important;
          font-size: 11px !important;
          font-family: var(--vscode-editor-font-family, monospace) !important;
          color: #cdd6f4 !important;
          cursor: pointer !important;
          user-select: none !important;
          transition: all 0.2s ease !important;
      }
      .jarvis-chat-hud-badge:hover {
          border-color: rgba(137, 180, 250, 0.6) !important;
          box-shadow: 0 0 10px rgba(137, 180, 250, 0.25) !important;
          transform: translateY(-1px) !important;
      }
      ```

---

## 4. Conditional Quality Gates (Cấp Phase)

- **Security Gate: Passed.**
  - Chỉ đếm số lượng node DOM, không đọc nội dung tin nhắn hay dữ liệu nhạy cảm của người dùng.
- **Data Gate: Not applicable.**
- **Accessibility Gate: Passed.**
  - Màu chữ `#cdd6f4` và màu trạng thái (`#a6e3a1`, `#f9e2af`, `#f38ba8`) đạt tỷ lệ tương phản WCAG AA trên nền tối.
- **Compatibility Gate: Passed.**
  - Dùng cờ `id="jarvis-chat-hud-badge"` tránh chèn trùng lặp; layout flexbox co giãn không đè lên các nút gốc của VS Code.

---

## 5. Phase Rollback (Cục bộ)

- Nếu HUD gây lỗi layout, revert các thay đổi của Phase P01:
  `git checkout HEAD -- assets/vscode-custom.js assets/vscode-custom.css`

---

## 6. Phase Verification & DoD Checklist

- **Pre-check (Phase DoR):**
  - [x] Đã khảo sát các selector của request chat và footer input container.
- **Execution Verification (Mapped Test Checks):**
  - Check ID: `T-002`, `T-003`
  - Lệnh kiểm tra: Mở khung Chat và kiểm tra sự xuất hiện của badge `🟢 1/20 | Light`.
- **Post-check (Phase DoD):**
  - [x] Hoàn thành cả 3 tasks P01.1, P01.2, P01.3.
  - [x] HUD badge hiển thị đúng màu và số turn thực tế.
  - [x] Đồng bộ trạng thái Phase P01 trong Master Plan thành `Done`.
