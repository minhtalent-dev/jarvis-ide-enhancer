# Phase P03: Đóng gói VSIX, Cài đặt và Xác minh tích hợp

## 1. Phase Metadata

| Field | Value |
|:---|:---|
| **Phase ID** | `P03` |
| **Parent Task ID** | `TASK-20261020-001` |
| **Master Plan** | `../TASK_MCP_SLASH_AUTOCOMPLETE_LUXURY_PILL.md` |
| **Status** | ✅ Done |
| **Depends on** | `P01`, `P02` |
| **Lifecycle Owner** | JARVIS / Worker |

---

## 2. Target File Impact (Trích xuất từ Section 4 Master)

| Action | File path | Target Symbol/Area | Reason | Evidence |
|:---|:---|:---|:---|:---|
| Edit | `package.json` | `version` | Nâng phiên bản lên v1.2.2 | `Confirmed` |
| Edit | `CHANGELOG.md` | `## [1.2.2]` | Ghi nhận tính năng gợi ý MCP Server và giao diện Luxury Pill | `Confirmed` |
| Edit | `README.md` | Version badge | Cập nhật badge phiên bản v1.2.2 | `Confirmed` |
| Run | `build_and_install.js` | Toàn bộ script | Đóng gói VSIX, cài đặt vào VS Code, dọn dẹp phiên bản cũ | `Confirmed` |

---

## 3. Tasks Breakdown

- [ ] **Task P03.1: Cập nhật tài liệu phiên bản và changelog**
  - Files: `package.json`, `CHANGELOG.md`, `README.md`
  - Chi tiết:
    - Bumper version từ `1.2.1` lên `1.2.2` trong `package.json`.
    - Thêm mục `[1.2.2] - 2026-10-20` vào `CHANGELOG.md` bằng ngôn ngữ tiếng Việt chuyên nghiệp, hướng người dùng, không lộ thông tin nhạy cảm.
    - Cập nhật badge version trong `README.md`.

- [ ] **Task P03.2: Thực thi quy trình đóng gói và cài đặt tự động**
  - File: `build_and_install.js`
  - Chi tiết:
    - Chạy lệnh `node build_and_install.js`.
    - Xác minh đóng gói thành công `jarvis-ide-enhancer-1.2.2.vsix`.
    - Xác minh lệnh cài đặt `code --install-extension` thành công với mã thoát 0.

- [ ] **Task P03.3: Chạy toàn bộ bộ kiểm thử tích hợp (Test Strategy T-001 -> T-006)**
  - File: Toàn hệ thống
  - Chi tiết:
    - Chạy `T-001`, `T-002` để đảm bảo file header `vscode-custom.js` chứa đủ 14 token MCP.
    - Kiểm tra `T-003`, `T-004` trên giao diện người dùng.
    - Kiểm tra `T-005` (Watcher) và `T-006` (Hồi quy lệnh slash thường).

---

## 4. Conditional Quality Gates (Cấp Phase)

- **Security Gate: Passed.**
  - Toàn bộ secret và password trong `mcp.json` không xuất hiện trong VSIX đóng gói.
- **Data Gate: Not applicable.**
- **Accessibility Gate: Passed.**
- **Compatibility Gate: Passed.**
  - Phiên bản mới tương thích 100% với VS Code 1.85.0+.

---

## 5. Phase Rollback (Cục bộ)

- Nếu bản đóng gói gặp sự cố:
  - Khôi phục phiên bản `1.2.1` từ `jarvis-ide-enhancer-1.2.1.vsix` bằng lệnh:
    `code --install-extension jarvis-ide-enhancer-1.2.1.vsix --force`

---

## 6. Phase Verification & DoD Checklist

- **Pre-check (Phase DoR):**
  - [x] Phase P01 và P02 đã hoàn tất 100%.
  - [x] Codebase sạch, không có lỗi linter.

- **Execution Verification (Mapped Test Checks):**
  - Check ID: `T-001`, `T-002`, `T-005`, `T-006`
  - Lệnh kiểm tra:
    ```bash
    node build_and_install.js
    ```
  - Kết quả kỳ vọng: `DONE Packaged: jarvis-ide-enhancer-1.2.2.vsix` và `Extension was successfully installed`.

- **Post-check (Phase DoD):**
  - [x] Toàn bộ tasks P03.1, P03.2, P03.3 đã hoàn thành (`[x]`).
  - [x] Đã đồng bộ trạng thái Phase P03 trong Master Plan thành `Done`.
  - [x] Đã cập nhật Definition of Done trong Master Plan thành `Pass`.
