# Changelog

All notable changes to the **JARVIS IDE Enhancer** extension will be documented in this file.

## [1.2.3] - 2026-10-20

### Improved
- **Tìm lệnh linh hoạt hơn:** Có thể tìm theo một phần tên lệnh hoặc mô tả; ưu tiên kết quả khớp tên và hỗ trợ văn bản có dấu.

## [1.2.2] - 2026-10-20

### Added
- **Gợi ý MCP khi nhập lệnh `/`:** Tự động đọc danh sách MCP server từ cấu hình VS Code và hiển thị token `/mcp:<name>` trong popup autocomplete.
- **Nhận diện MCP trực quan:** Token MCP có màu Amber Glow riêng, phân biệt với lệnh Slash màu xanh dương và Macro màu tím Neon.
- **Đồng bộ tự động:** Tự cập nhật danh sách MCP khi file cấu hình thay đổi, không cần khởi động lại VS Code.

### Improved
- **Bảo vệ thông tin kết nối:** Chỉ hiển thị tên và nhóm chức năng MCP; không đưa mật khẩu, connection string hay API key vào giao diện.
- **Hỗ trợ tên MCP dạng namespace:** Chuẩn hóa tên có dấu `/` thành token an toàn, không làm vỡ hiển thị pill.

## [1.2.1] - 2026-10-20

### Added
- **Nút mở nhanh phiên trò chuyện cục bộ (New Local Chat):** Bổ sung nút chuyên dụng ngay trên thanh tiêu đề cửa sổ chat, cho phép khởi tạo phiên làm việc cục bộ với toàn quyền thực thi tự động chỉ bằng một cú click.
- **Tự động cấp quyền thực thi đầy đủ (Auto Allow All):** Phiên trò chuyện cục bộ mới tạo được tự động kích hoạt chế độ cho phép toàn bộ công cụ và lệnh, loại bỏ thao tác duyệt thủ công.

### Improved
- **Nâng cấp thuật toán định vị phần tử giao diện:** Áp dụng cơ chế tìm kiếm trực tiếp (Direct-Anchor Finding) giúp nút biểu tượng luôn hiển thị chính xác trên mọi bố cục, kể cả khi thanh công cụ ở trạng thái thu gọn hoặc ẩn.
- **Tối ưu tương tác bấm nút trên thanh công cụ:** Cải thiện chuỗi sự kiện nhấn chuột đầy đủ, đảm bảo thao tác phản hồi mượt mà và tương thích với mọi phiên bản giao diện.
- **Củng cố hệ thống tự phục hồi và đồng bộ cấu hình:** Hoàn thiện cơ chế tự động phát hiện và sửa chữa khi ứng dụng được cập nhật, duy trì trải nghiệm ổn định liên tục.

## [1.1.49] - 2026-10-19

### Fixed
- **Khắc phục vị trí hiển thị nút New Local Chat:** Nâng cấp thuật toán định vị phần tử trực tiếp (Direct-Anchor Finding) trên thanh tiêu đề cửa sổ phụ (Auxiliary Bar) và các thanh công cụ thu gọn, đảm bảo nút biểu tượng luôn xuất hiện chuẩn xác ngay cạnh nút tạo phiên trò chuyện trên mọi bố cục giao diện.

## [1.1.48] - 2026-10-19

### Added
- **Nút mở nhanh phiên trò chuyện cục bộ (New Local Chat):** Bổ sung nút biểu tượng chuyên dụng ngay cạnh nút tạo phiên chat mới trên thanh tiêu đề, cho phép mở nhanh phiên làm việc cục bộ với toàn quyền thực thi tự động (Allow all) chỉ với một cú click chuột.

## [1.1.47] - 2026-10-19

### Improved
- **Nâng cấp độ ổn định và tối ưu hóa hệ thống toàn diện:** Tinh chỉnh cơ chế tự động thích ứng với các bản cập nhật mới của ứng dụng, hoàn thiện tính năng khôi phục một chạm giúp duy trì liên tục trải nghiệm giao diện cao cấp và thanh dòng thời gian mượt mà.
- **Hoàn thiện bố cục và hiển thị giao diện:** Tối ưu hóa khoảng cách lề và các điểm mốc trực quan trong khung hội thoại, mang lại không gian làm việc cân đối, thoáng đãng và dễ theo dõi.

