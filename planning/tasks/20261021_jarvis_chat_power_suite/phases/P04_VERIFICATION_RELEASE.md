# Phase P04: Kiểm thử tích hợp E2E, Đóng gói VSIX & Phát hành

## 1. Phase Metadata

| Field | Value |
|:---|:---|
| **Phase ID** | `P04` |
| **Parent Task ID** | `TASK-20261021-001` |
| **Master Plan** | `../TASK_JARVIS_CHAT_POWER_SUITE.md` |
| **Status** | 📋 Planning |
| **Depends on** | `P01, P02, P03` |
| **Lifecycle Owner** | JARVIS / Worker |

---

## 2. Target File Impact (Trích xuất từ Section 4 Master)

| Action | File path | Target Symbol/Area | Reason | Evidence |
|:---|:---|:---|:---|:---|
| Create | `test/chat-power-suite.test.js` | Toàn bộ file | Unit checks cho macro param parser và HUD context counter | `Expected` |
| Edit | `package.json` | `version` | Nâng phiên bản lên v1.3.0 | `Confirmed` |
| Edit | `README.md` | Badge & Tính năng | Cập nhật tài liệu bộ tính năng JARVIS Chat Power Suite | `Confirmed` |
| Edit | `CHANGELOG.md` | `## [1.3.0]` | Ghi nhận 3 tính năng mới theo chuẩn ngôn ngữ end-user | `Confirmed` |
| Run | `build_and_install.js` | Toàn bộ script | Đóng gói VSIX và cài đặt vào VS Code | `Confirmed` |

---

## 3. Tasks Breakdown

- [ ] **Task P04.1: Xây dựng bộ kiểm thử tự động `test/chat-power-suite.test.js`**
  - File: `test/chat-power-suite.test.js`
  - Chi tiết:
    - Sử dụng `node:test` và `node:assert/strict` (không cài thêm dependency bên ngoài).
    - Viết các ca kiểm thử:
      1. Kiểm tra parser `discoverMacrosFromRules()`: trích xuất chính xác `param` từ các chuỗi `- \`wtn <name>:`, `- \`mtdb <target>:`.
      2. Kiểm tra hàm tính toán `calculateContextWeight(turns)`:
         - `turns = 5` -> `Light 🟢`
         - `turns = 16` -> `Medium 🟡`
         - `turns = 22` -> `Critical 🔴`
      3. Kiểm tra tính toàn vẹn của danh sách Quick Chips (đầy đủ các token chuẩn, fallback khi setting rỗng).
      4. Kiểm tra CRUD helper functions (thêm, xóa, reset chip).
    - Lệnh chạy: `node --test test/chat-power-suite.test.js`.

- [ ] **Task P04.2: Cập nhật tài liệu phiên bản và đóng gói VSIX**
  - Files: `package.json`, `README.md`, `CHANGELOG.md`
  - Chi tiết:
    - Bumper version từ `1.2.3` lên `1.3.0` (Minor version mới vì bổ sung bộ 3 tính năng lớn).
    - Cập nhật mục `[1.3.0] - 2026-10-21` trong `CHANGELOG.md`:
      * Live Chat HUD: Đếm lượt đàm thoại và tải trọng ngữ cảnh thời gian thực.
      * Macro Snippet & Tab-Stop: Tự động bôi đen tham số mẫu khi chọn lệnh.
      * Quick Action Chips: Hàng nút macro 1 chạm trên khung chat kèm CRUD tùy biến linh hoạt.
    - Cập nhật badge phiên bản trong `README.md`.
    - Chạy `node build_and_install.js` để đóng gói `jarvis-ide-enhancer-1.3.0.vsix` và cài đặt tự động.

- [ ] **Task P04.3: Kiểm thử thủ công trên VS Code Editor và nghiệm thu toàn diện**
  - File: VS Code Runtime
  - Chi tiết:
    - Nhấn `Ctrl+Shift+P` -> `Reload Window`.
    - Mở khung Copilot Chat và xác nhận:
      1. Badge HUD `🟢 X/20 | Light` hiển thị tại góc dưới input.
      2. Hàng Quick Action Chips xuất hiện phía trên khung soạn thảo.
      3. Bấm vào chip `🧪 Test DB` hoặc gõ `` `wtn ``: text được chèn và placeholder `<...>` được bôi đen sẵn sàng gõ đè.
      4. Bấm vào chip `` `tt ``: điền `` `tt `` vào khung chat.
      5. Bấm nút `+` trên thanh chip: QuickPick hiện ra cho phép chọn macro thêm vào thanh bar, thanh bar re-render tức thì.
      6. Chuột phải vào một chip: xác nhận xóa chip thành công.
    - Kiểm tra `get_errors` toàn bộ dự án sạch 100%.

---

## 4. Conditional Quality Gates (Cấp Phase)

- **Security Gate: Passed.**
  - Không có thông tin nhạy cảm nào bị đưa vào mã nguồn đóng gói.
- **Data Gate: Not applicable.**
- **Accessibility Gate: Passed.**
- **Compatibility Gate: Passed.**
  - Tương thích ngược với mọi cấu hình và phiên bản VS Code 1.85.0+.

---

## 5. Phase Rollback (Cục bộ)

- Nếu bản đóng gói gặp sự cố, cài lại phiên bản v1.2.3:
  `code --install-extension jarvis-ide-enhancer-1.2.3.vsix --force`

---

## 6. Phase Verification & DoD Checklist

- **Pre-check (Phase DoR):**
  - [x] Cả 3 Phase P01, P02, P03 đã hoàn thành mã nguồn.
- **Execution Verification (Mapped Test Checks):**
  - Check ID: `T-001`, `T-002`, `T-006`, `T-007`
  - Lệnh kiểm tra:
    ```bash
    node --test test/chat-power-suite.test.js
    node build_and_install.js
    ```
- **Post-check (Phase DoD):**
  - [ ] Bộ test đạt 100% Pass.
  - [ ] Đóng gói và cài đặt extension thành công.
  - [ ] Đồng bộ trạng thái Phase P04 trong Master Plan thành `Done`.
  - [ ] Chuyển trạng thái Master Plan sang `Implemented`.
