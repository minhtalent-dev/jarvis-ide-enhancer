const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const assetsDir = path.join(__dirname, 'assets');
const jarvisStyleDir = path.join(os.homedir(), '.jarvis', 'style');

if (!fs.existsSync(jarvisStyleDir)) {
    fs.mkdirSync(jarvisStyleDir, { recursive: true });
}

// 1. Quét macro từ MY_RULE.instructions.md hoặc đọc vscode-custom-macros.json
function loadOrScanMacros() {
    const macroMap = new Map();
    const macrosJsonPath = path.join(jarvisStyleDir, 'vscode-custom-macros.json');

    // Đọc từ vscode-custom-macros.json nếu có
    if (fs.existsSync(macrosJsonPath)) {
        try {
            const cached = JSON.parse(fs.readFileSync(macrosJsonPath, 'utf8'));
            if (Array.isArray(cached)) {
                for (const m of cached) {
                    if (m && m.token) macroMap.set(m.token, m);
                }
            }
        } catch (e) {
            console.warn(`Lỗi đọc file ${macrosJsonPath}:`, e.message);
        }
    }

    // Quét tìm các file instructions (đặc biệt MY_RULE.instructions.md)
    const candidateFiles = [];
    const searchDirs = [
        path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'prompts'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'profiles'),
        __dirname
    ];

    function findInstructionFiles(dir, depth = 0) {
        if (depth > 4 || !fs.existsSync(dir)) return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    findInstructionFiles(fullPath, depth + 1);
                } else if (entry.isFile() && (entry.name === 'MY_RULE.instructions.md' || entry.name.endsWith('.instructions.md'))) {
                    candidateFiles.push(fullPath);
                }
            }
        } catch (err) {}
    }

    for (const d of searchDirs) {
        findInstructionFiles(d);
    }

    const regex = /^\s*-\s*`([a-z0-9_-]+)`?(?:\s+(<[^>]+>))?`?:\s*([^\r\n]+)/gm;
    for (const filePath of candidateFiles) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const token = '`' + match[1];
                const param = match[2] ? match[2].trim() : null;
                let desc = (match[3] || '').trim().replace(/:+$/, '').trim();
                if (desc.length > 65) desc = desc.slice(0, 65).trim().replace(/:+$/, '').trim();
                if (macroMap.has(token)) {
                    const existing = macroMap.get(token);
                    macroMap.set(token, { ...existing, token, desc, param: param || existing.param });
                } else {
                    macroMap.set(token, { token, desc, param });
                }
            }
        } catch (err) {}
    }

    const macros = Array.from(macroMap.values());
    if (macros.length > 0) {
        try {
            fs.writeFileSync(macrosJsonPath, JSON.stringify(macros, null, 2), 'utf8');
            console.log(`Đã cập nhật ${macros.length} macros vào: ${macrosJsonPath}`);
        } catch (err) {}
    }
    return macros;
}

/**
 * Quét tự động danh sách MCP servers từ mcp.json (Profile + Global User)
 * Chỉ trích xuất tên server và phân loại công nghệ — tuyệt đối không đọc env/args (bảo mật).
 */
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
                for (const name of Object.keys(data.servers)) {
                    let desc = `[MCP] Server ${name}`;
                    const lower = name.toLowerCase();
                    if (lower.includes('postgres') || lower.includes('mssql') || lower.includes('oracle') || (lower.includes('db') && !lower.includes('guidance'))) {
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

                    // Chuẩn hóa token: tên server chứa '/' sẽ làm vỡ regex pill -> rút gọn + alias an toàn
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
        } catch (err) {
            console.warn(`Lỗi khi đọc ${mcpPath}: ${err.message}`);
        }
    }
    return Array.from(mcpMap.values());
}

