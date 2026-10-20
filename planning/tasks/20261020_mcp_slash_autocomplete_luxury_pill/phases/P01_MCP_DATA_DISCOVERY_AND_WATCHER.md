# Phase P01: Trích xuất dữ liệu MCP an toàn & Realtime File Watcher

## 1. Phase Metadata

| Field | Value |
|:---|:---|
| **Phase ID** | `P01` |
| **Parent Task ID** | `TASK-20261020-001` |
| **Master Plan** | `../TASK_MCP_SLASH_AUTOCOMPLETE_LUXURY_PILL.md` |
| **Status** | ✅ Done |
| **Depends on** | `None` |
| **Lifecycle Owner** | JARVIS / Worker |

---

## 2. Target File Impact (Trích xuất từ Section 4 Master)

| Action | File path | Target Symbol/Area | Reason | Evidence |
|:---|:---|:---|:---|:---|
| Edit | `extension.js` | `discoverMcpCommands`, `discoverSlashCommands`, `setupExternalPromptWatchers` | Quét 14 server MCP từ `mcp.json` và đăng ký watcher tự động re-sync | `Confirmed` |
| Edit | `apply_custom_css.js` | `loadOrScanSlashCommands`, `discoverMcpCommands` | Đồng bộ logic trích xuất dữ liệu cho script CLI build/patch | `Confirmed` |

---

## 3. Tasks Breakdown

- [x] **Task P01.1: Xây dựng hàm helper `discoverMcpCommands()` chuẩn hóa an toàn**
  - Files: `extension.js`, `apply_custom_css.js`
  - Chi tiết:
    - Tìm file `mcp.json` theo thứ tự ưu tiên: Active Profile Dir (qua `profiles/*`), Global User Dir (`AppData/Roaming/Code/User`), Workspace (`.vscode/mcp.json`).
    - Parse JSON an toàn (try/catch), bóc tách các key trong `servers`.
    - Phân loại công nghệ và tạo mô tả sạch (Clean Tech Category) theo từ điển heuristic:
      * `postgres`, `mssql`, `oracle`, `db`: `[DB] Quản trị & truy vấn dữ liệu <tên_server>`
      * `playwright`: `[E2E] Tự động hóa & kiểm thử trình duyệt web`
      * `search`, `brave`: `[Web] Tra cứu Internet & tài liệu trực tuyến`
      * `context7`: `[Docs] Tra cứu tài liệu thư viện mã nguồn`
      * `sequential`: `[Logic] Tư duy tuần tự giải bài toán phức tạp`
      * `memory`: `[Brain] Đồ thị tri thức & bộ nhớ dự án`
      * `filesystem`, `filesy`: `[File] Thao tác tệp tin cục bộ an toàn`
      * `markitdown`: `[Tool] Chuyển đổi định dạng tệp sang Markdown`
      * `minit`: `[Flow] Quy trình nhà máy phần mềm MinIT`
      * `guidance`: `[Agent] Wrapper hướng dẫn hành vi Agent`
    - Tuyệt đối không đọc trường `env` hay `args` chứa credentials vào mô tả.
    - Xử lý chuẩn hóa token (RP3 Blind Spot Fix):
      * Nếu tên server chứa ký tự gạch chéo `/` (vd: `io.github.upstash/context7`, `microsoft/markitdown`):
        - Sinh token rút gọn: `/mcp:context7`, `/mcp:markitdown`.
        - Đồng thời sinh alias thay `/` bằng `-`: `/mcp:io.github.upstash-context7`.
        - Đảm bảo token tuân thủ hoàn toàn regex `[\p{L}0-9_.:-]`, không bị vỡ token do ký tự `/`.
    - Trả về mảng các đối tượng `{ token, desc }`.
  - Code snippet minh họa:
    ```javascript
    function discoverMcpCommands() {
        const mcpMap = new Map();
        const candidates = [];
        const home = os.homedir();
        const codeUser = process.platform === 'win32'
            ? path.join(home, 'AppData', 'Roaming', 'Code', 'User')
            : path.join(home, '.config', 'Code', 'User');

        const profilesDir = path.join(codeUser, 'profiles');
        if (fs.existsSync(profilesDir)) {
            try {
                const profiles = fs.readdirSync(profilesDir, { withFileTypes: true });
                for (const p of profiles) {
                    if (p.isDirectory()) {
                        candidates.push(path.join(profilesDir, p.name, 'mcp.json'));
                    }
                }
            } catch (e) {}
        }
        candidates.push(path.join(codeUser, 'mcp.json'));

        for (const mcpPath of candidates) {
            if (!fs.existsSync(mcpPath)) continue;
            try {
                const raw = fs.readFileSync(mcpPath, 'utf8');
                const data = JSON.parse(raw);
                if (data && data.servers && typeof data.servers === 'object') {
                    for (const [name, config] of Object.entries(data.servers)) {
                        let desc = `[MCP] Server ${name}`;
                        const lower = name.toLowerCase();
                        if (lower.includes('postgres') || lower.includes('mssql') || lower.includes('oracle') || lower.includes('db')) {
                            desc = `[MCP:DB] Quản trị & truy vấn cơ sở dữ liệu (${name})`;
                        } else if (lower.includes('playwright')) {
                            desc = `[MCP:E2E] Tự động hóa & kiểm thử trình duyệt web`;
                        } else if (lower.includes('search') || lower.includes('brave')) {
                            desc = `[MCP:Web] Tra cứu Internet & tài liệu trực tuyến`;
                        } else if (lower.includes('context7')) {
                            desc = `[MCP:Docs] Tra cứu tài liệu thư viện mã nguồn`;
                        } else if (lower.includes('sequential')) {
                            desc = `[MCP:Logic] Tư duy tuần tự bẻ nhỏ logic phức tạp`;
                        } else if (lower.includes('memory')) {
                            desc = `[MCP:Brain] Đồ thị tri thức & bộ nhớ dự án`;
                        } else if (lower.includes('filesy') || lower.includes('filesystem')) {
                            desc = `[MCP:File] Thao tác tệp tin cục bộ an toàn`;
                        } else if (lower.includes('markitdown')) {
                            desc = `[MCP:Tool] Chuyển đổi định dạng tệp sang Markdown`;
                        } else if (lower.includes('minit')) {
                            desc = `[MCP:Flow] Điều phối quy trình MinIT IT Factory`;
                        } else if (lower.includes('guidance')) {
                            desc = `[MCP:Agent] Wrapper hướng dẫn hành vi Agent`;
                        }

                        // Chuẩn hóa token tránh vỡ regex do ký tự /
                        if (name.includes('/')) {
                            const shortName = name.split('/').pop();
                            const primaryToken = '/mcp:' + shortName;
                            if (!mcpMap.has(primaryToken)) {
                                mcpMap.set(primaryToken, { token: primaryToken, desc: `${desc} [${name}]` });
                            }
                            const safeFullName = '/mcp:' + name.replace(/\//g, '-');
                            if (!mcpMap.has(safeFullName)) {
                                mcpMap.set(safeFullName, { token: safeFullName, desc });
                            }
                        } else {
                            const token = '/mcp:' + name;
                            if (!mcpMap.has(token)) {
                                mcpMap.set(token, { token, desc });
                            }
                        }
                    }
                }
            } catch (err) {}
        }
        return Array.from(mcpMap.values());
    }
    ```

