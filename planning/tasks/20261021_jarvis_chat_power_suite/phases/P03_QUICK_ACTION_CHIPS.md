# Phase P03: Quick Action Chips Bar — Hàng nút macro 1 chạm trên Chat

## 1. Phase Metadata

| Field | Value |
|:---|:---|
| **Phase ID** | `P03` |
| **Parent Task ID** | `TASK-20261021-001` |
| **Master Plan** | `../TASK_JARVIS_CHAT_POWER_SUITE.md` |
| **Status** | ✅ Done |
| **Depends on** | `P02` |
| **Lifecycle Owner** | JARVIS / Worker |

---

## 2. Target File Impact (Trích xuất từ Section 4 Master)

| Action | File path | Target Symbol/Area | Reason | Evidence |
|:---|:---|:---|:---|:---|
| Edit | `extension.js` | `registerQuickChipsCommands`, `syncSetup` | Đăng ký setting `jarvisEnhancer.quickChips` và command quản lý CRUD | `Confirmed` |
| Edit | `apply_custom_css.js` | `loadOrScanQuickChips` | Đồng bộ danh sách chip từ setting vào file cache và header script | `Confirmed` |
| Edit | `assets/vscode-custom.js` | `injectQuickActionChips`, `handleChipClick`, `handleChipCrud` | Xây dựng thanh nút chip, nút `+` tương tác và xử lý chuột phải xóa chip | `Confirmed` |
| Edit | `assets/vscode-custom.css` | `.jarvis-quick-chips-bar`, `.jarvis-quick-chip`, `.jarvis-quick-chip-add` | Thiết kế giao diện Cyberpunk Luxury, nút `+` và hiệu ứng hover | `Confirmed` |

---

## 3. Tasks Breakdown

- [x] **Task P03.1: Xây dựng cấu trúc dữ liệu và danh sách Chip Action mặc định**
  - File: `assets/vscode-custom.js`
  - Chi tiết:
    - Định nghĩa danh sách 6 Quick Action Chips phổ biến nhất cho workflow hàng ngày:
      ```javascript
      const JARVIS_QUICK_CHIPS = [
          { label: '⚡ Tiếp tục', token: '`tt', desc: 'Tiếp tục thực thi implementation' },
          { label: '📋 Kế hoạch', token: '`fp', desc: 'Reindex & lập Task Plan 100% không điểm mù' },
          { label: '💡 Gợi ý', token: '`rcm', desc: 'Gợi ý 3 phương án thực thi/sửa lỗi' },
          { label: '🚀 Commit', token: '`git', desc: 'Cập nhật changelog/readme và commit git' },
          { label: '🧪 Test DB', token: '`mtdb', param: '<target>', desc: 'Kiểm thử Oracle DB mes_test' },
          { label: '🧹 Clear', token: '/clear', desc: 'Xóa phiên trò chuyện hiện tại' }
      ];
      ```
    - Viết hàm `handleChipClick(chip)`:
      * Bắt sự kiện `mousedown` trên các button chip và gọi `e.preventDefault()` để ngăn trình duyệt chuyển focus sang button, giữ nguyên 100% focus và caret của Monaco Editor.
      * Focus vào Monaco Chat Editor: `window.__chatInputEditor?.focus()`.
      * Nếu chip là `/clear`: Thực thi xóa sạch hoặc chèn `/clear ` và thông báo sẵn sàng.
      * Nếu chip là macro thông thường: Chèn token vào vị trí con trỏ bằng `executeEdits`.
      * Nếu chip có `param`: Tự động áp dụng cơ chế Tab-Stop từ Phase P02 để bôi đen `<param>` (ví dụ `<target>` trong `` `mtdb <target> ``). Gõ phím là ghi đè ngay lập tức.

- [x] **Task P03.2: Thuật toán neo DOM thanh Quick Action Chips phía trên khung Chat Input**
  - File: `assets/vscode-custom.js`
  - Chi tiết:
    - Tìm anchor container: `.interactive-input-part` hoặc container chứa `.chat-input-editor`.
    - Kiểm tra `document.getElementById('jarvis-quick-chips-bar')` để tránh chèn trùng lặp.
    - Tạo DOM container: `<div class="jarvis-quick-chips-bar" id="jarvis-quick-chips-bar">`
    - Chèn container vào vị trí đầu tiên của `.interactive-input-part` (ngay phía trên Monaco editor).
    - Tạo các phần tử chip con:
      `<button class="jarvis-quick-chip" title="${chip.desc}">${chip.label}</button>`
    - Tích hợp vào hàm `findAndAttachChatEditor()` và chu kỳ MutationObserver để đảm bảo thanh chips luôn xuất hiện khi mở chat hoặc chuyển tab.