## [1.1.46] - 2026-10-15

### Maintenance & Release
- **Đóng gói phát hành bản dựng 1.1.46 ổn định:** Tinh chỉnh và đóng gói hoàn thiện toàn bộ hệ thống tối ưu giao diện, phím tắt nhanh và thanh dòng thời gian, đảm bảo khả năng tương thích cao nhất trên các phiên bản mới của ứng dụng.

## [1.1.45] - 2026-10-15

### Improved
- **Tối ưu hóa khoảng cách thị giác quang học (Optical Balance):** Thiết lập lề trái 28px chừa khoảng trống thở 18px thanh lịch từ cột mốc dòng thời gian sang văn bản, đồng bộ với lề phải 18px, loại bỏ hoàn toàn cảm giác dính chữ hay chật chội.

## [1.1.44] - 2026-10-15

### Improved
- **Triệt tiêu khoảng đệm lệch lề phải (Pixel-Perfect Symmetry):** Gỡ bỏ hoàn toàn quy tắc ép lề phải của danh sách cũ, thiết lập khoảng đệm lề trái và lề phải đối xứng hoàn hảo 14px cho toàn bộ các chế độ khung trò chuyện (Sidebar, Panel, Editor Tab), giúp văn bản tràn đều và thẩm mỹ tuyệt đối.

## [1.1.43] - 2026-10-15

### Documentation & Maintenance
- **Cập nhật tài liệu hướng dẫn vận hành toàn diện:** Hoàn thiện hướng dẫn sử dụng cơ chế khôi phục một chạm (Master Restore), tích hợp lệnh chạy từ terminal và bảng lệnh Command Palette.
- **Tối ưu hóa tài nguyên và cấu trúc tệp:** Đồng bộ hóa tài liệu kiến trúc, dọn dẹp các tệp cài đặt trung gian và tối ưu hiệu suất nạp tiện ích trên phiên bản mới nhất của ứng dụng.

## [1.1.42] - 2026-10-15

### Improved
- **Khôi phục kích thước chấm tròn thanh dòng thời gian:** Đưa các điểm mốc dòng thời gian về kích thước nhỏ gọn 4px nguyên bản, tinh tế và không gây xao nhãng.
- **Cân đối khoảng cách hai bên khung trò chuyện:** Đồng bộ khoảng đệm lề trái và lề phải bằng nhau, loại bỏ khoảng trống thừa ở mép phải, giúp nội dung phản hồi hiển thị cân xứng và thẩm mỹ.

## [1.1.41] - 2026-10-15

### Improved
- **Hợp nhất lệnh vận hành một chạm (Master Sync & Patch All):** Tối ưu hóa bảng lệnh Command Palette, gộp 3 thao tác đồng bộ giao diện, vá lõi và tự phục hồi thành 1 lệnh duy nhất. Người dùng chỉ cần 1 cú click để khôi phục toàn bộ hệ thống sau mỗi lần nâng cấp ứng dụng.
- **Tối ưu hóa giao diện Chat Artifacts:** Trả lại 100% phong cách hiển thị gốc chuẩn của VS Code cho danh sách tài liệu và tác vụ trong khung chat, đảm bảo độ tương thích và thẩm mỹ tự nhiên nhất.

## [1.1.40] - 2026-10-15

### Added
- **Cơ chế khôi phục một chạm (One-Click Master Restore):** Bổ sung tác vụ khôi phục toàn diện hệ thống chỉ với một lệnh duy nhất. Tự động phát hiện và áp dụng các tối ưu giao diện, phím tắt nhanh và thanh dòng thời gian trên phiên bản mới nhất của ứng dụng ngay sau khi cập nhật.
- **Tối ưu hóa quản lý phiên bản tiện ích:** Tự động dọn dẹp các tệp cài đặt cũ, loại bỏ nguy cơ xung đột phiên bản và đảm bảo tiện ích luôn vận hành ở trạng thái mới nhất và ổn định nhất.

## [1.1.39] - 2026-10-14