// 1.1. Quét slash commands từ skills (~/.agents/skills, ~/.copilot/skills, ~/.claude/skills)
function loadOrScanSlashCommands() {
    const list = [
        { token: '/explain', desc: 'Giải thích mã nguồn hoặc logic được chọn' },
        { token: '/fix', desc: 'Tìm và sửa lỗi trong đoạn mã' },
        { token: '/tests', desc: 'Tạo unit tests cho mã nguồn' },
        { token: '/doc', desc: 'Tạo tài liệu và chú thích mã nguồn' },
        { token: '/clear', desc: 'Xóa phiên chat hiện tại' },
        { token: '/setup-tests', desc: 'Thiết lập khung kiểm thử' },
        { token: '/new', desc: 'Khởi tạo scaffolding dự án mới' },
        { token: '/help', desc: 'Trợ giúp về Copilot và lệnh chat' }
    ];
    const map = new Map(list.map(i => [i.token, i]));
    const home = os.homedir();
    const skillRoots = [
        path.join(home, '.agents', 'skills'),
        path.join(home, '.copilot', 'skills'),
        path.join(home, '.claude', 'skills')
    ];

    for (const root of skillRoots) {
        if (!fs.existsSync(root)) continue;
        try {
            const entries = fs.readdirSync(root, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                const skillName = entry.name;
                const skillFile = path.join(root, skillName, 'SKILL.md');
                let desc = `Workflow skill ${skillName}`;
                if (fs.existsSync(skillFile)) {
                    try {
                        const content = fs.readFileSync(skillFile, 'utf8');
                        const m = content.match(/description:\s*["']?([^\r\n"']+)["']?/);
                        if (m && m[1]) {
                            desc = m[1].trim();
                            if (desc.length > 70) desc = desc.slice(0, 70).trim() + '...';
                        }
                    } catch (e) {}
                }
                const token = '/' + skillName;
                if (!map.has(token)) {
                    map.set(token, { token, desc });
                }
            }
        } catch (e) {}
    }

    // Gộp danh sách MCP servers từ mcp.json (token dạng /mcp:<name>)
    for (const mcp of discoverMcpCommands()) {
        if (mcp && mcp.token && !map.has(mcp.token)) {
            map.set(mcp.token, mcp);
        }
    }
    return Array.from(map.values());
}

// 2. Đảm bảo copy assets sang ~/.jarvis/style/ và inject dynamic macros/slash commands header
const srcCss = path.join(assetsDir, 'vscode-custom.css');
const srcJs = path.join(assetsDir, 'vscode-custom.js');
const destCss = path.join(jarvisStyleDir, 'vscode-custom.css');
const destJs = path.join(jarvisStyleDir, 'vscode-custom.js');

if (fs.existsSync(srcCss)) {
    fs.copyFileSync(srcCss, destCss);
    console.log(`Đã copy: ${srcCss} -> ${destCss}`);
} else {
    console.warn(`Không tìm thấy srcCss: ${srcCss}`);
}

const macros = loadOrScanMacros();
const slashCommands = loadOrScanSlashCommands();
const DEFAULT_QUICK_CHIPS = [
    { label: '⚡ Tiếp tục', token: '`tt', desc: 'Tiếp tục thực thi implementation' },
    { label: '📋 Kế hoạch', token: '`fp', desc: 'Reindex & lập Task Plan 100% không điểm mù' },
    { label: '💡 Gợi ý', token: '`rcm', desc: 'Gợi ý 3 phương án thực thi/sửa lỗi' },
    { label: '🚀 Commit', token: '`git', param: '<hash>', desc: 'Cập nhật changelog/readme và commit git' },
    { label: '🧪 Test DB', token: '`mtdb', param: '<target>', desc: 'Kiểm thử Oracle DB mes_test' },
    { label: '🧹 Clear', token: '/clear', desc: 'Xóa phiên trò chuyện hiện tại' }
];

function getEnrichedQuickChips(macroList) {
    let chips = DEFAULT_QUICK_CHIPS;
    const settingsPaths = [
        path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'profiles', '-7cf60fbb', 'settings.json'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'settings.json')
    ];
    for (const p of settingsPaths) {
        if (fs.existsSync(p)) {
            try {
                const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
                if (Array.isArray(parsed['jarvisEnhancer.quickChips']) && parsed['jarvisEnhancer.quickChips'].length > 0) {
                    chips = parsed['jarvisEnhancer.quickChips'];
                    break;
                }
            } catch (e) {}
        }
    }
    return chips.map(c => {
        if (!c || !c.token) return c;
        const m = macroList.find(item => item && item.token === c.token);
        if (m && m.param) {
            return { ...c, param: m.param };
        }
        return c;
    });
}

