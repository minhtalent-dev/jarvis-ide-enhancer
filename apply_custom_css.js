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

    const regex = /^\s*-\s*`([a-z0-9_-]+)(?:\s+(<[^>]+>))?:\s*([^\r\n]+)/gm;
    for (const filePath of candidateFiles) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const token = '`' + match[1];
                let desc = (match[3] || '').trim().replace(/:+$/, '').trim();
                if (desc.length > 65) desc = desc.slice(0, 65).trim().replace(/:+$/, '').trim();
                if (!macroMap.has(token)) {
                    macroMap.set(token, { token, desc });
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

// 2. Đảm bảo copy assets sang ~/.jarvis/style/ và inject dynamic macros header
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
const macroHeader = `window.__jarvisDynamicMacros = ${JSON.stringify(macros)};\n`;

if (fs.existsSync(srcJs)) {
    let baseJs = fs.readFileSync(srcJs, 'utf8');
    baseJs = baseJs.replace(/^window\.__jarvisDynamicMacros\s*=\s*[\s\S]*?;\r?\n/, '');
    const finalJs = macroHeader + baseJs;
    fs.writeFileSync(destJs, finalJs, 'utf8');
    console.log(`Đã ghi: ${srcJs} (kèm header ${macros.length} dynamic macros) -> ${destJs}`);
} else {
    console.warn(`Không tìm thấy srcJs: ${srcJs}`);
}

// 3. Tìm và ghi đè vào workbench.html của VS Code
function getWorkbenchHtmlPath() {
    const fixedPath = 'C:\\Users\\mes\\AppData\\Local\\Programs\\Microsoft VS Code\\2a59476c9b\\resources\\app\\out\\vs\\code\\electron-browser\\workbench\\workbench.html';
    if (fs.existsSync(fixedPath)) return fixedPath;
    const baseDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs', 'Microsoft VS Code');
    if (fs.existsSync(baseDir)) {
        try {
            const entries = fs.readdirSync(baseDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const candidate1 = path.join(baseDir, entry.name, 'resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html');
                    if (fs.existsSync(candidate1)) return candidate1;
                    const candidate2 = path.join(baseDir, entry.name, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.html');
                    if (fs.existsSync(candidate2)) return candidate2;
                }
            }
        } catch (e) {}
    }
    return fixedPath;
}

const htmlPath = getWorkbenchHtmlPath();
if (!fs.existsSync(htmlPath)) {
    console.error(`ERROR: Không tìm thấy workbench.html tại ${htmlPath}`);
    process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');
const alreadyInjected = html.includes('VSCODE-CUSTOM-CSS-START');

const cssContent = fs.readFileSync(destCss, 'utf8');
const jsContent = fs.readFileSync(destJs, 'utf8');

if (alreadyInjected) {
    console.log('workbench.html đã được inject Custom CSS trước đó. Đang cập nhật CSS & JS mới nhất...');
    const cssContent = fs.readFileSync(destCss, 'utf8');
    const jsContent = fs.readFileSync(destJs, 'utf8');
    const customBlockRegex = /<!-- !! VSCODE-CUSTOM-CSS-START !! -->[\s\S]*?<!-- !! VSCODE-CUSTOM-CSS-END !! -->/;
    const newCustomBlock = `<!-- !! VSCODE-CUSTOM-CSS-START !! -->\n` +
        `<style>\n${cssContent}\n</style>\n` +
        `<script>\n${jsContent}\n</script>\n` +
        `<!-- !! VSCODE-CUSTOM-CSS-END !! -->`;
    html = html.replace(customBlockRegex, newCustomBlock);
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
    if (!fs.existsSync(bakGeneric)) {
        fs.copyFileSync(htmlPath, bakGeneric);
        console.log(`Tạo backup generic: ${bakGeneric}`);
    }

    // Đọc nội dung css & js
    const cssContent = fs.readFileSync(destCss, 'utf8');
    const jsContent = fs.readFileSync(destJs, 'utf8');

    // Xoá CSP meta tag theo chuẩn be5invis để script/style chạy không bị chặn
    html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, '');

    const injectHTML = `<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID ${uuidSession} !! -->\n` +
        `<!-- !! VSCODE-CUSTOM-CSS-START !! -->\n` +
        `<style>\n${cssContent}\n</style>\n` +
        `<script>\n${jsContent}\n</script>\n` +
        `<!-- !! VSCODE-CUSTOM-CSS-END !! -->\n</head>`;

    html = html.replace(/(<\/head>)/, injectHTML);

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