- [x] **Task P01.2: Tích hợp MCP vào `discoverSlashCommands()` và `loadOrScanSlashCommands()`**
  - Files: `extension.js`, `apply_custom_css.js`
  - Chi tiết:
    - Gọi `discoverMcpCommands()` bên trong `discoverSlashCommands()` (`extension.js`) và `loadOrScanSlashCommands()` (`apply_custom_css.js`).
    - Nạp toàn bộ danh sách MCP vào `map` slash commands sau các lệnh mặc định và skills.

- [x] **Task P01.3: Cài đặt Realtime File Watcher cho `mcp.json`**
  - Files: `extension.js`
  - Chi tiết:
    - Trong hàm `setupExternalPromptWatchers(context)` hoặc hàm khởi tạo, đăng ký thêm watcher theo dõi đường dẫn chứa `mcp.json`.
    - Áp dụng cơ chế debounce 300ms khi nhận sự kiện thay đổi.
    - Tự động gọi `syncMacros(context, true)` để nạp lại dữ liệu và cập nhật `window.__jarvisSlashCommands`.

---

## 4. Conditional Quality Gates (Cấp Phase)

- **Security Gate: Passed.**
  - Tuyệt đối không đưa chuỗi kết nối, token bí mật hay mật khẩu trong file `mcp.json` vào mô tả `desc` hoặc mã JS header.
- **Data Gate: Not applicable.**
  - Không thay đổi cấu trúc lưu trữ cơ sở dữ liệu.
- **Accessibility Gate: Passed.**
  - Mô tả `desc` ngắn gọn (< 65 ký tự), chuẩn UTF-8 tiếng Việt không dấu ngoặc đơn lồng nhau.
- **Compatibility Gate: Passed.**
  - Cấu trúc đối tượng `{ token, desc }` tương thích 100% với phiên bản runtime trước đó.

---

## 5. Phase Rollback (Cục bộ)

- Nếu việc đọc file `mcp.json` gây chậm hoặc lỗi, revert file `extension.js` và `apply_custom_css.js` về commit gốc:
  `git checkout HEAD -- extension.js apply_custom_css.js`

---

## 6. Phase Verification & DoD Checklist

- **Pre-check (Phase DoR):**
  - [x] Đã xác minh file `mcp.json` tồn tại và chứa đủ 14 server.
  - [x] Đã kiểm tra điểm gọi của `discoverSlashCommands` và `loadOrScanSlashCommands`.

- **Execution Verification (Mapped Test Checks):**
  - Check ID: `T-001`
  - Lệnh kiểm tra: `node -e "const s = require('./apply_custom_css.js'); console.log(loadOrScanSlashCommands().filter(x => x.token.startsWith('/mcp:')))"`
  - Kết quả kỳ vọng: Trả về danh sách 14 đối tượng có token dạng `/mcp:<server_name>`.

- **Post-check (Phase DoD):**
  - [x] Cả 3 tasks P01.1, P01.2, P01.3 đã hoàn thành (`[x]`).
  - [x] Không có lỗi linting hay compiler error.
  - [x] Đã đồng bộ trạng thái Phase P01 trong Master Plan thành `Done`.
