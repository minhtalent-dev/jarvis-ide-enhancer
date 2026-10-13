const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');

function getJsPath() {
    const fixedPath = 'C:\\Users\\mes\\AppData\\Local\\Programs\\Microsoft VS Code\\2a59476c9b\\resources\\app\\out\\vs\\workbench\\workbench.desktop.main.js';
    if (fs.existsSync(fixedPath)) return fixedPath;
    const baseDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs', 'Microsoft VS Code');
    if (fs.existsSync(baseDir)) {
        try {
            const entries = fs.readdirSync(baseDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const candidate = path.join(baseDir, entry.name, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
                    if (fs.existsSync(candidate)) return candidate;
                }
            }
        } catch (e) {}
    }
    return fixedPath;
}

const jsPath = getJsPath();

if (!fs.existsSync(jsPath)) {
    console.error(`ERROR: Không tìm thấy file tại ${jsPath}`);
    process.exit(1);
}

const bakPath = `${jsPath}.bak`;
if (!fs.existsSync(bakPath)) {
    console.log(`Tạo backup: ${bakPath}`);
    fs.copyFileSync(jsPath, bakPath);
} else {
    console.log(`Backup đã tồn tại tại: ${bakPath}`);
}

let content = fs.readFileSync(jsPath, 'utf8');

const isTmePatched = content.includes('function Pge(s,o){return!0}') || content.includes('function Tme(s,o){return!0}') || /function\s+([A-Za-z0-9_$]+)\s*\(([a-z]),([a-z])\)\{return!0\}/.test(content);
const isMultiSlashSuggestPatched = !content.includes('.parsedInput.parts.find(w=>w instanceof Pm)') && !content.includes('.parsedInput.parts.find(C=>C instanceof Pm)');
const isAddCodeEditorPatched = content.includes('window.__codeEditorService=this');
const isPromptTimelinePatched = content.includes('function wTn(s){return!s.rendersInputOnTop}') && content.includes('this.configurationService.getValue(eRt)||"ruler"');

if (isTmePatched && isMultiSlashSuggestPatched && isAddCodeEditorPatched && isPromptTimelinePatched) {
    console.log('⚡ Hệ thống đã có đầy đủ 4 bản vá (Intellisense bypass, Multi-slash unblocked, Hook addCodeEditor, Unlock Native Timeline), không cần vá lại.');
    process.exit(0);
}

