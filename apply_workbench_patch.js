const fs = require('fs');
const path = require('path');
const vm = require('vm');

const appRoot = 'C:\\Users\\mes\\AppData\\Local\\Programs\\Microsoft VS Code\\2a59476c9b\\resources\\app';
const jsPath = path.join(appRoot, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');

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
let patch1Applied = false;
let patch2Applied = false;

// 1. Áp dụng Patch 1: Intellisense bypass (Pge / Tme -> return!0)
const p1 = /function\s+([A-Za-z0-9_$]+)\s*\(([a-z]),([a-z])\)\{let\s+([a-z])=new\s+([A-Za-z0-9_$]+)\(1,1,\3\.replace\.startLineNumber,\3\.replace\.startColumn\);return!!\2\.getValueInRange\(\4\)\.match\(\/\^\\s\*\$\/\)\}/;
if (p1.test(content)) {
    const m = content.match(p1);
    console.log(`Patch 1: Phát hiện hàm ${m[1]}(${m[2]},${m[3]}), đang thay thế bằng return!0`);
    content = content.replace(p1, `function ${m[1]}(${m[2]},${m[3]}){return!0}`);
    patch1Applied = true;
} else if (content.includes('function Pge(s,o){return!0}') || content.includes('function Tme(s,o){return!0}')) {
    console.log('Patch 1: Đã được áp dụng trước đó (Pge/Tme return!0).');
    patch1Applied = true;
} else {
    console.warn('Patch 1: Cảnh báo không tìm thấy mẫu hàm target!');
}

// 2. Áp dụng Patch 2: Hook window.__chatInputEditor & dispatch chat-editor-ready event
const isHookPatched = content.includes('window.__chatInputEditor=e.inputEditor') || content.includes('window.__chatInputEditor=');
if (!isHookPatched) {
    const hookTarget = 'this.widget=e;this.codeEditorService=t;';
    const hookReplacement = 'this.widget=e;try{window.__chatInputEditor=e.inputEditor;window.dispatchEvent(new CustomEvent(\'chat-editor-ready\',{detail:e.inputEditor}))}catch(err){}this.codeEditorService=t;';
    if (content.includes(hookTarget)) {
        console.log('Patch 2: Phát hiện hook target, đang gán window.__chatInputEditor và dispatch chat-editor-ready');
        content = content.replaceAll(hookTarget, hookReplacement);
        patch2Applied = true;
    } else {
        console.warn('Patch 2: Cảnh báo không tìm thấy hook target!');
    }
} else {
    console.log('Patch 2: Đã được áp dụng trước đó.');
    patch2Applied = true;
}

// 3. Kiểm tra cú pháp bằng new vm.Script
console.log('Kiểm tra cú pháp V8...');
console.log('Content len:', content.length);
console.log('Raw file len:', fs.readFileSync(jsPath, 'utf8').length);
console.log('Content === Raw file:', content === fs.readFileSync(jsPath, 'utf8'));
try {
    const testContent = content.replace(/import\.meta/g, '({})').replace(/export\s*\{[^}]+\};?/g, '');
    new vm.Script(testContent);
    console.log('=> Cú pháp V8 hợp lệ 100%!');
} catch (syntaxErr) {
    console.error(`=> LỖI CÚ PHÁP: ${syntaxErr.message}`);
    process.exit(1);
}

// 4. Ghi file
fs.writeFileSync(jsPath, content, 'utf8');
console.log(`Đã ghi file: ${jsPath}`);

// 5. Xác minh file chứa cả 2 patch
const verified = fs.readFileSync(jsPath, 'utf8');
const vPatch1 = verified.includes('function Pge(s,o){return!0}') || verified.includes('function Tme(s,o){return!0}');
const vPatch2 = verified.includes('window.__chatInputEditor=e.inputEditor');

console.log('=== KẾT QUẢ XÁC MINH ===');
console.log('Patch 1 (Intellisense return!0):', vPatch1 ? 'THÀNH CÔNG' : 'THẤT BÀI');
console.log('Patch 2 (Hook window.__chatInputEditor):', vPatch2 ? 'THÀNH CÔNG' : 'THẤT BÀI');

if (!vPatch1 || !vPatch2) {
    process.exit(1);
}
