# Phase P02: Macro Snippet & Tab-Stop Expander — Tự động bôi đen tham số

## 1. Phase Metadata

| Field | Value |
|:---|:---|
| **Phase ID** | `P02` |
| **Parent Task ID** | `TASK-20261021-001` |
| **Master Plan** | `../TASK_JARVIS_CHAT_POWER_SUITE.md` |
| **Status** | ✅ Done |
| **Depends on** | `None` |
| **Lifecycle Owner** | JARVIS / Worker |

---

## 2. Target File Impact (Trích xuất từ Section 4 Master)

| Action | File path | Target Symbol/Area | Reason | Evidence |
|:---|:---|:---|:---|:---|
| Edit | `extension.js` | `discoverMacrosFromRules` | Bổ sung trích xuất thuộc tính `param` (`<name>`, `<target>`) | `Confirmed` |
| Edit | `apply_custom_css.js` | `loadOrScanMacros` | Đồng bộ logic trích xuất `param` cho script build CLI | `Confirmed` |
| Edit | `assets/vscode-custom.js` | `applyMacroToEditor` | Tính toán tọa độ và kích hoạt `editor.setSelection()` | `Confirmed` |

---

## 3. Tasks Breakdown

- [x] **Task P02.1: Mở rộng parser `discoverMacrosFromRules()` để lưu trữ `param`**
  - File: `extension.js`
  - Chi tiết:
    - Trong hàm `discoverMacrosFromRules()`, regex hiện tại là:
      `const regex = /^\s*-\s*`([a-z0-9_-]+)(?:\s+(<[^>]+>))?:\s*([^\r\n]+)/gm;`
    - Nhận thấy `match[2]` chính là chuỗi tham số, ví dụ `<name>`, `<target>`, `<version>`.
    - Trích xuất:
      `const param = match[2] ? match[2].trim() : null;`
    - Lưu vào macro object:
      `macroMap.set(token, { token, desc, param });`
    - Cập nhật hàm cache và setting `jarvisEnhancer.customMacros`.

- [x] **Task P02.2: Đồng bộ parser trong `apply_custom_css.js` và header `window.__jarvisDynamicMacros`**
  - File: `apply_custom_css.js`
  - Chi tiết:
    - Cập nhật hàm `loadOrScanMacros()` tương tự như Task P02.1 để đảm bảo khi chạy script build CLI độc lập, file `vscode-custom-macros.json` và header `window.__jarvisDynamicMacros` được tiêm vào `vscode-custom.js` luôn chứa đầy đủ trường `param`.

- [x] **Task P02.3: Nâng cấp `applyMacroToEditor()` với cơ chế bôi đen tự động (Tab-Stop Selection)**
  - File: `assets/vscode-custom.js`
  - Chi tiết:
    - Trong hàm `applyMacroToEditor(macro)`:
      ```javascript
      function applyMacroToEditor(macro) {
          if (!macro || !_currentReplaceRange || !_activeEditorForMacro) return;
          try {
              const targetEditor = _activeEditorForMacro;
              const range = { ..._currentReplaceRange };
              const model = typeof targetEditor.getModel === 'function' ? targetEditor.getModel() : null;
              if (model && macro.token.startsWith('`')) {
                  const lineContent = model.getLineContent(range.endLineNumber) || '';
                  if (lineContent.charAt(range.endColumn - 1) === '`') {
                      range.endColumn = range.endColumn + 1;
                  }
              }

              // Nếu macro có tham số, chèn token kèm param: ví dụ "`wtn <name> "
              const hasParam = !!(macro.param && typeof macro.param === 'string');
              const insertText = hasParam ? `${macro.token} ${macro.param} ` : `${macro.token} `;

              targetEditor.executeEdits('jarvis-macro', [{
                  range: range,
                  text: insertText
              }]);

              if (hasParam && typeof targetEditor.setSelection === 'function') {
                  // Tính toán vị trí của <param> để bôi đen
                  const paramStartCol = range.startColumn + macro.token.length + 1;
                  const paramEndCol = paramStartCol + macro.param.length;
                  targetEditor.setSelection({
                      startLineNumber: range.startLineNumber,
                      startColumn: paramStartCol,
                      endLineNumber: range.startLineNumber,
                      endColumn: paramEndCol
                  });
              } else {
                  const nextCol = range.startColumn + insertText.length;
                  if (typeof targetEditor.setPosition === 'function') {
                      targetEditor.setPosition({
                          lineNumber: range.startLineNumber,
                          column: nextCol
                      });
                  }
              }

              if (typeof targetEditor.focus === 'function') {
                  targetEditor.focus();
              }
          } catch (err) {
              console.error('[JARVIS] Error applying macro edit:', err);
          }
          hideMacroPopup();
      }
      ```
    - Người dùng gõ phím là ghi đè ngay lập tức nội dung `<param>` mà không cần bấm phím xóa.

---

## 4. Conditional Quality Gates (Cấp Phase)

- **Security Gate: Passed.**
  - Không đọc hay lưu dữ liệu nhạy cảm.
- **Data Gate: Not applicable.**
- **Accessibility Gate: Passed.**
  - Vùng bôi đen sử dụng selection chuẩn của Monaco Editor, hỗ trợ đầy đủ bộ đọc màn hình và phím tắt điều hướng mặc định.
- **Compatibility Gate: Passed.**
  - Nếu macro không có `param`, hành vi chèn text và đặt con trỏ ở cuối được giữ nguyên 100% như các phiên bản trước.

---

## 5. Phase Rollback (Cục bộ)

- Hoàn tác mã nguồn parser và selection:
  `git checkout HEAD -- extension.js apply_custom_css.js assets/vscode-custom.js`

---

## 6. Phase Verification & DoD Checklist

- **Pre-check (Phase DoR):**
  - [x] Đã xác minh regex macro rule hiện có hỗ trợ capture group cho `<...>`.
- **Execution Verification (Mapped Test Checks):**
  - Check ID: `T-001`, `T-004`
  - Lệnh kiểm tra: Chọn `` `wtn <name> `` hoặc `` `mtdb <target> `` trên Monaco Editor và xác nhận chuỗi `<...>` được bôi đen sẵn sàng gõ đè.
- **Post-check (Phase DoD):**
  - [x] Hoàn thành cả 3 tasks P02.1, P02.2, P02.3.
  - [x] Tab-stop bôi đen chính xác placeholder, gõ phím thay thế tức thì.
  - [x] Đồng bộ trạng thái Phase P02 trong Master Plan thành `Done`.
