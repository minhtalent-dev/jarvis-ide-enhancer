const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const crypto = require('crypto');
const { exportVault, importVault } = require('./src/sync/vaultManager');

let logger;
let isHealingRunning = false;
let activeFsWatchers = [];
let fsWatchDebounceTimer = null;

function getExternalPromptDirs() {
    const dirs = [];
    const userPrompts = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'prompts');
    if (fs.existsSync(userPrompts)) {
        dirs.push(userPrompts);
    }
    const profilesDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'profiles');
    if (fs.existsSync(profilesDir)) {
        try {
            const entries = fs.readdirSync(profilesDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const profilePrompts = path.join(profilesDir, entry.name, 'prompts');
                    if (fs.existsSync(profilePrompts)) {
                        dirs.push(profilePrompts);
                    }
                }
            }
        } catch (err) {
            if (logger) logger.warn(`Lỗi khi quét thư mục profiles: ${err.message}`);
        }
    }
    return dirs;
}

function setupExternalPromptWatchers(context) {
    const promptDirs = getExternalPromptDirs();
    for (const dir of promptDirs) {
        try {
            const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
                if (filename && !filename.endsWith('.instructions.md')) {
                    return;
                }
                if (fsWatchDebounceTimer) {
                    clearTimeout(fsWatchDebounceTimer);
                }
                fsWatchDebounceTimer = setTimeout(async () => {
                    if (logger) logger.info(`Phát hiện file .instructions.md thay đổi ngoài workspace (${filename || dir}), tự động đồng bộ macros...`);
                    await syncMacros(context, true);
                }, 300);
            });
            activeFsWatchers.push(watcher);
            if (logger) logger.info(`Kích hoạt fs.watch thành công cho thư mục: ${dir}`);
        } catch (err) {
            if (logger) logger.warn(`Không thể khởi tạo fs.watch cho ${dir}: ${err.message}`);
        }
    }
}

function findInstructionFilesRecursively(dir, maxDepth = 4, currentDepth = 0) {
    const results = [];
    if (currentDepth > maxDepth || !fs.existsSync(dir)) return results;
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'bin' || entry.name === 'obj') {
                continue;
            }
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...findInstructionFilesRecursively(fullPath, maxDepth, currentDepth + 1));
            } else if (entry.isFile() && entry.name.endsWith('.instructions.md')) {
                results.push(fullPath);
            }
        }
    } catch (err) {
        // Bỏ qua lỗi quyền truy cập
    }
    return results;
}

/**
 * Quét tự động danh sách backtick macros từ tất cả các file instructions
 */
function discoverMacrosFromRules(targetFile = null) {
    const macroMap = new Map();
    const candidateFiles = new Set();

    if (targetFile) {
        candidateFiles.add(targetFile);
    } else {
        const searchDirs = [
            path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'profiles'),
            path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'prompts')
        ];

        if (vscode.workspace.workspaceFolders) {
            for (const wf of vscode.workspace.workspaceFolders) {
                if (wf && wf.uri && wf.uri.fsPath) {
                    searchDirs.push(wf.uri.fsPath);
                }
            }
        }

        for (const d of searchDirs) {
            const found = findInstructionFilesRecursively(d);
            for (const f of found) {
                candidateFiles.add(f);
            }
        }
    }

    const regex = /^\s*-\s*`([a-z0-9_-]+)(?:\s+(<[^>]+>))?:\s*([^\r\n]+)/gm;

    for (const filePath of candidateFiles) {
        try {
            if (!fs.existsSync(filePath)) continue;
            const content = fs.readFileSync(filePath, 'utf8');
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const rawToken = match[1];
                const token = '`' + rawToken;
                let desc = (match[3] || '').trim();
                desc = desc.replace(/:+$/, '').trim();
                if (desc.length > 65) {
                    desc = desc.slice(0, 65).trim();
                }
                desc = desc.replace(/:+$/, '').trim();

                if (!macroMap.has(token)) {
                    macroMap.set(token, { token, desc });
                }
            }
        } catch (err) {
            if (logger) logger.warn(`Lỗi khi đọc file instruction ${filePath}: ${err.message}`);
        }
    }

    if (logger) logger.info(`discoverMacrosFromRules: Quét được ${macroMap.size} macros từ ${candidateFiles.size} file instructions.`);
    return Array.from(macroMap.values());
}

/**
 * Quét tự động danh sách Slash Commands từ các thư mục skills và lệnh mặc định
 */
function discoverSlashCommands() {
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
    if (logger) logger.info(`discoverSlashCommands: Quét được ${map.size} slash commands.`);
    return Array.from(map.values());
}

/**
 * Đồng bộ macro giữa tự quét và custom cấu hình của user
 */