const enrichedChips = getEnrichedQuickChips(macros);
const macroHeader = `window.__jarvisDynamicMacros = ${JSON.stringify(macros)};\n` +
    `window.__jarvisSlashCommands = ${JSON.stringify(slashCommands)};\n` +
    `window.__jarvisQuickChips = ${JSON.stringify(enrichedChips)};\n`;

if (fs.existsSync(srcJs)) {
    let baseJs = fs.readFileSync(srcJs, 'utf8');
    baseJs = baseJs.replace(/^window\.__jarvisDynamicMacros\s*=\s*[\s\S]*?;\r?\n/, '');
    baseJs = baseJs.replace(/^window\.__jarvisSlashCommands\s*=\s*[\s\S]*?;\r?\n/, '');
    baseJs = baseJs.replace(/^window\.__jarvisQuickChips\s*=\s*[\s\S]*?;\r?\n/, '');
    const finalJs = macroHeader + baseJs;
    fs.writeFileSync(destJs, finalJs, 'utf8');
    console.log(`Đã ghi: ${srcJs} (kèm header ${macros.length} macros, ${slashCommands.length} slash commands) -> ${destJs}`);
} else {
    console.warn(`Không tìm thấy srcJs: ${srcJs}`);
}

// 3. Tìm và ghi đè vào workbench.html của VS Code
function getWorkbenchHtmlPath() {
    const baseDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs', 'Microsoft VS Code');
    if (fs.existsSync(baseDir)) {
        try {
            const candidates = [];
            const entries = fs.readdirSync(baseDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const candidate1 = path.join(baseDir, entry.name, 'resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html');
                    if (fs.existsSync(candidate1)) {
                        const stat = fs.statSync(candidate1);
                        candidates.push({ path: candidate1, mtime: stat.mtimeMs, name: entry.name });
                        continue;
                    }
                    const candidate2 = path.join(baseDir, entry.name, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.html');
                    if (fs.existsSync(candidate2)) {
                        const stat = fs.statSync(candidate2);
                        candidates.push({ path: candidate2, mtime: stat.mtimeMs, name: entry.name });
                    }
                }
            }
            if (candidates.length > 0) {
                candidates.sort((a, b) => b.mtime - a.mtime);
                console.log(`[JARVIS] Phát hiện workbench.html mới nhất: ${candidates[0].name} (${new Date(candidates[0].mtime).toLocaleString()})`);
                return candidates[0].path;
            }
        } catch (e) {}
    }
    return '';
}