### Fixed
- **Tự động thích ứng khi cập nhật phiên bản IDE mới (Zero-Touch Self-Healing):** Nâng cấp cơ chế nhận diện cấu trúc mã nguồn tự động, phân tích thông minh các bản cập nhật của VS Code để luôn duy trì trơn tru các tính năng gợi ý phím tắt, thanh dòng thời gian và phong cách giao diện mà không bị gián đoạn hay phát sinh cảnh báo cấu hình.

## [1.1.38] - 2026-10-13

### Improved
- **Tối ưu hiển thị khối mã và phản hồi trong khung chat:** Tự động phát hiện và loại bỏ các khung mã rỗng không có nội dung, bảo toàn nguyên vẹn 100% các đoạn mã thực tế và các công cụ thực thi lệnh, giúp giao diện hội thoại luôn gọn gàng, liền mạch và chuyên nghiệp.

## [1.1.37] - 2026-10-12

### Added
- **Mở khóa tính năng Chat Artifacts Panel (Option 1):** Tự động bóc tách các kế hoạch triển khai (`**/*plan*.md`), nhiệm vụ (`**/TASK_*.md`), cấu hình JSON và ảnh chụp thành các nhóm Artifact riêng biệt hiển thị trực quan ngay trên ô chat, tương tự như trải nghiệm Claude Artifacts.
- **Bộ thông điệp suy nghĩ độc quyền của JARVIS (Option 3):** Tùy biến toàn bộ câu chữ trạng thái suy nghĩ của Agent AI thành các khẩu hiệu phân tích kiến trúc, kiểm toán an toàn và lập kế hoạch chuyên nghiệp bằng tiếng Việt.
- **Bespoke Glassmorphism Styling cho Chat Artifacts Widget:** Thiết kế bo góc mềm mại, hiệu ứng kính mờ `backdrop-filter: blur(16px)` và viền mờ cao cấp cho danh sách Artifacts.

## [1.1.36] - 2026-10-12

### Refactored
- **Dọn sạch 100% Dead Code & Tối ưu hiệu năng tải (Clean Code):** Loại bỏ toàn bộ các khối lệnh JS cào DOM giả lập và class CSS thừa của Option 2 (giảm kích thước tệp `vscode-custom.js` từ 86KB xuống 37KB, tiết kiệm hơn 50% dung lượng và giải phóng bộ nhớ renderer).
- **Hệ thống hóa Native Timeline Styling:** Giữ nguyên các lớp CSS tối ưu hóa cho Native Prompt Timeline của Microsoft, đảm bảo giao diện sang trọng, tốc độ phản hồi 60fps và độ ổn định lâu dài.

## [1.1.35] - 2026-10-12

### Improved
- **Bảo toàn tính năng khi VS Code cập nhật phiên bản mới (Self-Healing Daemon):** Mở rộng cơ chế tự phục hồi tự động quét và khôi phục cả 4 cổng vá quan trọng (Intellisense bypass, Multi-slash unblocked, Hook CodeEditor và Mở khóa Native Timeline) ngay khi phát hiện Microsoft ghi đè file bundle sau khi cập nhật VS Code.
- **Tối ưu trải nghiệm cài đặt trên máy mới (Zero-Touch Onboarding):** Tự động phát hiện cấu hình, tạo thư mục tài nguyên, inject mã giao diện, vá core bundle và dọn sạch cache V8 ngầm 100% trong lần khởi động đầu tiên.

## [1.1.34] - 2026-10-12

### Improved
- **Khắc phục triệt để lỗi vùng rê chuột quá rộng của Timeline bên trái:** Thu hẹp khung hit-box tàng hình rộng 300px mặc định của Microsoft về đúng 24px bao quanh các chấm tròn. Đảm bảo di chuột qua giữa khung chat không bao giờ bị kích hoạt nhầm bảng danh sách câu hỏi.
- **Chỉ kích hoạt khi rê chuột trực tiếp vào chấm:** Thiết lập `pointer-events: none` cho vùng trống bên phải và chỉ mở rộng vùng tương tác khi người dùng thực sự rê chuột vào các chấm tròn.
- **Nâng cấp giao diện Glassmorphism cho Popup câu hỏi:** Bổ sung hiệu ứng kính mờ `backdrop-filter: blur(20px)` và viền mờ cho danh sách câu hỏi Gutter Panel.

