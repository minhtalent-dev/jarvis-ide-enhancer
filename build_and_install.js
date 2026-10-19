#!/usr/bin/env node

/**
 * JARVIS IDE Enhancer - Auto Build & Install Script
 * Tự động đọc version từ package.json, đóng gói VSIX, cài đặt vào VS Code và dọn dẹp các bản cũ.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('\n======================================================');
console.log('⚡ JARVIS IDE ENHANCER - AUTO BUILD & INSTALL ⚡');
console.log('======================================================\n');

try {
    const pkgPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        throw new Error('Không tìm thấy package.json');
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const version = pkg.version;
    const vsixName = `jarvis-ide-enhancer-${version}.vsix`;
    const vsixPath = path.join(__dirname, vsixName);

    // 1. Đóng gói VSIX
    console.log(`[1/3] Đang đóng gói phiên bản v${version}...`);
    execSync('npx -y @vscode/vsce package --no-dependencies', { stdio: 'inherit', cwd: __dirname });

    if (!fs.existsSync(vsixPath)) {
        throw new Error(`Đóng gói thất bại, không tìm thấy file ${vsixName}`);
    }

    // 2. Cài đặt trực tiếp vào VS Code
    console.log(`\n[2/3] Đang cài đặt ${vsixName} vào VS Code...`);
    execSync(`code --install-extension "${vsixPath}" --force`, { stdio: 'inherit', cwd: __dirname });

    // 3. Dọn dẹp các thư mục phiên bản cũ
    console.log('\n[3/3] Đang kiểm tra và dọn dẹp các thư mục phiên bản cũ...');
    const extDir = path.join(os.homedir(), '.vscode', 'extensions');
    const currentFolder = `minhtalent-dev.jarvis-ide-enhancer-${version}`;
    let cleaned = 0;

    if (fs.existsSync(extDir)) {
        try {
            const entries = fs.readdirSync(extDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith('minhtalent-dev.jarvis-ide-enhancer-') && entry.name !== currentFolder) {
                    const target = path.join(extDir, entry.name);
                    fs.rmSync(target, { recursive: true, force: true });
                    console.log(`   - Đã xóa bản cũ: ${entry.name}`);
                    cleaned++;
                }
            }
        } catch (e) {
            console.warn('   - Cảnh báo khi dọn thư mục cũ:', e.message);
        }
    }
    console.log(`Hoàn tất dọn dẹp ${cleaned} phiên bản cũ.`);

    console.log('\n======================================================');
    console.log(`✅ ĐÃ BUILD VÀ CÀI ĐẶT THÀNH CÔNG JARVIS v${version}!`);
    console.log('👉 Hãy nhấn Ctrl+Shift+P -> Reload Window để áp dụng.');
    console.log('======================================================\n');
} catch (err) {
    console.error('\n❌ LỖI TRONG QUÁ TRÌNH BUILD & INSTALL:', err.message);
    process.exit(1);
}
