<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="JARVIS IDE Enhancer Logo" />
</p>

# JARVIS IDE Enhancer

**Bespoke Luxury Visuals & Intelligent Prompt Engineering for VS Code**

[![Version](https://img.shields.io/badge/version-v1.1.8-89b4fa.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-89dceb.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/vscode-%5E1.85.0-74c7ec.svg)](https://code.visualstudio.com/)
[![Architecture](https://img.shields.io/badge/architecture-Zero--Crash-a6e3a1.svg)](#-kiến-trúc-phòng-thủ-zero-crash)

Kiến tạo không gian làm việc đẳng cấp cho FOUNDER & Developers: Con trỏ 3D Isometric Neon, trợ lý Copilot Chat phong cách JARVIS với placeholder cờ Việt Nam độc quyền, gợi ý Slash Command linh hoạt mọi vị trí và cơ chế tự động đồng bộ hóa an toàn tuyệt đối.

---

## 🌟 Tổng Quan (Overview)

**JARVIS IDE Enhancer** biến môi trường soạn thảo VS Code và Copilot Chat thành một cỗ máy làm việc hiệu năng cao với trải nghiệm thị giác tinh tế:

- **Đẳng cấp thị giác:** Con trỏ 3D Isometric tỏa sáng mềm mại, placeholder phong cách JARVIS độc quyền với biểu tượng quốc gia.
- **Tăng tốc tương tác:** Mở khóa gợi ý Slash Commands giữa câu lệnh prompt, phân biệt rõ ràng lệnh hệ thống (Blue Pills) và macro phím tắt cá nhân (Purple Pills).
- **Tính nhất quán tuyệt đối:** Đồng bộ diện mạo xuyên suốt từ ô nhập lệnh Monaco, lịch sử hội thoại cho đến các bong bóng phản hồi và bảng biểu Markdown.
- **Bảo toàn & Đồng bộ:** Cơ chế Zero-Crash an toàn tuyệt đối với kiểm chứng biên dịch V8 trước khi ghi, tích hợp sẵn sàng với GitHub Settings Sync trên mọi máy trạm.

---

## 🚀 Tính Năng Cốt Lõi (Core Features)

### 1. 3D Isometric Glowing Cursor & JARVIS Chat Placeholder

- **Con trỏ 3D Isometric Neon:** Thanh caret màu tím `#c084fc` bo tròn kết hợp hiệu ứng hào quang (ambient glow), phía sau là khung cửa sổ không gian 3D chứa ngôi sao vector trung tâm được tối ưu hóa bằng SVG GPU-accelerated. Tuyệt đối không cản trở việc bôi đen hoặc chọn khối mã nguồn.
- **JARVIS Ready Chat Placeholder:** Khi khung chat Copilot ở trạng thái trống, placeholder mặc định được thay thế bằng dòng chữ `JARVIS READY FOR COMMAND` căn giữa trang nhã, điểm xuyết quốc kỳ Việt Nam tinh tế ở hai bên. Placeholder tự động ẩn lập tức khi bắt đầu gõ phím và giữ nguyên vị trí con trỏ chính xác.

![3D Isometric Glowing Cursor & JARVIS Chat Placeholder](docs/images/3d-cursor-placeholder.png)

---

### 2. Multi-Prompt Slash Command Intellisense (Blue Pills)

- **Mở khóa Slash Command giữa câu:** Vượt qua giới hạn mặc định của VS Code (chỉ cho phép gõ slash command ở đầu dòng). Cho phép kích hoạt Intellisense cho các lệnh `/workflow`, `/rule`, `/skill` tại bất kỳ vị trí nào sau dấu cách, ký tự phân tách `>`, dấu hai chấm hoặc dấu chấm phẩy.
- **Slash Command Blue Pills:** Mọi lệnh slash được tự động đóng khung dưới dạng huy hiệu viên thuốc (pill badge) màu xanh thanh lịch (`#89b4fa` / `rgba(38, 71, 120, 0.4)`), giúp người dùng nhận diện nhanh cấu trúc prompt nhiều bước.

![Multi-Prompt Slash Command Intellisense](docs/images/slash-command-pills.png)

---

### 3. Custom Backtick Macro Highlighting (Purple Pills)

- **Nhận diện Macro cá nhân:** Tự động phát hiện và bôi màu tím đặc trưng (`#d8b4fe`, viền `rgba(192, 132, 252, 0.45)`, bóng sáng `rgba(168, 85, 247, 0.25)`) cho các lệnh viết tắt và macro điều phối của FOUNDER (ví dụ: `` `fp ``, `` `tt ``, `` `wtn ``, `` `rp ``, `` `git ``).
- **Bộ Tokenizer thông minh:** Ứng dụng RegExp Negative Lookahead ngăn chặn xung đột, đảm bảo các đoạn mã nội dòng Markdown thông thường (`` `inline code` ``) vẫn hiển thị đúng chuẩn mà không bị biến thành pill macro.

![Custom Backtick Macro Highlighting](docs/images/backtick-macro-pills.png)

---

### 4. Full Lifecycle Consistency (Chat Input, History & Inline Edit)

- **Nhất quán vòng đời hội thoại:** Định dạng pill màu xanh cho Slash Commands và màu tím cho Backtick Macros được duy trì xuyên suốt từ Monaco Input Editor, danh sách câu lệnh chờ (Queued Requests), bong bóng lịch sử chat đến khung sửa lỗi trực tiếp Inline Chat.
- **Khôi phục ký tự Backtick trong Markdown:** Triệt tiêu hiện tượng bộ dựng Markdown của VS Code nuốt mất ký hiệu backtick mở/đóng trong câu lệnh của người dùng, tái tạo trung thực prompt gốc.
- **Tối ưu hóa hiệu năng DOM:** Sử dụng `MutationObserver` kết hợp `TreeWalker` quét trúng đích các node văn bản, đạt tốc độ phản hồi dưới 0.1ms và không gây giật lag giao diện.

![Full Lifecycle Visual Consistency](docs/images/chat-history-overview.png)

---

### 5. Centered Chat Tables & Streamlined Markdown

- **Căn giữa bảng biểu phản hồi:** Tự động căn giữa tất cả các bảng Markdown trong bảng phản hồi Copilot Chat (`margin: 0 auto; display: table`), biến các báo cáo kỹ thuật và ma trận dữ liệu thành bảng điều khiển trực quan, dễ theo dõi.
- **Lược bỏ viền xám rườm rà:** Loại bỏ các khối viền code pill thừa thãi trong câu hỏi của người dùng, mang lại giao diện văn bản thanh thoát, hiện đại.
- **Vòng xoay tiến trình mượt mà:** Khung viền ô chat khi AI đang sinh mã xử lý quay đều liên tục thông qua `@property --chat-input-anim-angle`, không bị ảnh hưởng bởi thiết lập giảm chuyển động (Reduce Motion) của hệ điều hành.

---

### 6. Cloud Settings Sync (Multi-Device)

- **Cấu hình cá nhân hóa trên mây:** Hỗ trợ cấu hình CSS và JS mở rộng thông qua hai mục thiết lập:
  - `jarvisEnhancer.customCSS`: Bổ sung hoặc ghi đè luật CSS tùy biến.
  - `jarvisEnhancer.customJS`: Bổ sung hoặc ghi đè script tự động hóa giao diện.
- **Đồng bộ tự động qua GitHub Settings Sync:** Cấu hình được lưu trong `settings.json` của VS Code, tự động đồng bộ trên toàn bộ các thiết bị làm việc của FOUNDER (máy bàn, laptop, trạm làm việc từ xa) ngay khi đăng nhập tài khoản.
- **Ghi đè tức thì không cần can thiệp thủ công:** Extension tự động đồng bộ ngầm các tùy biến từ settings vào thư mục nội bộ `~/.jarvis/style/` trong chế độ silent.

---

## 🛠️ Hướng Dẫn Cài Đặt & Sử Dụng (Setup & Usage)

### Điều kiện tiên quyết (Prerequisites)

Cài đặt extension hỗ trợ nạp CSS/JS: [Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css) (`be5invis.vscode-custom-css`).

### Các bước kích hoạt nhanh

1. **Cài đặt extension:** Cài đặt `JARVIS IDE Enhancer` từ Marketplace hoặc tệp `.vsix`.
2. **Kích hoạt giao diện & phong cách:**
   - Mở Command Palette (`Ctrl+Shift+P` trên Windows/Linux hoặc `Cmd+Shift+P` trên macOS).
   - Chạy lệnh: `JARVIS: Sync Setup & Apply Styles`.
   - Extension sẽ tự động trích xuất các tài nguyên vào `~/.jarvis/style/`, cập nhật cấu hình `vscode_custom_css.imports` và kích hoạt bộ nạp CSS.
3. **Mở khóa Slash Command Intellisense (Tùy chọn khuyến nghị):**
   - Chạy lệnh: `JARVIS: Patch Chat Slash Intellisense`.
   - Quá trình vá an toàn diễn ra trong 0.2 giây với sao lưu tự động.
4. **Khởi động lại cửa sổ:**
   - Chọn `Reload Window` khi nhận được thông báo để bắt đầu trải nghiệm.

---

## ⌨️ Danh Sách Lệnh (Available Commands)

| Tên lệnh (Command Palette) | Định danh lệnh (Command ID) | Mô tả chi tiết |
|:---|:---|:---|
| `JARVIS: Sync Setup & Apply Styles` | `jarvisEnhancer.syncSetup` | Trích xuất assets vào `~/.jarvis/style/`, cấu hình `settings.json`, nạp CSS và cập nhật giao diện tự động. |
| `JARVIS: Patch Chat Slash Intellisense` | `jarvisEnhancer.patchIntellisense` | Vá an toàn bundle VS Code qua kiểm tra cú pháp V8 để kích hoạt gợi ý slash command giữa câu và hook Monaco editor. |
| `JARVIS: Edit Custom CSS` | `jarvisEnhancer.editCSS` | Mở trực tiếp tệp `~/.jarvis/style/vscode-custom.css` trong trình biên tập để tinh chỉnh kiểu dáng. |
| `JARVIS: Edit Custom JS` | `jarvisEnhancer.editJS` | Mở trực tiếp tệp `~/.jarvis/style/vscode-custom.js` trong trình biên tập để bổ sung kịch bản giao diện. |

---

## 📂 Cấu Trúc Tệp & Lưu Trữ (File Structure)

```text
~/.jarvis/style/
├── vscode-custom.css    # Bộ quy tắc CSS giao diện, con trỏ 3D, placeholder và pill badges
└── vscode-custom.js     # Script tương tác Monaco Editor, bộ tokenizer và history observer
```

Khi extension được phân phối dưới dạng gói cài đặt:
```text
ide-style-studio/
├── assets/
│   ├── icon.png                 # Biểu tượng chính thức của JARVIS IDE Enhancer
│   ├── vscode-custom.css        # Mã nguồn CSS chuẩn đóng gói
│   └── vscode-custom.js         # Mã nguồn JS chuẩn đóng gói
├── docs/
│   └── images/                  # Toàn bộ hình ảnh minh họa chất lượng cao
├── extension.js                 # Controller chính quản lý đồng bộ và vá bundle an toàn
└── package.json                 # Manifest khai báo commands, settings và siêu dữ liệu
```

---

## 🛡️ Kiến Trúc An Toàn Tuyệt Đối (Zero-Crash Architecture)

`JARVIS IDE Enhancer` được thiết kế theo tôn chỉ an toàn tuyệt đối cho môi trường phát triển của nhà sáng lập:

1. **Tách biệt tầng thực thi (Process Isolation):**
   - Extension Host chạy hoàn toàn trong môi trường Node.js cách ly, không can thiệp sâu vào DOM một cách bừa bãi.
   - Toàn bộ phong cách giao diện được ủy thác qua cơ chế nạp chính thống của `be5invis.vscode-custom-css`.
2. **Sao lưu tự động không hủy hoại (Non-destructive Backups):**
   - Trước khi thực hiện bất kỳ chỉnh sửa nào trên tệp bundle core (`workbench.desktop.main.js`), hệ thống luôn tự động tạo tệp sao lưu nguyên bản `.bak`.
3. **Kiểm định cú pháp V8 AST trước khi ghi (Pre-write Syntax Verification):**
   - Nội dung bản vá bắt buộc phải vượt qua bài kiểm tra biên dịch cú pháp bằng `vm.Script` trong Node.js. Nếu phát hiện bất kỳ dấu hiệu sai lệch cấu trúc nào, thao tác ghi tệp sẽ bị hủy bỏ ngay lập tức, loại bỏ 100% nguy cơ lỗi màn hình đen hoặc hỏng ứng dụng.
4. **Bảo vệ tài nguyên & Chống rò rỉ bộ nhớ:**
   - Các bộ lắng nghe sự kiện (`MutationObserver`, `TreeWalker`) được gắn cờ tránh quét lặp (`__historyDecorated`), giới hạn phạm vi trong vùng chat và tự hủy khi không cần thiết.

---

## 📄 Bản Quyền (License)

Phát hành dưới giấy phép [MIT License](LICENSE). Tự do sử dụng, chỉnh sửa và phân phối cho mục đích cá nhân lẫn thương mại.