## [1.1.33] - 2026-10-12

### Added
- **Mở khóa Native Prompt Timeline chính chủ của Microsoft (Option 3):** Mở khóa tính năng Timeline và Ruler Marks gốc được tích hợp sâu trong VS Code Core, hỗ trợ hiển thị 100% dữ liệu lịch sử chat và cuộn mượt native 60fps qua API `reveal`.
- **Tùy biến giao diện Glassmorphism Codex cho Native Timeline Card:** Biến thẻ xem trước mặc định của VS Code thành thẻ popup kính mờ cao cấp, hiển thị tiêu đề prompt, thời gian và thống kê diff tệp tin.

## [1.1.32] - 2026-10-12

### Fixed
- **Triển khai Option 2: 100% Zero-Core Patch an toàn tuyệt đối:** Gỡ bỏ hoàn toàn mọi can thiệp vào mã nguồn ChatWidget trong core bundle, khôi phục `workbench.desktop.main.js` về trạng thái an toàn sạch sẽ, triệt tiêu 100% rủi ro màn hình đen.
- **Cơ chế điều khiển cuộn thông minh qua Scrollbar & Wheel PointerEvent:** Tự động điều khiển cuộn thông qua mô phỏng sự kiện `PointerEvent` trên thanh cuộn và `WheelEvent`, tương thích mượt mà với bộ cuộn ảo của Monaco List.
- **Tính năng Quick-Sweep tự động nạp dữ liệu thật:** Khi mở một phiên chat cũ có nhiều câu hỏi chưa tải trong DOM, hệ thống tự động quét nhanh (Quick-Sweep) để kích hoạt nạp đầy đủ tiêu đề và câu trả lời thật vào thẻ xem trước.

## [1.1.31] - 2026-10-12

### Fixed
- **Giải quyết triệt để lỗi không cuộn và thiếu nội dung chat (Option 1):** Tích hợp Patch 4 hook trực tiếp vào `ChatWidgetService.register`, cấp quyền truy cập `ChatWidget.viewModel.getItems()` và hàm cuộn chính chủ `widget.reveal(item)`.
- **Hiển thị 100% tiêu đề thật và phản hồi AI tức thì:** Khắc phục triệt để hiện tượng chỉ hiện placeholder khi mở chat cũ. Toàn bộ các câu hỏi và câu trả lời trong lịch sử chat được nạp đầy đủ ngay từ millisecond đầu tiên mà không phụ thuộc vào ảo hóa DOM.
- **Cuộn mượt chính xác tuyệt đối:** Click vào bất kỳ vạch mốc nào trên thanh Timeline Rail sẽ kích hoạt lệnh `widget.reveal(item)` gốc của VS Code, cuộn mượt 60fps đến đúng lượt chat mà không bị gián đoạn.

## [1.1.30] - 2026-10-12

### Fixed
- **Khắc phục lỗi thiếu vạch mốc khi mở phiên chat cũ:** Bổ sung cơ chế phát hiện số lượng turn qua thuộc tính trợ năng `aria-setsize` và chỉ số `data-index`. Tự động hiển thị đầy đủ 100% các vạch mốc ngay khi mở chat mà không cần cuộn ngược lên trên.
- **Bộ nhớ đệm phiên thông minh (Session Cache):** Tự động ghi nhớ và phục hồi tiêu đề, thời gian và trích dẫn câu hỏi của toàn bộ các lượt chat qua bộ nhớ đệm `window.__jarvisSessionCache`.
- **Cơ chế tải bù tự động khi chuyển lượt (Snap Back-fill):** Khi bấm vào vạch mốc chưa tải trong DOM, hệ thống tự động cuộn đến vị trí tương ứng và nạp dữ liệu chi tiết vào thẻ xem trước.

## [1.1.29] - 2026-10-12