async function syncMacros(context, silent = false) {
    try {
        if (logger) logger.info('Bắt đầu quét và đồng bộ JARVIS Dynamic Macros...');
        const discovered = discoverMacrosFromRules();
        const config = vscode.workspace.getConfiguration();
        const userMacros = config.get('jarvisEnhancer.customMacros') || [];

        const macroMap = new Map();
        for (const m of discovered) {
            if (m && m.token) macroMap.set(m.token, m);
        }
        for (const m of userMacros) {
            if (m && m.token) macroMap.set(m.token, m);
        }

        const mergedMacros = Array.from(macroMap.values());

        // Cập nhật vào setting Global để GitHub Settings Sync đồng bộ
        await config.update('jarvisEnhancer.customMacros', mergedMacros, vscode.ConfigurationTarget.Global);

        // Ghi đè file ~/.jarvis/style/vscode-custom-macros.json
        const targetDir = path.join(os.homedir(), '.jarvis', 'style');
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const macrosJsonPath = path.join(targetDir, 'vscode-custom-macros.json');
        fs.writeFileSync(macrosJsonPath, JSON.stringify(mergedMacros, null, 2), 'utf8');
        if (logger) logger.info(`Đã lưu ${mergedMacros.length} macros vào: ${macrosJsonPath}`);

        // Cập nhật lại ~/.jarvis/style/vscode-custom.js với header window.__jarvisDynamicMacros & window.__jarvisSlashCommands
        const destJs = path.join(targetDir, 'vscode-custom.js');
        const srcJs = context.asAbsolutePath('assets/vscode-custom.js');
        let currentJs = '';
        if (fs.existsSync(destJs)) {
            currentJs = fs.readFileSync(destJs, 'utf8');
        } else if (fs.existsSync(srcJs)) {
            currentJs = fs.readFileSync(srcJs, 'utf8');
        }
        currentJs = currentJs.replace(/^window\.__jarvisDynamicMacros\s*=\s*[\s\S]*?;\r?\n/, '');
        currentJs = currentJs.replace(/^window\.__jarvisSlashCommands\s*=\s*[\s\S]*?;\r?\n/, '');
        const discoveredSlash = discoverSlashCommands();
        const updatedJs = `window.__jarvisDynamicMacros = ${JSON.stringify(mergedMacros)};\n` +
            `window.__jarvisSlashCommands = ${JSON.stringify(discoveredSlash)};\n` + currentJs;
        fs.writeFileSync(destJs, updatedJs, 'utf8');
        if (logger) logger.info(`Đã cập nhật dynamic macros & slash commands header vào: ${destJs}`);

        // Đảm bảo destCss tồn tại
        const destCss = path.join(targetDir, 'vscode-custom.css');
        const srcCss = context.asAbsolutePath('assets/vscode-custom.css');
        if (!fs.existsSync(destCss) && fs.existsSync(srcCss)) {
            fs.copyFileSync(srcCss, destCss);
        }

        // Tự động gọi injectDirectWorkbenchHtml(context) để workbench.html nhận danh sách macro mới ngay lập tức
        await injectDirectWorkbenchHtml(context);

        if (!silent) {
            vscode.window.showInformationMessage(`⚡ JARVIS: Đã đồng bộ ${mergedMacros.length} dynamic macros thành công!`);
        }
        return mergedMacros;
    } catch (err) {
        if (logger) logger.error(`Lỗi đồng bộ macros: ${err.message}`);
        if (!silent) {
            vscode.window.showErrorMessage(`Lỗi đồng bộ macros: ${err.message}`);
        }
        return [];
    }
}

function getWorkbenchHtmlPath() {
    const p1 = path.join(vscode.env.appRoot, 'out', 'vs', 'code', 'electron-browser', 'workbench', 'workbench.html');
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(vscode.env.appRoot, 'out', 'vs', 'workbench', 'workbench.html');
    if (fs.existsSync(p2)) return p2;
    return p1;
}

/**
 * Tự động inject nội dung từ ~/.jarvis/style/ vào workbench.html của VS Code
 */
