const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const assetsDir = path.join(__dirname, 'assets');
const jarvisStyleDir = path.join('C:', 'Users', 'mes', '.jarvis', 'style');

if (!fs.existsSync(jarvisStyleDir)) {
    fs.mkdirSync(jarvisStyleDir, { recursive: true });
}

// 1. Đảm bảo copy assets sang C:\Users\mes\.jarvis\style\
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

if (fs.existsSync(srcJs)) {
    fs.copyFileSync(srcJs, destJs);
    console.log(`Đã copy: ${srcJs} -> ${destJs}`);
} else {
    console.warn(`Không tìm thấy srcJs: ${srcJs}`);
}

// 2. Kiểm tra và inject vào workbench.html của 2a59476c9b
const htmlPath = 'C:\\Users\\mes\\AppData\\Local\\Programs\\Microsoft VS Code\\2a59476c9b\\resources\\app\\out\\vs\\code\\electron-browser\\workbench\\workbench.html';

if (!fs.existsSync(htmlPath)) {
    console.error(`ERROR: Không tìm thấy workbench.html tại ${htmlPath}`);
    process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');
const alreadyInjected = html.includes('VSCODE-CUSTOM-CSS-START');

if (alreadyInjected) {
    console.log('workbench.html đã được inject Custom CSS trước đó.');
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

// 3. Xác minh
const verifiedHtml = fs.readFileSync(htmlPath, 'utf8');
const hasStart = verifiedHtml.includes('<!-- !! VSCODE-CUSTOM-CSS-START !! -->');
const hasEnd = verifiedHtml.includes('<!-- !! VSCODE-CUSTOM-CSS-END !! -->');
const hasJarvisStyle = verifiedHtml.includes('jarvis-3d-cursor') || verifiedHtml.includes('.monaco-workbench');

console.log('=== KẾT QUẢ XÁC MINH WORKBENCH.HTML ===');
console.log('Has VSCODE-CUSTOM-CSS-START:', hasStart);
console.log('Has VSCODE-CUSTOM-CSS-END:', hasEnd);
console.log('Has Injected Content:', hasJarvisStyle);

if (!hasStart || !hasEnd) {
    process.exit(1);
}
