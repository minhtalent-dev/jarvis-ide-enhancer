const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const crypto = require('crypto');

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

        // Cập nhật lại ~/.jarvis/style/vscode-custom.js với header window.__jarvisDynamicMacros
        const destJs = path.join(targetDir, 'vscode-custom.js');
        const srcJs = context.asAbsolutePath('assets/vscode-custom.js');
        let currentJs = '';
        if (fs.existsSync(destJs)) {
            currentJs = fs.readFileSync(destJs, 'utf8');
        } else if (fs.existsSync(srcJs)) {
            currentJs = fs.readFileSync(srcJs, 'utf8');
        }
        currentJs = currentJs.replace(/^window\.__jarvisDynamicMacros\s*=\s*[\s\S]*?;\r?\n/, '');
        const updatedJs = `window.__jarvisDynamicMacros = ${JSON.stringify(mergedMacros)};\n` + currentJs;
        fs.writeFileSync(destJs, updatedJs, 'utf8');
        if (logger) logger.info(`Đã cập nhật dynamic macros header vào: ${destJs}`);

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

        // Nạp window.__jarvisDynamicMacros vào đầu vscode-custom.js
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

        const macroHeader = `window.__jarvisDynamicMacros = ${JSON.stringify(dynamicMacros, null, 2)};\n\n`;

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
        await patchIntellisense(true);

        if (!silent) {
            vscode.window.showInformationMessage(
                '⚡ JARVIS: Đã đồng bộ Styles & Vá Intellisense thành công! Hãy reload để áp dụng.',
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
    try {
        if (logger) logger.info('Bắt đầu kiểm tra và vá bundle core VS Code...');
        const jsPath = path.join(vscode.env.appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
        if (logger) logger.info(`Đường dẫn bundle: ${jsPath}`);
        if (!fs.existsSync(jsPath)) {
            vscode.window.showErrorMessage(`Không tìm thấy file bundle VS Code tại: ${jsPath}`);
            return false;
        }

        let content = fs.readFileSync(jsPath, 'utf8');

        const isTmePatched = content.includes('function Pge(s,o){return!0}') || content.includes('function Tme(s,o){return!0}') || /function\s+([A-Za-z0-9_$]+)\s*\(([a-z]),([a-z])\)\{return!0\}/.test(content);
        const isZaePatched = (content.includes("window.__chatInputEditor=e.inputEditor") || content.includes("window.__chatInputEditor=")) && content.includes("window.__codeEditorService=t;");

        if (isTmePatched && isZaePatched) {
            if (logger) logger.info('Core đã có đầy đủ patch, bỏ qua.');
            if (!silent) {
                vscode.window.showInformationMessage('⚡ JARVIS: Hệ thống đã được vá Intellisense & Hook Editor đầy đủ, không cần vá lại.');
            }
            return true;
        }

        const bakPath = `${jsPath}.bak`;
        if (!fs.existsSync(bakPath)) {
            fs.copyFileSync(jsPath, bakPath);
            if (logger) logger.info(`Đã tạo sao lưu: ${bakPath}`);
        }

        // Patch 1: Tme / Pge (Intellisense bypass)
        if (!isTmePatched) {
            const p1 = /function\s+([A-Za-z0-9_$]+)\s*\(([a-z]),([a-z])\)\{let\s+([a-z])=new\s+([A-Za-z0-9_$]+)\(1,1,\3\.replace\.startLineNumber,\3\.replace\.startColumn\);return!!\2\.getValueInRange\(\4\)\.match\(\/\^\\s\*\$\/\)\}/;
            if (p1.test(content)) {
                content = content.replace(p1, 'function $1($2,$3){return!0}');
            } else if (content.includes('function Tme(s,o){let e=new j')) {
                content = content.replace(/function Tme\(s,o\)\{[\s\S]*?match\(\/\^\s\*\$\/\)\}/, 'function Tme(s,o){return!0}');
            }
        }

        // Patch 2: Hook window.__chatInputEditor và window.__codeEditorService vào zAe constructor
        if (!isZaePatched) {
            if (content.includes('this.widget=e;try{window.__chatInputEditor=e.inputEditor;') && !content.includes('window.__codeEditorService=t;')) {
                content = content.replace(
                    'this.widget=e;try{window.__chatInputEditor=e.inputEditor;',
                    'this.widget=e;try{window.__chatInputEditor=e.inputEditor;window.__codeEditorService=t;'
                );
            } else if (content.includes('this.widget=e;window.__chatInputEditor=e.inputEditor;') && !content.includes('window.__codeEditorService=t;')) {
                content = content.replace(
                    'this.widget=e;window.__chatInputEditor=e.inputEditor;',
                    'this.widget=e;try{window.__chatInputEditor=e.inputEditor;window.__codeEditorService=t;'
                );
            } else {
                const hookTarget = 'this.widget=e;this.codeEditorService=t;';
                const hookReplacement = "this.widget=e;try{window.__chatInputEditor=e.inputEditor;window.__codeEditorService=t;window.dispatchEvent(new CustomEvent('chat-editor-ready',{detail:e.inputEditor}))}catch(err){}this.codeEditorService=t;";
                if (content.includes(hookTarget)) {
                    content = content.replaceAll(hookTarget, hookReplacement);
                } else {
                    const zAePattern = /var\s+([A-Za-z0-9_$]+)\s*=\s*class\s+extends\s+([A-Za-z0-9_$]+)\s*\{\s*constructor\(([a-z]),([a-z]),([a-z]),([a-z]),([a-z]),([a-z]),([a-z])\)\{\s*super\(\);\s*this\.widget=\3;\s*this\.codeEditorService=\4;/;
                    if (zAePattern.test(content)) {
                        content = content.replace(zAePattern, 'var $1=class extends $2{constructor($3,$4,$5,$6,$7,$8,$9){super();this.widget=$3;try{window.__chatInputEditor=$3.inputEditor;window.__codeEditorService=$4;window.dispatchEvent(new CustomEvent(\'chat-editor-ready\',{detail:$3.inputEditor}))}catch(err){}this.codeEditorService=$4;');
                    }
                }
            }
        }

        // V8 Compile Check trước khi ghi
        try {
            const testContent = content.replace(/import\.meta/g, '({})').replace(/export\s*\{[^}]+\};?/g, '');
            new vm.Script(testContent);
            if (logger) logger.info('Kiểm tra cú pháp V8: 100% HỢP LỆ.');
        } catch (syntaxErr) {
            if (logger) logger.error(`Kiểm tra cú pháp V8 thất bại: ${syntaxErr.message}`);
            vscode.window.showErrorMessage(`Kiểm tra cú pháp thất bại, huỷ bỏ ghi file để chống lỗi màn hình đen: ${syntaxErr.message}`);
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
            const isZaePatched = (jsContent.includes('window.__chatInputEditor=e.inputEditor') || jsContent.includes('window.__chatInputEditor=')) &&
                                 jsContent.includes('window.__codeEditorService=t;');
            isJsPatched = isTmePatched && isZaePatched;
        }

        if (fs.existsSync(htmlPath)) {
            const htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
            isHtmlPatched = htmlContent.includes('<!-- !! VSCODE-CUSTOM-CSS-START !! -->') || htmlContent.includes('VSCODE-CUSTOM-CSS-START');
        }

        if (!isJsPatched || !isHtmlPatched) {
            if (logger) logger.warn(`Phát hiện mất bản vá (JS: ${isJsPatched}, HTML: ${isHtmlPatched}). Đang tự động phục hồi...`);

            let jsSuccess = true;
            let htmlSuccess = true;

            if (!isJsPatched) {
                jsSuccess = await patchIntellisense(true);
            }
            if (!isHtmlPatched) {
                htmlSuccess = await injectDirectWorkbenchHtml(context);
            }

            if (jsSuccess && htmlSuccess) {
                vscode.window.showInformationMessage(
                    '⚡ JARVIS: Tự động phục hồi bản vá sau khi VS Code cập nhật.',
                    'Reload Window'
                ).then(action => {
                    if (action === 'Reload Window') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
                if (logger) logger.info('Self-healing daemon: Tự động phục hồi bản vá hoàn tất.');
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
        }),
        vscode.commands.registerCommand('jarvisEnhancer.syncSetup', () => syncSetup(context)),
        vscode.commands.registerCommand('jarvisEnhancer.discoverMacros', () => syncMacros(context, false)),
        vscode.commands.registerCommand('jarvisEnhancer.patchIntellisense', () => patchIntellisense()),
        vscode.commands.registerCommand('jarvisEnhancer.editCSS', () => openConfigFile(context, 'vscode-custom.css')),
        vscode.commands.registerCommand('jarvisEnhancer.editJS', () => openConfigFile(context, 'vscode-custom.js')),
        vscode.commands.registerCommand('jarvisEnhancer.runSelfHealing', () => runSelfHealingDaemon(context))
    );

    // Tự động quét và đồng bộ macro sau khi khởi động
    syncMacros(context, true);

    // Kích hoạt watcher các thư mục prompts ngoài workspace (User và profiles)
    setupExternalPromptWatchers(context);

    setTimeout(() => {
        runSelfHealingDaemon(context);
    }, 1500);
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
    syncMacros
};