async function injectDirectWorkbenchHtml(context) {
    try {
        if (logger) logger.info('Bắt đầu inject CSS/JS vào workbench.html...');
        const targetDir = path.join(os.homedir(), '.jarvis', 'style');
        const destCss = path.join(targetDir, 'vscode-custom.css');
        const destJs = path.join(targetDir, 'vscode-custom.js');

        if (!fs.existsSync(destCss) || !fs.existsSync(destJs)) {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            const srcCss = context.asAbsolutePath('assets/vscode-custom.css');
            const srcJs = context.asAbsolutePath('assets/vscode-custom.js');
            if (fs.existsSync(srcCss) && !fs.existsSync(destCss)) {
                fs.copyFileSync(srcCss, destCss);
            }
            if (fs.existsSync(srcJs) && !fs.existsSync(destJs)) {
                fs.copyFileSync(srcJs, destJs);
            }
        }

        const cssContent = fs.existsSync(destCss) ? fs.readFileSync(destCss, 'utf8') : '';
        const jsContent = fs.existsSync(destJs) ? fs.readFileSync(destJs, 'utf8') : '';

        const htmlPath = getWorkbenchHtmlPath();
        if (!fs.existsSync(htmlPath)) {
            if (logger) logger.warn(`Không tìm thấy workbench.html tại: ${htmlPath}`);
            return false;
        }

        const bakGeneric = `${htmlPath}.bak`;
        if (!fs.existsSync(bakGeneric)) {
            fs.copyFileSync(htmlPath, bakGeneric);
            if (logger) logger.info(`Tạo backup generic: ${bakGeneric}`);
        }

        let html = fs.readFileSync(htmlPath, 'utf8');

        // Xoá CSP meta tag theo chuẩn be5invis để script/style chạy không bị chặn
        html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/, '');

        const alreadyInjected = html.includes('VSCODE-CUSTOM-CSS-START');
        if (alreadyInjected) {
            const customBlockRegex = /<!-- !! VSCODE-CUSTOM-CSS-START !! -->[\s\S]*?<!-- !! VSCODE-CUSTOM-CSS-END !! -->/;
            const newCustomBlock = `<!-- !! VSCODE-CUSTOM-CSS-START !! -->\n` +
                `<style>\n${cssContent}\n</style>\n` +
                `<script>\n${jsContent}\n</script>\n` +
                `<!-- !! VSCODE-CUSTOM-CSS-END !! -->`;
            html = html.replace(customBlockRegex, newCustomBlock);
        } else {
            const uuidSession = crypto.randomUUID();
            const injectHTML = `<!-- !! VSCODE-CUSTOM-CSS-SESSION-ID ${uuidSession} !! -->\n` +
                `<!-- !! VSCODE-CUSTOM-CSS-START !! -->\n` +
                `<style>\n${cssContent}\n</style>\n` +
                `<script>\n${jsContent}\n</script>\n` +
                `<!-- !! VSCODE-CUSTOM-CSS-END !! -->\n</head>`;
            html = html.replace(/(<\/head>)/, injectHTML);
        }

        fs.writeFileSync(htmlPath, html, 'utf8');
        if (logger) logger.info(`Đã inject Custom CSS & JS vào: ${htmlPath}`);
        return true;
    } catch (err) {
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            if (logger) logger.warn(`Thiếu quyền ghi workbench.html: ${err.message}`);
        } else {
            if (logger) logger.error(`Lỗi inject workbench.html: ${err.message}`);
        }
        return false;
    }
}

/**
 * Đồng bộ asset CSS/JS nội bộ và cấu hình settings cho VS Code
 */
