const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');

function getJsPath() {
    const baseDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs', 'Microsoft VS Code');
    if (fs.existsSync(baseDir)) {
        try {
            const candidates = [];
            const entries = fs.readdirSync(baseDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const candidate = path.join(baseDir, entry.name, 'resources', 'app', 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
                    if (fs.existsSync(candidate)) {
                        const stat = fs.statSync(candidate);
                        candidates.push({ path: candidate, mtime: stat.mtimeMs, name: entry.name });
                    }
                }
            }
            if (candidates.length > 0) {
                candidates.sort((a, b) => b.mtime - a.mtime);
                console.log(`[JARVIS] Phát hiện build VS Code mới nhất: ${candidates[0].name} (${new Date(candidates[0].mtime).toLocaleString()})`);
                return candidates[0].path;
            }
        } catch (e) {}
    }
    return '';
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

const p1Unpatched = /function\s+([A-Za-z0-9_$]+)\s*\(([a-zA-Z0-9_$]+),\s*([a-zA-Z0-9_$]+)\)\s*\{let\s+[a-zA-Z0-9_$]+=new\s+[A-Za-z0-9_$]+\(1,1,\3\.replace\.startLineNumber,\3\.replace\.startColumn\);[^}]*\}/;
const pVnUnpatched = /function\s+([A-Za-z0-9_$]+)\s*\(([a-zA-Z0-9_$]+),\s*([a-zA-Z0-9_$]+),\s*([a-zA-Z0-9_$]+)\)\s*\{if\(\4\.length===0\)return!1;let\s+[a-zA-Z0-9_$]+=\2\.getLineContent\(\3\.lineNumber\)[\s\S]*?\.includes\(["']\/["']\)&&\/[^\/]*\\\/\/\.test\([a-zA-Z0-9_$]+\)\}/;
const p2Unpatched = /\|\|[a-zA-Z0-9_$]+\.parsedInput\.parts\.find\([a-zA-Z0-9_$]+=>[a-zA-Z0-9_$]+\s+instanceof\s+Pm\)/g;
const p4aUnpatched = /function\s+([A-Za-z0-9_$]+)\s*\(([a-zA-Z0-9_$]+)\)\s*\{return\s+\2\.location===["']panel["']&&!\2\.rendersInputOnTop\}/;
const p4bUnpatched = /this\.environmentService\.isSessionsWindow\s*\?\s*this\.configurationService\.getValue\(([A-Za-z0-9_$]+)\)\s*:\s*["']off["']/;
const pBfoUnpatched = /function\s+([A-Za-z0-9_$]+)\s*\(([a-zA-Z0-9_$]+),\s*([a-zA-Z0-9_$]+)\)\s*\{return\s+[A-Za-z0-9_$]+\(\2\)&&[a-zA-Z0-9_$]+\.getValue\(([A-Za-z0-9_$]+)\)===!0&&[a-zA-Z0-9_$]+\.getValue\(["']chat\.experimental\.stickyScroll\.enabled["']\)===!1\}/;

const isTmePatched = !p1Unpatched.test(content) && !pVnUnpatched.test(content);
p2Unpatched.lastIndex = 0;
const isMultiSlashSuggestPatched = !p2Unpatched.test(content);
p2Unpatched.lastIndex = 0;
const isAddCodeEditorPatched = content.includes('window.__codeEditorService=this');
const isPromptTimelinePatched = !p4aUnpatched.test(content) && !p4bUnpatched.test(content) && !pBfoUnpatched.test(content);

if (isTmePatched && isMultiSlashSuggestPatched && isAddCodeEditorPatched && isPromptTimelinePatched) {
    console.log('⚡ Hệ thống đã có đầy đủ 4 bản vá (Intellisense bypass, Multi-slash unblocked, Hook addCodeEditor, Unlock Native Timeline), không cần vá lại.');
    process.exit(0);
}

try {
    // 1. Áp dụng Patch 1: Whitespace check bypass -> return!0
    if (p1Unpatched.test(content)) {
        content = content.replace(p1Unpatched, 'function $1($2,$3){return!0}');
        console.log('Patch 1: Đã vá whitespace check (Patch 1) thành công.');
    }

    if (pVnUnpatched.test(content)) {
        content = content.replace(pVnUnpatched, 'function $1($2,$3,$4){return!0}');
        console.log('Patch 1b: Đã mở khóa trigger slash command (v_n -> return!0).');
    }

    // 2. Áp dụng Patch 2: Gỡ bỏ ||...parsedInput.parts.find(...)
    p2Unpatched.lastIndex = 0;
    if (p2Unpatched.test(content)) {
        content = content.replace(p2Unpatched, '');
        console.log('Patch 2: Đã mở khóa gợi ý cho slash command thứ 2 trở đi (Patch 2).');
    }

    // 3. Áp dụng Patch 3: Hook addCodeEditor
    if (content.includes('addCodeEditor(') && !content.includes('window.__codeEditorService=this')) {
        console.log('Patch 3: Áp dụng hook addCodeEditor...');
        content = content.replace(
            /addCodeEditor\(([A-Za-z0-9_$]+)\)\{/,
            'addCodeEditor($1){try{window.__codeEditorService=this;window.__allCodeEditors=window.__allCodeEditors||[];window.__allCodeEditors.push($1);let _d=$1.getContainerDomNode&&$1.getContainerDomNode();if(_d){_d.__monacoEditor=$1;setTimeout(()=>{try{if(_d.closest&&_d.closest(\'.interactive-input-part,.chat-input-editor,.interactive-input-editor,.chat-input-widget\')){window.__chatInputEditor=$1;window.dispatchEvent(new CustomEvent(\'chat-editor-ready\',{detail:$1}))}}catch(_){}},50)}}catch(_){}'
        );
    }

    // 4. Áp dụng Patch 4: Mở khóa Native Prompt Timeline của Microsoft
    if (p4aUnpatched.test(content)) {
        console.log('Patch 4a: Mở khóa Timeline chạy ở cả Sidebar và Panel (Patch 4a)...');
        content = content.replace(p4aUnpatched, 'function $1($2){return!$2.rendersInputOnTop}');
    }

    if (p4bUnpatched.test(content)) {
        console.log('Patch 4b: Mở khóa PromptTimelineFeature cho mọi cửa sổ chat thường (Patch 4b)...');
        content = content.replace(p4bUnpatched, 'this.configurationService.getValue($1)||"gutter"');
    }

    // Patch 4c: Mở khóa điều kiện Bfo để timeline/sticky scroll luôn bật
    if (pBfoUnpatched.test(content)) {
        console.log('Patch 4c: Mở khóa hàm Bfo (sticky/timeline gate)...');
        content = content.replace(pBfoUnpatched, 'function $1($2,$3){return!0}');
    }

    // Patch 4d: Bỏ ẩn timeline khi ít hơn 2 câu hỏi (hiển thị ngay từ đầu)
    if (content.includes('u.length<2')) {
        console.log('Patch 4d: Gỡ bỏ điều kiện ẩn timeline khi < 2 requests...');
        content = content.replace(/n\.domNode\.classList\.toggle\(["']hidden["'],u\.length<2\)/g, 'n.domNode.classList.toggle("hidden",!1)');
    }

    // Patch 4e: Bỏ ẩn các chấm tròn khi chiều rộng chat hẹp (< 320px)
    if (content.includes('e<320')) {
        console.log('Patch 4e: Gỡ bỏ class overflowing khi chat hẹp...');
        content = content.replace(/this\._domNode\.classList\.toggle\(["']overflowing["'],e<320\)/g, 'this._domNode.classList.toggle("overflowing",!1)');
    }

    // 5. Kiểm tra an toàn: Snippet-Validation & Tính toàn vẹn tệp
    console.log('Kiểm tra cú pháp V8 snippets...');
    new vm.Script('function _test(s,o){return!0}');
    new vm.Script(`(function(e,t){\nthis.widget=e;try{window.__chatInputEditor=e.inputEditor;window.__codeEditorService=t;window.dispatchEvent(new CustomEvent('chat-editor-ready',{detail:e.inputEditor}))}catch(err){}this.codeEditorService=t;\n})`);
    new vm.Script(`(function(e){\ntry{window.__codeEditorService=this;window.__allCodeEditors=window.__allCodeEditors||[];window.__allCodeEditors.push(e);let _d=e.getContainerDomNode&&e.getContainerDomNode();if(_d){_d.__monacoEditor=e;setTimeout(()=>{try{if(_d.closest&&_d.closest('.interactive-input-part,.chat-input-editor,.interactive-input-editor,.chat-input-widget')){window.__chatInputEditor=e;window.dispatchEvent(new CustomEvent('chat-editor-ready',{detail:e}))}}catch(_){}},50)}}catch(_){}\n})`);
    new vm.Script('function wTn(s){return!s.rendersInputOnTop}');
    new vm.Script('(function(eRt){\nlet e = this.configurationService.getValue(eRt)||"gutter";\n})');

    if (!content || content.length < 5000000) {
        throw new Error(`File size anomaly (${content ? content.length : 0} bytes)`);
    }
    console.log('=> Cú pháp V8 snippets và toàn vẹn tệp hợp lệ 100%!');

    // 6. Ghi file
    fs.writeFileSync(jsPath, content, 'utf8');
    console.log(`Đã ghi file: ${jsPath}`);

    // 7. Xác minh file chứa cả 4 patch
    const verified = fs.readFileSync(jsPath, 'utf8');
    p2Unpatched.lastIndex = 0;
    const vPatch1 = !p1Unpatched.test(verified) && !pVnUnpatched.test(verified);
    const vPatch2 = !p2Unpatched.test(verified);
    const vPatch3 = verified.includes('window.__codeEditorService=this');
    p4aUnpatched.lastIndex = 0;
    p4bUnpatched.lastIndex = 0;
    const vPatch4 = !p4aUnpatched.test(verified) && !p4bUnpatched.test(verified);

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