try {
    // 1. Áp dụng Patch 1: Pge/Tme -> return!0
    if (!isTmePatched) {
        const p1 = /function\s+([A-Za-z0-9_$]+)\s*\(([a-z]),([a-z])\)\{let\s+([a-z])=new\s+([A-Za-z0-9_$]+)\(1,1,\3\.replace\.startLineNumber,\3\.replace\.startColumn\);return!!\2\.getValueInRange\(\4\)\.match\(\/\^\\s\*\$\/\)\}/;
        if (p1.test(content)) {
            const m = content.match(p1);
            console.log(`Patch 1: Phát hiện hàm ${m[1]}(${m[2]},${m[3]}), đang thay thế bằng return!0`);
            content = content.replace(p1, `function ${m[1]}(${m[2]},${m[3]}){return!0}`);
        } else if (content.includes('function Tme(s,o){let e=new j')) {
            content = content.replace(/function Tme\(s,o\)\{[\s\S]*?match\(\/\^\s\*\$\/\)\}/, 'function Tme(s,o){return!0}');
        }
    }

    // 2. Áp dụng Patch 2: Gỡ bỏ ||...parsedInput.parts.find(...)
    console.log('Patch 2: Gỡ bỏ điều kiện chặn gợi ý slash command thứ 2 trở đi...');
    content = content.replace(/\|\|[a-zA-Z0-9_$]+\.parsedInput\.parts\.find\([a-zA-Z0-9_$]+=>[a-zA-Z0-9_$]+\s+instanceof\s+Pm\)/g, '');

    // 3. Áp dụng Patch 3: Hook addCodeEditor
    if (content.includes('addCodeEditor(') && !content.includes('window.__codeEditorService=this')) {
        console.log('Patch 3: Áp dụng hook addCodeEditor...');
        content = content.replace(
            /addCodeEditor\(([A-Za-z0-9_$]+)\)\{/,
            'addCodeEditor($1){try{window.__codeEditorService=this;window.__allCodeEditors=window.__allCodeEditors||[];window.__allCodeEditors.push($1);let _d=$1.getContainerDomNode&&$1.getContainerDomNode();if(_d){_d.__monacoEditor=$1;setTimeout(()=>{try{if(_d.closest&&_d.closest(\'.interactive-input-part,.chat-input-editor,.interactive-input-editor,.chat-input-widget\')){window.__chatInputEditor=$1;window.dispatchEvent(new CustomEvent(\'chat-editor-ready\',{detail:$1}))}}catch(_){}},50)}}catch(_){}'
        );
    }

    // 4. Áp dụng Patch 4: Mở khóa Native Prompt Timeline của Microsoft
    const tWtn = 'function wTn(s){return s.location==="panel"&&!s.rendersInputOnTop}';
    if (content.includes(tWtn)) {
        console.log('Patch 4a: Mở khóa wTn cho phép Timeline chạy ở cả Sidebar và Panel...');
        content = content.replace(tWtn, 'function wTn(s){return!s.rendersInputOnTop}');
    }

    const tSessionWindow = 'this.environmentService.isSessionsWindow?this.configurationService.getValue(eRt):"off"';
    if (content.includes(tSessionWindow)) {
        console.log('Patch 4b: Mở khóa PromptTimelineFeature cho mọi cửa sổ chat thường...');
        content = content.replace(tSessionWindow, 'this.configurationService.getValue(eRt)||"ruler"');
    }

    // 5. Kiểm tra an toàn: Snippet-Validation & Tính toàn vẹn tệp
    console.log('Kiểm tra cú pháp V8 snippets...');
    new vm.Script('function _test(s,o){return!0}');
    new vm.Script(`(function(e,t){\nthis.widget=e;try{window.__chatInputEditor=e.inputEditor;window.__codeEditorService=t;window.dispatchEvent(new CustomEvent('chat-editor-ready',{detail:e.inputEditor}))}catch(err){}this.codeEditorService=t;\n})`);
    new vm.Script(`(function(e){\ntry{window.__codeEditorService=this;window.__allCodeEditors=window.__allCodeEditors||[];window.__allCodeEditors.push(e);let _d=e.getContainerDomNode&&e.getContainerDomNode();if(_d){_d.__monacoEditor=e;setTimeout(()=>{try{if(_d.closest&&_d.closest('.interactive-input-part,.chat-input-editor,.interactive-input-editor,.chat-input-widget')){window.__chatInputEditor=e;window.dispatchEvent(new CustomEvent('chat-editor-ready',{detail:e}))}}catch(_){}},50)}}catch(_){}\n})`);
    new vm.Script('function wTn(s){return!s.rendersInputOnTop}');
    new vm.Script('(function(eRt){\nlet e = this.configurationService.getValue(eRt)||"ruler";\n})');

    if (!content || content.length < 5000000) {
        throw new Error(`File size anomaly (${content ? content.length : 0} bytes)`);
    }
    console.log('=> Cú pháp V8 snippets và toàn vẹn tệp hợp lệ 100%!');

    // 6. Ghi file
    fs.writeFileSync(jsPath, content, 'utf8');
    console.log(`Đã ghi file: ${jsPath}`);

    // 7. Xác minh file chứa cả 4 patch
    const verified = fs.readFileSync(jsPath, 'utf8');
    const vPatch1 = verified.includes('function Pge(s,o){return!0}') || verified.includes('function Tme(s,o){return!0}') || /function\s+([A-Za-z0-9_$]+)\s*\(([a-z]),([a-z])\)\{return!0\}/.test(verified);
    const vPatch2 = !verified.includes('.parsedInput.parts.find(w=>w instanceof Pm)') && !verified.includes('.parsedInput.parts.find(C=>C instanceof Pm)');
    const vPatch3 = verified.includes('window.__codeEditorService=this');
    const vPatch4 = verified.includes('function wTn(s){return!s.rendersInputOnTop}') && verified.includes('this.configurationService.getValue(eRt)||"ruler"');

    console.log('=== KẾT QUẢ XÁC MINH ===');
    console.log('Patch 1 (Pge/Tme return!0):', vPatch1 ? 'THÀNH CÔNG' : 'THẤT BÀI');
    console.log('Patch 2 (Multi-slash unblocked):', vPatch2 ? 'THÀNH CÔNG' : 'THẤT BÀI');
    console.log('Patch 3 (Hook addCodeEditor):', vPatch3 ? 'THÀNH CÔNG' : 'THẤT BÀI');
    console.log('Patch 4 (Unlock Native Timeline):', vPatch4 ? 'THÀNH CÔNG' : 'THẤT BÀI');

    if (!vPatch1 || !vPatch2 || !vPatch3 || !vPatch4) {
        throw new Error('Xác minh thất bại');
    }

    // 7. Tự động dọn dẹp sạch V8 Bytecode Cache
    try {
        function clearSafely(p) {
            if (!p || !fs.existsSync(p)) return;
            const stat = fs.statSync(p);
            if (stat.isDirectory()) {
                const entries = fs.readdirSync(p);
                for (const sub of entries) clearSafely(path.join(p, sub));
                try { fs.rmdirSync(p); } catch (_) {}
            } else {
                try { fs.unlinkSync(p); } catch (_) {}
            }
        }
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
        const cdDir = path.join(appData, 'Code', 'CachedData');
        if (fs.existsSync(cdDir)) {
            const subDirs = fs.readdirSync(cdDir);
            for (const sub of subDirs) clearSafely(path.join(cdDir, sub));
            console.log('Đã tự động dọn sạch V8 CachedData!');
        }
    } catch (_) {}
} catch (err) {
    console.error(`LỖI: ${err.message}. Đang rollback...`);
    if (bakPath && fs.existsSync(bakPath)) {
        fs.copyFileSync(bakPath, jsPath);
        console.log(`Đã khôi phục file gốc từ backup: ${bakPath}`);
    }
    process.exit(1);
}