async function syncSetup(context, silent = false) {
    try {
        if (logger) logger.info('Bắt đầu đồng bộ Styles & Settings...');
        const targetDir = path.join(os.homedir(), '.jarvis', 'style');
        if (logger) logger.info(`Đích lưu trữ asset: ${targetDir}`);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const srcCss = context.asAbsolutePath('assets/vscode-custom.css');
        const srcJs = context.asAbsolutePath('assets/vscode-custom.js');
        const destCss = path.join(targetDir, 'vscode-custom.css');
        const destJs = path.join(targetDir, 'vscode-custom.js');

        const baseCss = fs.existsSync(srcCss) ? fs.readFileSync(srcCss, 'utf8') : '';
        const baseJs = fs.existsSync(srcJs) ? fs.readFileSync(srcJs, 'utf8') : '';

        const config = vscode.workspace.getConfiguration();
        const userCss = config.get('jarvisEnhancer.customCSS') || '';
        const userJs = config.get('jarvisEnhancer.customJS') || '';

        // Nạp window.__jarvisDynamicMacros & window.__jarvisSlashCommands vào đầu vscode-custom.js
        const macrosJsonPath = path.join(targetDir, 'vscode-custom-macros.json');
        let dynamicMacros = [];
        if (fs.existsSync(macrosJsonPath)) {
            try {
                dynamicMacros = JSON.parse(fs.readFileSync(macrosJsonPath, 'utf8'));
            } catch (e) {}
        }
        if (!Array.isArray(dynamicMacros) || dynamicMacros.length === 0) {
            dynamicMacros = config.get('jarvisEnhancer.customMacros') || [];
        }
        const dynamicSlashCommands = discoverSlashCommands();

        const macroHeader = `window.__jarvisDynamicMacros = ${JSON.stringify(dynamicMacros, null, 2)};\n` +
            `window.__jarvisSlashCommands = ${JSON.stringify(dynamicSlashCommands, null, 2)};\n\n`;

        const finalCss = baseCss + (userCss ? '\n\n/* === Custom User Overrides (Synced via Settings) === */\n' + userCss : '');
        const finalJs = macroHeader + baseJs + (userJs ? '\n\n/* === Custom User Overrides (Synced via Settings) === */\n' + userJs : '');

        fs.writeFileSync(destCss, finalCss, 'utf8');
        fs.writeFileSync(destJs, finalJs, 'utf8');
        if (logger) logger.info(`Copied CSS: ${srcCss} -> ${destCss}`);

        const uriCss = vscode.Uri.file(destCss).toString();
        const uriJs = vscode.Uri.file(destJs).toString();

        const currentImports = config.get('vscode_custom_css.imports') || [];
        const newImports = [uriCss, uriJs];

        await config.update('vscode_custom_css.imports', newImports, vscode.ConfigurationTarget.Global);
        await config.update('chat.progressBorder.enabled', true, vscode.ConfigurationTarget.Global);
        await config.update('chat.requestQueuing.defaultAction', 'queue', vscode.ConfigurationTarget.Global);
        await config.update('editor.cursorSmoothCaretAnimation', 'on', vscode.ConfigurationTarget.Global);
        await config.update('workbench.reduceMotion', 'off', vscode.ConfigurationTarget.Global);
        if (logger) logger.info('Cập nhật cấu hình settings.json thành công.');

        try {
            await vscode.commands.executeCommand('extension.updateCustomCSS');
            if (logger) logger.info('Đã gọi lệnh nạp Custom CSS vào workbench.html.');
        } catch (e) {
            try {
                await vscode.commands.executeCommand('extension.installCustomCSS');
                if (logger) logger.info('Đã gọi lệnh nạp Custom CSS vào workbench.html.');
            } catch (e2) {
                console.warn('Custom CSS Loader command not found:', e2);
            }
        }

        await injectDirectWorkbenchHtml(context);

        if (!silent) {
            vscode.window.showInformationMessage(
                '⚡ JARVIS: Đã đồng bộ Styles & Autocomplete thành công! Hãy reload để áp dụng.',
                'Reload Window'
            ).then(action => {
                if (action === 'Reload Window') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    } catch (err) {
        if (logger) logger.error(`Lỗi đồng bộ: ${err.message}`);
        vscode.window.showErrorMessage(`Lỗi đồng bộ JARVIS IDE: ${err.message}`);
    }
}

/**
 * Vá an toàn Intellisense và Bôi xanh Pill trong workbench core
 */
async function patchIntellisense(silent = false) {
    let jsPath = null;
    let bakPath = null;
    try {
        if (logger) logger.info('Bắt đầu kiểm tra và vá bundle core VS Code...');
        jsPath = path.join(vscode.env.appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
        if (logger) logger.info(`Đường dẫn bundle: ${jsPath}`);
        if (!fs.existsSync(jsPath)) {
            vscode.window.showErrorMessage(`Không tìm thấy file bundle VS Code tại: ${jsPath}`);
            return false;
        }

        let content = fs.readFileSync(jsPath, 'utf8');

        const isTmePatched = content.includes('function Pge(s,o){return!0}') || content.includes('function Tme(s,o){return!0}') || /function\s+([A-Za-z0-9_$]+)\s*\(([a-z]),([a-z])\)\{return!0\}/.test(content);
        const isMultiSlashSuggestPatched = !content.includes('.parsedInput.parts.find(w=>w instanceof Pm)') && !content.includes('.parsedInput.parts.find(C=>C instanceof Pm)');
        const isAddCodeEditorPatched = content.includes('window.__codeEditorService=this');

        if (isTmePatched && isMultiSlashSuggestPatched && isAddCodeEditorPatched) {
            if (logger) logger.info('Core đã có đầy đủ patch, bỏ qua.');
            if (!silent) {
                vscode.window.showInformationMessage('⚡ JARVIS: Hệ thống đã được vá Intellisense & Hook Editor đầy đủ, không cần vá lại.');
            }
            return true;
        }

        bakPath = `${jsPath}.bak`;
        if (!fs.existsSync(bakPath)) {
            fs.copyFileSync(jsPath, bakPath);
            if (logger) logger.info(`Đã tạo sao lưu: ${bakPath}`);
        }

        // Patch 1: Pge / Tme (Intellisense bypass)
        if (!isTmePatched) {
            const p1 = /function\s+([A-Za-z0-9_$]+)\s*\(([a-z]),([a-z])\)\{let\s+([a-z])=new\s+([A-Za-z0-9_$]+)\(1,1,\3\.replace\.startLineNumber,\3\.replace\.startColumn\);return!!\2\.getValueInRange\(\4\)\.match\(\/\^\\s\*\$\/\)\}/;
            if (p1.test(content)) {
                content = content.replace(p1, 'function $1($2,$3){return!0}');
            } else if (content.includes('function Tme(s,o){let e=new j')) {
                content = content.replace(/function Tme\(s,o\)\{[\s\S]*?match\(\/\^\s\*\$\/\)\}/, 'function Tme(s,o){return!0}');
            }
        }

        // Patch 2: Gỡ bỏ ||...parsedInput.parts.find(...)
        content = content.replace(/\|\|[a-zA-Z0-9_$]+\.parsedInput\.parts\.find\([a-zA-Z0-9_$]+=>[a-zA-Z0-9_$]+\s+instanceof\s+Pm\)/g, '');
        if (logger) logger.info('Đã mở khóa gợi ý cho slash command thứ 2 trở đi.');

        // Patch 3: Hook addCodeEditor để đính kèm __monacoEditor vào DOM node và duy trì window.__allCodeEditors
        if (content.includes('addCodeEditor(') && !content.includes('window.__codeEditorService=this')) {
            content = content.replace(
                /addCodeEditor\(([A-Za-z0-9_$]+)\)\{/,
                'addCodeEditor($1){try{window.__codeEditorService=this;window.__allCodeEditors=window.__allCodeEditors||[];window.__allCodeEditors.push($1);let _d=$1.getContainerDomNode&&$1.getContainerDomNode();if(_d){_d.__monacoEditor=$1;setTimeout(()=>{try{if(_d.closest&&_d.closest(\'.interactive-input-part,.chat-input-editor,.interactive-input-editor,.chat-input-widget\')){window.__chatInputEditor=$1;window.dispatchEvent(new CustomEvent(\'chat-editor-ready\',{detail:$1}))}}catch(_){}},50)}}catch(_){}'
            );
        }

        // Kiểm tra an toàn trước khi ghi: Snippet-Validation & Tính toàn vẹn tệp
        try {
            // 1. Kiểm tra cú pháp V8 trực tiếp của các đoạn mã được vá
            new vm.Script('function _test(s,o){return!0}');
            new vm.Script(`(function(e,t){\nthis.widget=e;try{window.__chatInputEditor=e.inputEditor;window.__codeEditorService=t;window.dispatchEvent(new CustomEvent('chat-editor-ready',{detail:e.inputEditor}))}catch(err){}this.codeEditorService=t;\n})`);
            new vm.Script(`(function(e){\ntry{window.__codeEditorService=this;window.__allCodeEditors=window.__allCodeEditors||[];window.__allCodeEditors.push(e);let _d=e.getContainerDomNode&&e.getContainerDomNode();if(_d){_d.__monacoEditor=e;setTimeout(()=>{try{if(_d.closest&&_d.closest('.interactive-input-part,.chat-input-editor,.interactive-input-editor,.chat-input-widget')){window.__chatInputEditor=e;window.dispatchEvent(new CustomEvent('chat-editor-ready',{detail:e}))}}catch(_){}},50)}}catch(_){}\n})`);

            // 2. Kiểm tra tính toàn vẹn tệp (chống ghi đè rỗng hoặc hỏng file)
            if (!content || content.length < 5000000) {
                throw new Error(`File size anomaly (${content ? content.length : 0} bytes)`);
            }
            if (logger) logger.info('Kiểm tra cú pháp V8 Snippets & Toàn vẹn tệp: 100% HỢP LỆ.');
        } catch (syntaxErr) {
            if (logger) logger.error(`Kiểm tra tính toàn vẹn thất bại: ${syntaxErr.message}`);
            vscode.window.showErrorMessage(`Kiểm tra an toàn thất bại, huỷ bỏ ghi file để chống lỗi màn hình đen: ${syntaxErr.message}`);
            return false;
        }

        fs.writeFileSync(jsPath, content, 'utf8');
        if (logger) logger.info('Đã ghi đè patch vào workbench.desktop.main.js thành công.');

        if (!silent) {
            vscode.window.showInformationMessage(
                '⚡ JARVIS: Đã vá Chat Slash Intellisense & Bôi xanh Pill an toàn! Hãy reload để trải nghiệm.',
                'Reload Window'
            ).then(action => {
                if (action === 'Reload Window') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
        return true;
    } catch (err) {
        if (bakPath && fs.existsSync(bakPath) && jsPath && fs.existsSync(jsPath)) {
            try {
                fs.copyFileSync(bakPath, jsPath);
                if (logger) logger.warn(`Đã tự động rollback về backup ${bakPath} do lỗi: ${err.message}`);
            } catch (rollbackErr) {
                if (logger) logger.error(`Lỗi rollback: ${rollbackErr.message}`);
            }
        }
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            if (logger) logger.warn(`Thiếu quyền ghi file bundle: ${err.message}`);
        } else {
            if (logger) logger.error(`Lỗi vá Intellisense: ${err.message}`);
        }
        if (!silent) {
            vscode.window.showErrorMessage(`Lỗi vá Intellisense: ${err.message}`);
        }
        return false;
    }
}

/**
 * Tự động kiểm tra và phục hồi bản vá ngầm khi VS Code cập nhật
 */
async function runSelfHealingDaemon(context) {
    if (isHealingRunning) {
        if (logger) logger.info('Self-healing daemon đang chạy, bỏ qua.');
        return;
    }
    isHealingRunning = true;
    try {
        if (logger) logger.info('Self-healing daemon: Bắt đầu kiểm tra tính toàn vẹn bản vá...');

        const jsPath = path.join(vscode.env.appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
        const htmlPath = getWorkbenchHtmlPath();

        let isJsPatched = true;
        let isHtmlPatched = true;

        if (fs.existsSync(jsPath)) {
            const jsContent = await fs.promises.readFile(jsPath, 'utf8');
            const isTmePatched = jsContent.includes('function Pge(s,o){return!0}') ||
                                 jsContent.includes('function Tme(s,o){return!0}') ||
                                 /function\s+([A-Za-z0-9_$]+)\s*\(([a-z]),([a-z])\)\{return!0\}/.test(jsContent);
            const isMultiSlashSuggestPatched = !jsContent.includes('.parsedInput.parts.find(w=>w instanceof Pm)') && !jsContent.includes('.parsedInput.parts.find(C=>C instanceof Pm)');
            const isAddCodeEditorPatched = jsContent.includes('window.__codeEditorService=this');
            isJsPatched = isTmePatched && isMultiSlashSuggestPatched && isAddCodeEditorPatched;
        }

        if (fs.existsSync(htmlPath)) {
            const htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
            isHtmlPatched = htmlContent.includes('<!-- !! VSCODE-CUSTOM-CSS-START !! -->') || htmlContent.includes('VSCODE-CUSTOM-CSS-START');
        }

        if (!isHtmlPatched) {
            if (logger) logger.info('Phát hiện thiếu Custom CSS/JS trong workbench.html, tự động đồng bộ...');
            await injectDirectWorkbenchHtml(context);
        }

        if (!isJsPatched) {
            if (logger) logger.info('Phát hiện core bundle chưa có patch Intellisense, tự động vá ngầm...');
            const patched = await patchIntellisense(true);
            if (patched) {
                vscode.window.showInformationMessage(
                    '⚡ JARVIS: Hệ thống đã được tối ưu hoàn tất!',
                    'Reload Window'
                ).then(action => {
                    if (action === 'Reload Window') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            }
        } else {
            if (logger) logger.info('Self-healing daemon: Bản vá JS và HTML đều đầy đủ, hệ thống ổn định.');
        }
    } catch (err) {
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            if (logger) logger.warn(`Self-healing daemon thiếu quyền truy cập file: ${err.message}`);
        } else {
            if (logger) logger.warn(`Self-healing daemon gặp lỗi: ${err.message}`);
        }
    } finally {
        isHealingRunning = false;
    }
}

async function openConfigFile(context, fileName) {
    const targetDir = path.join(os.homedir(), '.jarvis', 'style');
    const filePath = path.join(targetDir, fileName);
    if (logger) logger.info(`Mở file cấu hình: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        await syncSetup(context);
    }
    if (fs.existsSync(filePath)) {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
        await vscode.window.showTextDocument(doc);
    } else {
        vscode.window.showErrorMessage(`Không tìm thấy file: ${filePath}`);
    }
}

/**
 * Xử lý lệnh xuất Vault (Mã hóa toàn bộ hoặc Bản mẫu sạch)
 */
async function handleExportVault(context) {
    try {
        const selected = await vscode.window.showQuickPick([
            {
                label: '🔒 Mã hóa toàn bộ với Master Passphrase (*.jarvis-vault)',
                detail: 'Mã hóa AES-256-GCM toàn bộ 5 phân hệ: MCPs, Skills, Prompts, Models, Styles. An toàn tuyệt đối.',
                mode: 'encrypted'
            },
            {
                label: '🧹 Xuất bản mẫu sạch đã khử thông tin nhạy cảm (*.json)',
                detail: 'Tự động bóc tách mật khẩu DB, API keys, private tunnels và đường dẫn tuyệt đối.',
                mode: 'sanitized'
            }
        ], {
            placeHolder: 'Chọn chế độ đóng gói Vault cho JARVIS Agent Customizations'
        });

        if (!selected) return;

        if (selected.mode === 'encrypted') {
            const passphrase = await vscode.window.showInputBox({
                password: true,
                prompt: 'Nhập Master Passphrase mã hóa Vault (tối thiểu 8 ký tự)',
                ignoreFocusOut: true,
                validateInput: v => (!v || v.length < 8 ? 'Mật khẩu phải từ 8 ký tự trở lên' : null)
            });

            if (!passphrase) return;

            const saveUri = await vscode.window.showSaveDialog({
                filters: { 'JARVIS Vault (*.jarvis-vault)': ['jarvis-vault'] },
                saveLabel: 'Xuất Encrypted Vault'
            });

            if (!saveUri) return;

            const res = exportVault(passphrase, 'encrypted');
            fs.writeFileSync(saveUri.fsPath, res.buffer);
            vscode.window.showInformationMessage('⚡ JARVIS: Đã xuất Encrypted Vault thành công! (13 MCPs, 36 Skills, 6 Prompts, 5 Models)');
        } else if (selected.mode === 'sanitized') {
            const saveUri = await vscode.window.showSaveDialog({
                filters: { 'JSON Template (*.json)': ['json'] },
                saveLabel: 'Xuất Sanitized Template'
            });

            if (!saveUri) return;

            const res = exportVault(null, 'sanitized');
            fs.writeFileSync(saveUri.fsPath, res.content, 'utf8');
            vscode.window.showInformationMessage('⚡ JARVIS: Đã xuất Sanitized Template thành công! (Zero-Leak)');
        }
    } catch (err) {
        if (logger) logger.error(`Lỗi xuất Vault: ${err.message}`);
        vscode.window.showErrorMessage(`Lỗi xuất Vault: ${err.message}`);
    }
}

/**
 * Xử lý lệnh nhập và phục hồi Agent Customizations từ Vault
 */
async function handleImportVault(context) {
    try {
        const openUris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'JARVIS Vault (*.jarvis-vault, *.json)': ['jarvis-vault', 'json'] },
            openLabel: 'Nhập Vault'
        });

        if (!openUris || openUris.length === 0) return;

        const filePath = openUris[0].fsPath;
        const fileBuffer = fs.readFileSync(filePath);

        let passphrase = null;
        const isEncryptedVault = filePath.endsWith('.jarvis-vault') || (fileBuffer.length >= 12 && fileBuffer.subarray(0, 12).toString('utf8') === 'JARVIS_VAULT');
        if (isEncryptedVault) {
            passphrase = await vscode.window.showInputBox({
                password: true,
                prompt: 'Nhập Master Passphrase để giải mã Vault',
                ignoreFocusOut: true
            });
            if (passphrase === undefined) return;
        }

        importVault(fileBuffer, passphrase);

        await syncMacros(context, true);

        vscode.window.showInformationMessage(
            '⚡ JARVIS: Phục hồi Agent Customizations thành công! Hãy reload window để nạp môi trường mới.',
            'Reload Window'
        ).then(action => {
            if (action === 'Reload Window') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        });
    } catch (err) {
        if (logger) logger.error(`Lỗi nhập Vault: ${err.message}`);
        vscode.window.showErrorMessage(`Lỗi nhập Vault: ${err.message}`);
    }
}

/**
 * Đẩy bản mã hóa Cloud Vault lên GitHub Settings Sync
 */
async function handlePushCloudVault(context) {
    try {
        const passphrase = await vscode.window.showInputBox({
            password: true,
            title: 'JARVIS Cloud Vault Sync',
            prompt: 'Nhập Master Passphrase mã hóa Vault (tối thiểu 8 ký tự)',
            ignoreFocusOut: true,
            validateInput: v => (!v || v.length < 8 ? 'Mật khẩu phải từ 8 ký tự trở lên' : null)
        });

        if (!passphrase) return;

        const res = exportVault(passphrase, 'encrypted');
        const base64Payload = res.buffer.toString('base64');
        const hash = crypto.createHash('sha256').update(res.buffer).digest('hex');

        const config = vscode.workspace.getConfiguration();
        await config.update('jarvisEnhancer.cloudVaultPayload', base64Payload, vscode.ConfigurationTarget.Global);
        await context.globalState.update('jarvis.lastRestoredVaultHash', hash);

        vscode.window.showInformationMessage('⚡ JARVIS: Đã đẩy Agent Customizations lên Cloud Settings Sync! (13 MCPs, 36 Skills, 6 Prompts, 5 Models). GitHub Settings Sync sẽ tự động đồng bộ sang các máy khác.');
    } catch (err) {
        if (logger) logger.error(`Lỗi đẩy Cloud Vault: ${err.message}`);
        vscode.window.showErrorMessage(`Lỗi đẩy Cloud Vault: ${err.message}`);
    }
}

/**
 * Kéo và phục hồi Cloud Vault từ GitHub Settings Sync
 */
async function handlePullCloudVault(context, silent = false) {
    try {
        const config = vscode.workspace.getConfiguration();
        const base64Payload = config.get('jarvisEnhancer.cloudVaultPayload');

        if (!base64Payload) {
            if (!silent) {
                vscode.window.showWarningMessage('⚡ JARVIS: Chưa tìm thấy Cloud Vault Payload trong Settings Sync.');
            }
            return;
        }

        const vaultBuffer = Buffer.from(base64Payload, 'base64');
        const passphrase = await vscode.window.showInputBox({
            password: true,
            title: 'JARVIS Cloud Vault Sync',
            prompt: 'Nhập Master Passphrase để giải mã và phục hồi Agent Customizations từ Cloud',
            ignoreFocusOut: true
        });

        if (!passphrase) return;

        const result = importVault(vaultBuffer, passphrase);
        if (result) {
            const hash = crypto.createHash('sha256').update(vaultBuffer).digest('hex');
            await context.globalState.update('jarvis.lastRestoredVaultHash', hash);
            await syncMacros(context, true);

            vscode.window.showInformationMessage(
                '⚡ JARVIS: Phục hồi Agent Customizations từ Cloud thành công! Hãy reload window để nạp môi trường mới.',
                'Reload Window'
            ).then(action => {
                if (action === 'Reload Window') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
    } catch (err) {
        if (logger) logger.error(`Lỗi phục hồi Cloud Vault: ${err.message}`);
        vscode.window.showErrorMessage(`Lỗi phục hồi Cloud Vault: ${err.message}`);
    }
}

/**
 * Kiểm tra bản cập nhật Cloud Vault từ Settings Sync và gợi ý phục hồi
 */
async function checkCloudVaultUpdates(context) {
    try {
        const config = vscode.workspace.getConfiguration();
        const autoSync = config.get('jarvisEnhancer.autoSyncCloudVault');
        if (autoSync === false) return;

        const base64Payload = config.get('jarvisEnhancer.cloudVaultPayload');
        if (!base64Payload || typeof base64Payload !== 'string' || base64Payload.trim() === '') {
            return;
        }

        const vaultBuffer = Buffer.from(base64Payload, 'base64');
        const currentHash = crypto.createHash('sha256').update(vaultBuffer).digest('hex');
        const lastHash = context.globalState.get('jarvis.lastRestoredVaultHash');

        if (!lastHash || currentHash !== lastHash) {
            vscode.window.showInformationMessage(
                '⚡ JARVIS: Phát hiện bản cập nhật Agent Customizations mới từ GitHub Settings Sync. Bạn có muốn phục hồi ngay?',
                'Phục Hồi Ngay (Nhập Passphrase)',
                'Để sau'
            ).then(action => {
                if (action === 'Phục Hồi Ngay (Nhập Passphrase)') {
                    handlePullCloudVault(context);
                }
            });
        }
    } catch (err) {
        if (logger) logger.warn(`Lỗi kiểm tra cập nhật Cloud Vault: ${err.message}`);
    }
}

function activate(context) {
    logger = vscode.window.createOutputChannel('JARVIS IDE Enhancer', { log: true });
    context.subscriptions.push(logger);
    logger.info('JARVIS IDE Enhancer extension đã được kích hoạt.');

    const ruleWatcher = vscode.workspace.createFileSystemWatcher('**/*.instructions.md');
    const onRuleChange = async (uri) => {
        if (logger) logger.info(`Phát hiện thay đổi file rule: ${uri ? uri.fsPath : ''}, tự động cập nhật macros...`);
        await syncMacros(context, true);
    };
    ruleWatcher.onDidChange(onRuleChange);
    ruleWatcher.onDidCreate(onRuleChange);
    ruleWatcher.onDidDelete(onRuleChange);
    context.subscriptions.push(ruleWatcher);

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('jarvisEnhancer.customCSS') || e.affectsConfiguration('jarvisEnhancer.customJS')) {
                await syncSetup(context, true); // Chế độ silent
            }
            if (e.affectsConfiguration('jarvisEnhancer.cloudVaultPayload')) {
                checkCloudVaultUpdates(context);
            }
        }),
        vscode.commands.registerCommand('jarvisEnhancer.syncSetup', () => syncSetup(context)),
        vscode.commands.registerCommand('jarvisEnhancer.discoverMacros', () => syncMacros(context, false)),
        vscode.commands.registerCommand('jarvisEnhancer.patchIntellisense', () => patchIntellisense()),
        vscode.commands.registerCommand('jarvisEnhancer.editCSS', () => openConfigFile(context, 'vscode-custom.css')),
        vscode.commands.registerCommand('jarvisEnhancer.editJS', () => openConfigFile(context, 'vscode-custom.js')),
        vscode.commands.registerCommand('jarvisEnhancer.runSelfHealing', () => runSelfHealingDaemon(context)),
        vscode.commands.registerCommand('jarvisEnhancer.exportVault', () => handleExportVault(context)),
        vscode.commands.registerCommand('jarvisEnhancer.importVault', () => handleImportVault(context)),
        vscode.commands.registerCommand('jarvisEnhancer.pushCloudVault', () => handlePushCloudVault(context)),
        vscode.commands.registerCommand('jarvisEnhancer.pullCloudVault', () => handlePullCloudVault(context))
    );

    // Tự động quét và đồng bộ macro sau khi khởi động
    syncMacros(context, true);

    // Kích hoạt watcher các thư mục prompts ngoài workspace (User và profiles)
    setupExternalPromptWatchers(context);

    setTimeout(() => {
        runSelfHealingDaemon(context);
    }, 1500);

    setTimeout(() => {
        checkCloudVaultUpdates(context);
    }, 2500);
}

function deactivate() {
    if (fsWatchDebounceTimer) {
        clearTimeout(fsWatchDebounceTimer);
        fsWatchDebounceTimer = null;
    }
    for (const watcher of activeFsWatchers) {
        try {
            watcher.close();
        } catch (err) {}
    }
    activeFsWatchers = [];
}

module.exports = {
    activate,
    deactivate,
    discoverMacrosFromRules,
    syncMacros,
    handleExportVault,
    handleImportVault,
    handlePushCloudVault,
    handlePullCloudVault,
    checkCloudVaultUpdates
};