### Improved
- **Tinh chỉnh Chat Timeline Minimap chuẩn phong cách Codex:** Gỡ bỏ khối viewport xám thô, thay thế bằng thanh track mảnh 1px và vạch chỉ báo gradient tím neon thanh lịch.
- **Tối ưu khoảng cách vạch mốc:** Gom nhóm và phân bố khoảng cách tự nhiên (18px-30px) khi ít turn, loại bỏ hoàn toàn khoảng cách trống quá xa giữa các lượt hỏi.
- **Nâng cấp thẻ Hover Preview Card Glassmorphism:** Tích hợp icon bookmark SVG, tiêu đề prompt 2 dòng, tự động trích xuất 1-2 dòng đầu câu trả lời của AI và vùng cảm ứng rê chuột mở rộng.

## [1.1.28] - 2026-10-12

### Added
- **Thanh điều hướng Chat Timeline Minimap phong cách Codex:** Bổ sung thanh ray điều hướng trực quan nằm ở góc phải màn hình chat, cho phép bao quát nhanh toàn bộ các lượt trò chuyện và chuyển đổi nhanh giữa các câu hỏi.
- **Thẻ xem trước Glassmorphism Hover Preview Card:** Hiển thị thẻ tóm tắt nội dung khi rê chuột vào từng vạch mốc trên thanh điều hướng, tự động thích ứng màu sắc theo Theme hiện tại của trình soạn thảo.
- **Cơ chế cuộn mượt thông minh hỗ trợ danh sách ảo hóa:** Tự động điều hướng và cuộn mượt chính xác đến đúng câu hỏi được chọn kể cả trong các cuộc trò chuyện dài.

## [1.1.27] - 2026-10-12