- [x] **Task P03.3: Thiết kế CSS Cyberpunk Luxury cho thanh Quick Action Chips**
  - File: `assets/vscode-custom.css`
  - Chi tiết:
    ```css
    .jarvis-quick-chips-bar {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        padding: 4px 8px !important;
        overflow-x: auto !important;
        scrollbar-width: none !important; /* Firefox */
        background: rgba(17, 17, 27, 0.45) !important;
        backdrop-filter: blur(8px) !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-sizing: border-box !important;
    }
    .jarvis-quick-chips-bar::-webkit-scrollbar {
        display: none !important;
    }
    .jarvis-quick-chip {
        display: inline-flex !important;
        align-items: center !important;
        padding: 3px 8px !important;
        border-radius: 12px !important;
        background: rgba(30, 30, 46, 0.7) !important;
        border: 1px solid rgba(137, 180, 250, 0.25) !important;
        color: #cdd6f4 !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        user-select: none !important;
        transition: all 0.15s ease !important;
    }
    .jarvis-quick-chip:hover {
        background: rgba(137, 180, 250, 0.2) !important;
        border-color: rgba(137, 180, 250, 0.6) !important;
        color: #89b4fa !important;
        box-shadow: 0 0 8px rgba(137, 180, 250, 0.3) !important;
        transform: translateY(-1px) !important;
    }
    .jarvis-quick-chip:active {
        transform: translateY(0) !important;
    }
    .jarvis-quick-chip-add {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 22px !important;
        height: 22px !important;
        border-radius: 50% !important;
        background: rgba(30, 30, 46, 0.5) !important;
        border: 1px dashed rgba(137, 180, 250, 0.4) !important;
        color: #89b4fa !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
    }
    .jarvis-quick-chip-add:hover {
        background: rgba(137, 180, 250, 0.25) !important;
        border-style: solid !important;
        box-shadow: 0 0 8px rgba(137, 180, 250, 0.4) !important;
        transform: scale(1.1) !important;
    }
    ```

- [x] **Task P03.4: Xây dựng cơ chế Dynamic CRUD Quick Chips (Settings Sync & 1-Click UI)**
  - Files: `extension.js`, `apply_custom_css.js`, `assets/vscode-custom.js`
  - Chi tiết:
    - **Tầng Cấu hình & Đồng bộ:**
      * Khai báo setting `jarvisEnhancer.quickChips` trong `package.json` với giá trị mặc định là mảng 6 chip.
      * Khi extension khởi chạy hoặc khi user chỉnh sửa `settings.json`, đọc `vscode.workspace.getConfiguration('jarvisEnhancer').get('quickChips')`.
      * Nạp vào header toàn cục: `window.__jarvisQuickChips = [...]`.
      * Lắng nghe `vscode.workspace.onDidChangeConfiguration`: nếu key `jarvisEnhancer.quickChips` thay đổi, tự động cập nhật cache và phát event `window.dispatchEvent(new CustomEvent('jarvis-chips-updated'))`.
    - **Tầng Tương tác 1-Chạm trên UI:**
      * Đăng ký VS Code command: `jarvisEnhancer.manageQuickChips`:
        1. Mở `vscode.window.showQuickPick` với các tùy chọn:
           - `➕ Thêm chip từ Macro có sẵn` (liệt kê danh sách macro từ `discoverMacrosFromRules`).
           - `✏️ Thêm chip tùy chỉnh (Custom Label & Token)` (mở input box nhập nhãn và lệnh).
           - `🗑️ Xóa một chip khỏi thanh bar`.
           - `↺ Khôi phục 6 chip mặc định`.
        2. Lưu kết quả trực tiếp vào `ConfigurationTarget.Global`, tự động kích hoạt Settings Sync giữa các máy.
      * Trong `assets/vscode-custom.js`:
        - Thêm nút `+` (`.jarvis-quick-chip-add`) ở cuối thanh bar:
          Khi click `+`, gọi `window.__commandService.executeCommand('jarvisEnhancer.manageQuickChips')` (tận dụng hook `__commandService` từ Patch 5!).
        - Bắt sự kiện chuột phải `contextmenu` trên từng button chip:
          Ngăn context menu mặc định (`e.preventDefault()`), gọi command `jarvisEnhancer.removeQuickChip` với token tương ứng để xóa ngay lập tức.
        - Lắng nghe event `jarvis-chips-updated` để re-render lại toàn bộ thanh chip mà không cần reload VS Code!

---

## 4. Conditional Quality Gates (Cấp Phase)

- **Security Gate: Passed.**
  - Chỉ chèn các lệnh macro an toàn đã được định nghĩa trong MY_RULE.
- **Data Gate: Not applicable.**
- **Accessibility Gate: Passed.**
  - Các chip sử dụng thẻ `<button>` chuẩn, có đầy đủ `title`, hỗ trợ focus qua phím Tab và kích hoạt bằng phím Enter/Space.
- **Compatibility Gate: Passed.**
  - Thanh chip được đặt làm sibling ngoài `.monaco-editor`, không làm gián đoạn layout hay con trỏ của Monaco.

---

## 5. Phase Rollback (Cục bộ)

- Xóa thanh chip và hoàn tác CSS:
  `git checkout HEAD -- assets/vscode-custom.js assets/vscode-custom.css extension.js apply_custom_css.js`

---

## 6. Phase Verification & DoD Checklist

- **Pre-check (Phase DoR):**
  - [x] Phase P02 đã hoàn tất (cơ chế Tab-Stop selection sẵn sàng).
  - [x] Đã xác định chính xác selector `.interactive-input-part` và hook `window.__commandService`.
- **Execution Verification (Mapped Test Checks):**
  - Check ID: `T-005`, `T-007`
  - Lệnh kiểm tra:
    1. Click vào từng chip trên thanh công cụ và quan sát văn bản được chèn vào Monaco Chat Input.
    2. Bấm nút `+` mở QuickPick thêm chip mới và xác nhận chip mới xuất hiện ngay trên giao diện.
    3. Chuột phải vào chip vừa thêm để xóa và xác nhận chip biến mất ngay lập tức.
- **Post-check (Phase DoD):**
  - [x] Hoàn thành cả 4 tasks P03.1, P03.2, P03.3, P03.4.
  - [x] Thanh chip hiển thị mượt mà, hỗ trợ CRUD 1 chạm đầy đủ, realtime re-render.
  - [x] Đồng bộ trạng thái Phase P03 trong Master Plan thành `Done`.
