#!/usr/bin/env node

/**
 * JARVIS IDE Enhancer - One-Click Master Restore Script
 * Tự động phát hiện phiên bản VS Code mới nhất, vá toàn bộ Core Bundle và tiêm Custom CSS/JS.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

console.log('\n======================================================');
console.log('⚡ JARVIS IDE ENHANCER - ONE-CLICK MASTER RESTORE ⚡');
console.log('======================================================\n');

try {
    const cwd = __dirname;
    // 1. Chạy vá bundle core
    console.log('[1/3] Đang phân tích và vá Core Bundle VS Code...');
    execSync(`node "${path.join(cwd, 'apply_workbench_patch.js')}"`, { stdio: 'inherit', cwd });

    // 2. Chạy đồng bộ Custom CSS & JS vào workbench.html
    console.log('\n[2/3] Đang tiêm Custom CSS & JS vào workbench.html...');
    execSync(`node "${path.join(cwd, 'apply_custom_css.js')}"`, { stdio: 'inherit', cwd });

    // 3. Dọn dẹp sạch V8 Bytecode Cache
    console.log('\n[3/3] Đang làm mới Chromium V8 Bytecode Cache...');
    const cachedDataDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Code', 'CachedData');
    let purged = 0;
    if (fs.existsSync(cachedDataDir)) {
        try {
            const entries = fs.readdirSync(cachedDataDir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const commitDir = path.join(cachedDataDir, entry.name);
                    const files = fs.readdirSync(commitDir);
                    for (const file of files) {
                        try {
                            fs.unlinkSync(path.join(commitDir, file));
                            purged++;
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {}
    }
    console.log(`Đã dọn dẹp sạch ${purged} tệp V8 cache.`);

    console.log('\n======================================================');
    console.log('✅ KHÔI PHỤC TOÀN BỘ HỆ THỐNG THÀNH CÔNG 100%!');
    console.log('   - Slash Command Intellisense: ĐÃ MỞ KHÓA');
    console.log('   - Gutter Timeline: ĐÃ KÍCH HOẠT');
    console.log('   - Custom CSS / 3D Cursor / UI: ĐÃ TIÊM');
    console.log('👉 Hãy nhấn Ctrl+Shift+P -> Reload Window để áp dụng ngay.');
    console.log('======================================================\n');
} catch (err) {
    console.error('\n❌ LỖI TRONG QUÁ TRÌNH KHÔI PHỤC:', err.message);
    process.exit(1);
}