### Added
- **Gợi ý tự động thông minh cho Slash Command & Macro:** Bổ sung cửa sổ gợi ý nổi thông minh hỗ trợ cả lệnh gạch chéo (`/`) và macro (``` ` ```), tự động nhận diện toàn bộ danh mục kỹ năng và lệnh quy trình làm việc.
- **Tự động quét kỹ năng quy trình:** Tích hợp bộ quét tự động danh mục quy trình làm việc và kỹ năng sẵn có trên máy để hiển thị đầy đủ trong bảng gợi ý chat.
- **Tự động dọn sạch V8 Bytecode Cache (Zero-PowerShell):** Tự động dọn dẹp cache bytecode đa nền tảng sau khi vá file, đảm bảo các máy mới nhận diện ngay lập tức mà không cần chạy lệnh PowerShell thủ công.

### Fixed
- **Bảo toàn hiển thị Terminal có nội dung trong Chat:** Khắc phục triệt để lỗi bộ lọc khiến các thẻ terminal có dữ liệu bị ẩn nhầm trên giao diện chat. Chỉ ẩn thông báo rỗng khi lệnh thực sự không có kết quả xuất ra.

### Improved
- **Trải nghiệm giao diện đồng bộ & an toàn:** Nâng cấp độ ổn định của hệ thống hiển thị huy hiệu lệnh, tối ưu hóa giao diện nổi hoạt động độc lập và mượt mà trên mọi thiết bị.

## [1.1.26] - 2026-10-12

### Fixed
- **Multi-Slash Intellisense Unblocked:** Removed core gate `parsedInput.parts.find(instanceof Pm)` preventing completion suggestions for the 2nd, 3rd, and subsequent slash commands.
- **Zero-Crash Universal Self-Healing Engine:** Fully automated, silent patching on extension activation with snippet-level V8 verification and automatic `.bak` rollback on any failure.

## [1.1.25] - 2026-10-12

### Fixed
- **Unblocked Subsequent Slash Commands Intellisense:** Removed core parser restriction (`parsedInput.parts.find(instanceof Pm)`) that blocked intellisense completion suggestions for the 2nd, 3rd, and subsequent slash commands in multi-command prompts.

## [1.1.24] - 2026-10-12

### Fixed
- **Permanent Fix for Black Screen Risk:** Completely eliminated dangerous regex overrides on `setDecorationsByType` that caused V8 syntax errors (`SyntaxError: Unexpected identifier '_m'`).
- **Unified 3-Tier Multi-Channel Editor Attachment:** Expanded fallback DOM selectors for `.chat-input-container` and `[class*="interactive-input"]`, ensuring autocomplete popup and purple pill decorations attach reliably on both desktop and laptop environments.
- **Isolated Snippet Validation:** Core patching now strictly validates isolated snippets via `vm.Script` before writing, preventing false positives and black screen lockups.

## [1.1.23] - 2026-10-11

### Added
- **Pure PowerShell Core Patcher (`patch_core.ps1`):** Standalone zero-dependency PowerShell patch script for environments without global Node.js on system PATH.
- **Direct 1-Liner PowerShell Patch:** Single-command offline core bundle patcher for instant terminal recovery.

## [1.1.22] - 2026-10-11

### Fixed
- **Multi-Channel Chat Input Bridge:** Added 3-tier fallback editor discovery (`window.__chatInputEditor`, `window.__allCodeEditors`, and DOM `.__monacoEditor` query) ensuring autocomplete and pill decorations attach immediately across all client environments and profiles.
- **Invariant `addCodeEditor` Lifecycle Hook:** Exposes `window.__codeEditorService=this` and delayed container resolution (`setTimeout`) to resolve input editors created in memory before DOM mounting.

## [1.1.21] - 2026-10-11

### Fixed
- **Restored Terminal Tool Cards:** Fixed overly aggressive CSS and DOM parent-level suppression that accidentally caused running and completed terminal command cards to disappear from the chat response view.

## [1.1.20] - 2026-10-11

### Fixed
- **Auto-Closing Quote Resilience:** Fixed macro token recognition and purple pill highlighting when typing macros with VS Code's automatic quote closing (e.g. `` `fp` ``).
- **Universal `addCodeEditor` Hook:** Replaced brittle constructor pattern with invariant `addCodeEditor` service hook, guaranteeing 100% editor attachment across all VS Code ESM releases.
- **Native Multi-Slash Command Decoration:** Injected native multi-slash decorations directly into core bundle for complete secondary command highlighting.

## [1.1.19] - 2026-10-11

### Fixed
- **Bulletproof Snippet-Level V8 Validation:** Replaced full-bundle classic script parsing with isolated snippet-level V8 compilation and file integrity bounds. Completely eliminates false-positive `Unexpected token 'export'` and `Unexpected token '{'` errors on all modern VS Code ESM builds (such as build `110a328ea5`).

## [1.1.18] - 2026-10-11

### Fixed
- **ESM-Compatible V8 Syntax Validation:** Fixed `Unexpected token 'export'` error during core bundle patching on modern VS Code ESM releases (such as build `110a328ea5`), unblocking Self-Healing daemon and Monaco Chat Input hooks across diverse client machines.

## [1.1.17] - 2026-10-11

### Added
- **Seamless Cloud Vault Sync via GitHub Settings Sync:** Encrypted AES-256-GCM customizations payload (`jarvisEnhancer.cloudVaultPayload`) is automatically synchronized across devices using native VS Code GitHub Settings Sync without manual file transfers.
- **Auto-Detection on New Machines:** Extension automatically detects new vault payloads on startup and prompts for master passphrase to restore the complete environment in one click.
- **New Commands:**
  - `JARVIS: Push Agent Customizations to Cloud (Settings Sync)` (`jarvisEnhancer.pushCloudVault`)
  - `JARVIS: Pull & Restore Agent Customizations from Cloud` (`jarvisEnhancer.pullCloudVault`)

## [1.1.16] - 2026-10-11

### Fixed
- **Cleaned Command Palette Titles:** Removed redundant `"JARVIS: "` prefix from command titles in `package.json`, eliminating the duplicate `"JARVIS: JARVIS:"` display in Command Palette.
- **Full Profile-Aware Extension Deployment:** Ensured all 8 extension commands (including Vault Export/Import) are correctly deployed to custom active profiles.

## [1.1.15] - 2026-10-11

### Fixed
- **Complete Elimination of Empty Tool/Terminal Output Boxes:** Removed `.interactive-session` CSS scope restriction and expanded selectors to cover `.chat-output-code-block`, `.interactive-result-code-block`, `.tool-output-part`, `.webview-output`, and collapsible thinking containers.
- **Enhanced Empty Detection Engine:** Intelligent separation of output text from header titles, reliably identifying silent command executions and hidden terminal widgets.

## [1.1.14] - 2026-10-11

### Added
- **JARVIS Hybrid Vault Manager:** Full export and restore capabilities for the entire Agent Customizations ecosystem (13 MCP Servers, 36 Skills, 6 Prompts & Rules, 5 Custom Model Providers, and Custom Styles).
- **AES-256-GCM Military-Grade Vault Encryption:** Encrypt and compress custom setups with a master passphrase, protecting all API keys, database connection strings, and private reverse proxy tunnels.
- **Zero-Leak Sanitized Template Export:** Automatic regex redaction of sensitive credentials, passwords, and machine-bound paths for safe sharing and public version control.
- **Cross-Platform Path Tokenization:** Normalizes absolute paths using `${userHome}` and `${mcpStorage}` across Windows, macOS, and Linux.
- **New Commands:**
  - `JARVIS: Export Agent Customizations Vault` (`jarvisEnhancer.exportVault`)
  - `JARVIS: Import Agent Customizations Vault` (`jarvisEnhancer.importVault`)

## [1.1.13] - 2026-10-11

### Fixed
- **Empty Terminal Container Suppression (Hybrid Guard):** Completely eliminated empty rectangular tool/terminal boxes in chat response when commands run silently without output (e.g. `node --check`).
- **ANSI & Zero-Width Space Sanitization:** Advanced filter strips terminal escape sequences (`\u001b`) and whitespace to reliably detect truly silent commands.

## [1.1.12] - 2026-10-11

### Added
- **Macro Auto-Discovery Engine:** Automatically scans and parses custom macro definitions from `.instructions.md` rule files across user profiles and workspace configurations.
- **Cloud Settings Sync Integration:** Discovered macros are synchronized into `jarvisEnhancer.customMacros` global settings and backed up to GitHub Settings Sync across all devices.
- **Rule File Watcher:** Live background watcher automatically updates autocomplete suggestions whenever `.instructions.md` files are edited or created.
- **New Command:** `JARVIS: Discover Macros & Sync Settings` (`jarvisEnhancer.discoverMacros`).

## [1.1.11] - 2026-10-11

### Added
- **Backtick Macro Autocomplete Popup:** Interactive floating suggestion menu appearing directly at cursor position when typing backtick commands (`fp, `tt, `rcm, `wtn, etc.) in Chat Input with ArrowUp/ArrowDown navigation and Tab/Enter completion.
- **Self-Healing Patch Daemon:** Automated non-blocking background repair service running on startup to verify and restore workbench patches after VS Code updates.
- **New Command:** `JARVIS: Run Self-Healing & Verify Patches` (`jarvisEnhancer.runSelfHealing`).

## [1.1.10] - 2026-10-11

### Fixed
- **Multi-Macro Request Unwrapping:** Resolved an issue where multiple backtick commands in a single prompt caused pill styling to disappear in conversation history.
- **Virtualized List Resilience:** Fixed style dropping when scrolling or recycling chat rows in Monaco list view.
- **Dynamic Polling Guard:** Added automated background reconciliation to keep pill decorations synchronized after asynchronous markdown renders.

## [1.1.9] - 2026-10-09

### Added
- **Backtick Macro Highlighting (Purple Pills):** Signature purple styling for custom prompt commands (`fp, `tt, `rcm, `wtn, etc.) across chat input and history.
- **2-Tier Tokenizer Engine:** Intelligent parsing that cleanly differentiates between standard Markdown inline code blocks and custom macro commands.
- **End-to-End Chat History Styling:** Uniform pill badges across chat input, queued requests, chat history bubbles, and inline request editor sessions.

### Fixed
- Resolved style bleeding into assistant response markdown messages.
- Fixed dual-layer border artifacts on Monaco editor pill decorations.

## [1.1.8] - 2026-10-08

### Added
- Multi-Prompt Slash Command Intellisense (`/workflow`, `/rule`, `/skill`) anywhere in prompt sentences.
- Automated slash command blue pill highlighting.

## [1.1.0] - 2026-10-07

### Initial Release
- 3D Isometric Neon Cursor with centered vector star.
- JARVIS Ready Chat Placeholder with national flags.
- Zero-Crash Architecture with automated styling synchronization.