const htmlPath = getWorkbenchHtmlPath();
if (!fs.existsSync(htmlPath)) {
    console.error(`ERROR: Không tìm thấy workbench.html tại ${htmlPath}`);
    process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// Tự động phục hồi nếu workbench.html bị rỗng hoặc lỗi mất thẻ </head>
if (!html || html.trim().length === 0 || !html.includes('</head>')) {
    console.warn('[JARVIS] workbench.html rỗng hoặc hỏng, đang tự động phục hồi từ backup...');
    const htmlDir = path.dirname(htmlPath);
    const bakGeneric = `${htmlPath}.bak`;
    let restored = false;
    if (fs.existsSync(bakGeneric)) {
        try {
            const bc = fs.readFileSync(bakGeneric, 'utf8');
            if (bc && bc.includes('</head>')) {
                html = bc;
                restored = true;
                console.log(`Đã phục hồi từ: ${bakGeneric}`);
            }
        } catch (_) {}
    }
    if (!restored) {
        try {
            const baks = fs.readdirSync(htmlDir).filter(f => f.includes('bak'));
            for (const b of baks) {
                const bp = path.join(htmlDir, b);
                try {
                    const bc = fs.readFileSync(bp, 'utf8');
                    if (bc && bc.includes('</head>')) {
                        html = bc;
                        restored = true;
                        console.log(`Đã phục hồi từ: ${bp}`);
                        break;
                    }
                } catch (_) {}
            }
        } catch (_) {}
    }
    if (!restored) {
        html = `<!-- Copyright (C) Microsoft Corporation. All rights reserved. -->\n<!DOCTYPE html>\n<html>\n\t<head>\n\t\t<meta charset="utf-8" />\n\t\t<!-- Workbench CSS -->\n\t\t<link rel="stylesheet" href="../../../workbench/workbench.desktop.main.css">\n\t</head>\n\t<body aria-label="">\n\t</body>\n\t<!-- Startup (do not modify order of script tags!) -->\n\t<script src="./workbench.js" type="module"></script>\n</html>`;
        console.log('Đã tạo lại workbench.html từ template chuẩn của VS Code.');
    }
}

const alreadyInjected = html.includes('VSCODE-CUSTOM-CSS-START');

const cssContent = fs.readFileSync(destCss, 'utf8');
const jsContent = fs.readFileSync(destJs, 'utf8');

if (alreadyInjected) {
    console.log('workbench.html đã được inject Custom CSS trước đó. Đang cập nhật CSS & JS mới nhất...');
    const customBlockRegex = /<!-- !! VSCODE-CUSTOM-CSS-START !! -->[\s\S]*?<!-- !! VSCODE-CUSTOM-CSS-END !! -->/;
    const newCustomBlock = `<!-- !! VSCODE-CUSTOM-CSS-START !! -->\n` +
        `<style>\n${cssContent}\n</style>\n` +
        `<script>\n${jsContent}\n</script>\n` +
        `<!-- !! VSCODE-CUSTOM-CSS-END !! -->`;
    html = html.replace(customBlockRegex, () => newCustomBlock);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`Đã cập nhật Custom CSS & JS vào: ${htmlPath}`);
} else {
    const uuidSession = crypto.randomUUID();
    const htmlDir = path.dirname(htmlPath);

    // Tạo backup theo chuẩn be5invis và chuẩn .bak
    const bakCustomCss = path.join(htmlDir, `workbench.${uuidSession}.bak-custom-css`);
    const bakGeneric = `${htmlPath}.bak`;

    if (!fs.existsSync(bakCustomCss)) {
        fs.copyFileSync(htmlPath, bakCustomCss);
        console.log(`Tạo backup be5invis: ${bakCustomCss}`);
    }
    if (!fs.existsSync(bakGeneric) || fs.statSync(bakGeneric).size === 0) {
        fs.copyFileSync(htmlPath, bakGeneric);
        console.log(`Tạo backup generic: ${bakGeneric}`);
    }

    // Xoá CSP meta tag theo chuẩn be5invis để script/style chạy không bị chặn
    html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, '');

    const injectHTML = `<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID ${uuidSession} !! -->\n` +
        `<!-- !! VSCODE-CUSTOM-CSS-START !! -->\n` +
        `<style>\n${cssContent}\n</style>\n` +
        `<script>\n${jsContent}\n</script>\n` +
        `<!-- !! VSCODE-CUSTOM-CSS-END !! -->\n</head>`;

    html = html.replace(/(<\/head>)/, () => injectHTML);

    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`Đã inject Custom CSS & JS vào: ${htmlPath}`);
}

// 4. Xác minh
const verifiedHtml = fs.readFileSync(htmlPath, 'utf8');
const hasStart = verifiedHtml.includes('<!-- !! VSCODE-CUSTOM-CSS-START !! -->');
const hasEnd = verifiedHtml.includes('<!-- !! VSCODE-CUSTOM-CSS-END !! -->');
const hasJarvisStyle = verifiedHtml.includes('jarvis-3d-cursor') || verifiedHtml.includes('.monaco-workbench');
const hasDynamicMacros = verifiedHtml.includes('__jarvisDynamicMacros');

console.log('=== KẾT QUẢ XÁC MINH WORKBENCH.HTML ===');
console.log('Has VSCODE-CUSTOM-CSS-START:', hasStart);
console.log('Has VSCODE-CUSTOM-CSS-END:', hasEnd);
console.log('Has Injected Content:', hasJarvisStyle);
console.log('Has Dynamic Macros Header:', hasDynamicMacros);

if (!hasStart || !hasEnd) {
    process.exit(1);
}
