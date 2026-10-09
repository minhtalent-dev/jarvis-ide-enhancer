const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');

let logger;

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

        const finalCss = baseCss + (userCss ? '\n\n/* === Custom User Overrides (Synced via Settings) === */\n' + userCss : '');
        const finalJs = baseJs + (userJs ? '\n\n/* === Custom User Overrides (Synced via Settings) === */\n' + userJs : '');

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
        const isZaePatched = content.includes("window.__chatInputEditor=e.inputEditor") || content.includes("window.__chatInputEditor=");

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

        // Patch 2: Hook window.__chatInputEditor vào zAe constructor
        if (!isZaePatched) {
            const zAePattern = /var\s+([A-Za-z0-9_$]+)\s*=\s*class\s+extends\s+([A-Za-z0-9_$]+)\s*\{\s*constructor\(([a-z]),([a-z]),([a-z]),([a-z]),([a-z]),([a-z]),([a-z])\)\{\s*super\(\);\s*this\.widget=\3;\s*this\.codeEditorService=\4;/;
            if (zAePattern.test(content)) {
                content = content.replace(zAePattern, 'var $1=class extends $2{constructor($3,$4,$5,$6,$7,$8,$9){super();this.widget=$3;try{window.__chatInputEditor=$3.inputEditor;window.dispatchEvent(new CustomEvent(\'chat-editor-ready\',{detail:$3.inputEditor}))}catch(err){}this.codeEditorService=$4;');
            } else {
                const zAeTarget = 'this.widget=e;this.codeEditorService=t;';
                if (content.includes(zAeTarget)) {
                    content = content.replaceAll(zAeTarget, 'this.widget=e;try{window.__chatInputEditor=e.inputEditor;window.dispatchEvent(new CustomEvent(\'chat-editor-ready\',{detail:e.inputEditor}))}catch(err){}this.codeEditorService=t;');
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
        if (logger) logger.error(`Lỗi vá Intellisense: ${err.message}`);
        vscode.window.showErrorMessage(`Lỗi vá Intellisense: ${err.message}`);
        return false;
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

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('jarvisEnhancer.customCSS') || e.affectsConfiguration('jarvisEnhancer.customJS')) {
                await syncSetup(context, true); // Chế độ silent
            }
        }),
        vscode.commands.registerCommand('jarvisEnhancer.syncSetup', () => syncSetup(context)),
        vscode.commands.registerCommand('jarvisEnhancer.patchIntellisense', () => patchIntellisense()),
        vscode.commands.registerCommand('jarvisEnhancer.editCSS', () => openConfigFile(context, 'vscode-custom.css')),
        vscode.commands.registerCommand('jarvisEnhancer.editJS', () => openConfigFile(context, 'vscode-custom.js'))
    );
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
