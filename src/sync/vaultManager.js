const fs = require('fs');
const path = require('path');
const os = require('os');
const { encryptVault, decryptVault, MAGIC_HEADER } = require('./vaultCrypto');
const { tokenizePaths, detokenizePaths, sanitizeSecrets, rehydrateSecrets } = require('./vaultSanitizer');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit per file

/**
 * Lấy đường dẫn thư mục User Data của VS Code theo hệ điều hành
 */
function getCodeUserDir() {
    if (process.platform === 'win32') {
        return path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User');
    } else if (process.platform === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User');
    }
    return path.join(os.homedir(), '.config', 'Code', 'User');
}

/**
 * Tự động tìm thư mục Active Profile của VS Code
 * @param {string|null} customProfileDir 
 * @returns {string} Đường dẫn thư mục Profile
 */
function resolveActiveProfileDir(customProfileDir = null) {
    if (customProfileDir && fs.existsSync(customProfileDir)) {
        return customProfileDir;
    }

    const codeUserDir = getCodeUserDir();
    const profilesDir = path.join(codeUserDir, 'profiles');

    if (fs.existsSync(profilesDir)) {
        try {
            const entries = fs.readdirSync(profilesDir, { withFileTypes: true })
                .filter(e => e.isDirectory() && e.name !== 'builtin');

            // Ưu tiên profile chứa mcp.json hoặc thư mục prompts
            for (const entry of entries) {
                const candidate = path.join(profilesDir, entry.name);
                if (fs.existsSync(path.join(candidate, 'mcp.json')) || fs.existsSync(path.join(candidate, 'prompts'))) {
                    return candidate;
                }
            }

            if (entries.length > 0) {
                return path.join(profilesDir, entries[0].name);
            }
        } catch (err) {
            // fallback
        }
    }

    return codeUserDir;
}

/**
 * Quét đệ quy toàn bộ file trong thư mục (bỏ qua node_modules, .git, .cache)
 */
function scanFilesRecursively(dir, baseDir, maxDepth = 6, currentDepth = 0) {
    const results = [];
    if (currentDepth > maxDepth || !fs.existsSync(dir)) return results;

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const name = entry.name;
            if (name === 'node_modules' || name === '.git' || name === '.cache' || name === 'bin' || name === 'obj') {
                continue;
            }

            const fullPath = path.join(dir, name);
            if (entry.isDirectory()) {
                results.push(...scanFilesRecursively(fullPath, baseDir, maxDepth, currentDepth + 1));
            } else if (entry.isFile()) {
                const stat = fs.statSync(fullPath);
                if (stat.size <= MAX_FILE_SIZE) {
                    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
                    const content = fs.readFileSync(fullPath, 'utf8');
                    results.push({ relativePath, content });
                }
            }
        }
    } catch (err) {
        // bỏ qua thư mục không có quyền truy cập
    }

    return results;
}

/**
 * Thu thập toàn bộ Agent Customizations (5 phân hệ)
 * @param {Object} options 
 * @returns {Object} Manifest dữ liệu
 */
function collectAgentCustomizations(options = {}) {
    const profileDir = resolveActiveProfileDir(options.profileDir);

    // 1. MCP Configuration
    let mcp = null;
    const mcpPath = path.join(profileDir, 'mcp.json');
    if (fs.existsSync(mcpPath)) {
        try {
            mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
        } catch (err) {
            mcp = null;
        }
    }

    // 2. Chat Language Models
    let models = null;
    const modelsPath = path.join(profileDir, 'chatLanguageModels.json');
    if (fs.existsSync(modelsPath)) {
        try {
            models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
        } catch (err) {
            models = null;
        }
    }

    // 3. Prompts / Rules
    const prompts = [];
    const promptDirs = [];
    const profilePrompts = path.join(profileDir, 'prompts');
    if (fs.existsSync(profilePrompts)) promptDirs.push(profilePrompts);

    const userPrompts = path.join(getCodeUserDir(), 'prompts');
    if (userPrompts !== profilePrompts && fs.existsSync(userPrompts)) {
        promptDirs.push(userPrompts);
    }

    const seenPromptNames = new Set();
    for (const pDir of promptDirs) {
        const scanned = scanFilesRecursively(pDir, pDir);
        for (const item of scanned) {
            if (!seenPromptNames.has(item.relativePath)) {
                seenPromptNames.add(item.relativePath);
                prompts.push({
                    name: path.basename(item.relativePath),
                    relativePath: item.relativePath,
                    content: item.content
                });
            }
        }
    }

    // 4. External Skills (~/.agents/skills/, ~/.copilot/skills/, ~/.claude/skills/)
    const skills = [];
    const skillRoots = [
        { source: '.agents/skills', baseDir: path.join(os.homedir(), '.agents', 'skills') },
        { source: '.copilot/skills', baseDir: path.join(os.homedir(), '.copilot', 'skills') },
        { source: '.claude/skills', baseDir: path.join(os.homedir(), '.claude', 'skills') }
    ];

    for (const { source, baseDir } of skillRoots) {
        if (fs.existsSync(baseDir)) {
            const scanned = scanFilesRecursively(baseDir, baseDir);
            for (const item of scanned) {
                skills.push({
                    source,
                    relativePath: item.relativePath,
                    content: item.content
                });
            }
        }
    }

    // 5. Styles (~/.jarvis/style/)
    const styles = [];
    const styleDir = path.join(os.homedir(), '.jarvis', 'style');
    if (fs.existsSync(styleDir)) {
        const scanned = scanFilesRecursively(styleDir, styleDir);
        for (const item of scanned) {
            styles.push({
                relativePath: item.relativePath,
                content: item.content
            });
        }
    }

    return {
        version: '1.0',
        exportTime: new Date().toISOString(),
        profileName: path.basename(profileDir),
        mcp,
        skills,
        prompts,
        models,
        styles
    };
}

/**
 * Xuất Vault theo 2 chế độ: 'encrypted' (*.jarvis-vault) hoặc 'sanitized' (*.json)
 * @param {string} passphrase - Mật khẩu mở khóa (bắt buộc với mode 'encrypted')
 * @param {'encrypted'|'sanitized'} mode - Chế độ xuất
 * @param {Object} options 
 * @returns {{ mode: string, buffer?: Buffer, content?: string, secretMap?: Object }}
 */
function exportVault(passphrase, mode = 'encrypted', options = {}) {
    const customizations = collectAgentCustomizations(options);
    const jsonString = JSON.stringify(customizations, null, 2);
    const tokenizedText = tokenizePaths(jsonString);

    if (mode === 'sanitized') {
        const { sanitizedText, secretMap } = sanitizeSecrets(tokenizedText);
        return {
            mode: 'sanitized',
            content: sanitizedText,
            secretMap
        };
    }

    if (mode === 'encrypted') {
        if (!passphrase || typeof passphrase !== 'string') {
            throw new Error('Cần cung cấp passphrase để mã hóa vault');
        }
        const buffer = encryptVault(Buffer.from(tokenizedText, 'utf8'), passphrase);
        return {
            mode: 'encrypted',
            buffer
        };
    }

    throw new Error(`Chế độ xuất không hợp lệ: ${mode}`);
}

/**
 * Nhập và phục hồi Agent Customizations từ Vault (Buffer hoặc JSON text)
 * @param {Buffer|string} vaultBufferOrText - Dữ liệu vault nhị phân hoặc chuỗi text
 * @param {string} passphrase - Mật khẩu giải mã nếu là encrypted vault
 * @param {Object} options - Tùy chọn cấu hình (profileDir, envMap)
 * @returns {{ success: boolean, restored: Object, backupFiles: string[] }}
 */
function importVault(vaultBufferOrText, passphrase, options = {}) {
    let rawText;

    if (Buffer.isBuffer(vaultBufferOrText)) {
        const magic = vaultBufferOrText.subarray(0, MAGIC_HEADER.length);
        if (magic.equals(MAGIC_HEADER)) {
            const decryptedBuffer = decryptVault(vaultBufferOrText, passphrase);
            rawText = decryptedBuffer.toString('utf8');
        } else {
            rawText = vaultBufferOrText.toString('utf8');
        }
    } else if (typeof vaultBufferOrText === 'string') {
        rawText = vaultBufferOrText;
    } else {
        throw new Error('Dữ liệu vault không hợp lệ');
    }

    // Detokenize đường dẫn theo môi trường máy đích
    const detokenizedText = detokenizePaths(rawText, options.envMap);

    let manifest;
    try {
        manifest = JSON.parse(detokenizedText);
    } catch (err) {
        throw new Error(`Không thể phân tích dữ liệu Vault JSON: ${err.message}`);
    }

    const profileDir = resolveActiveProfileDir(options.profileDir);
    const timestamp = Date.now();
    const backupFiles = [];

    function safeWriteFile(targetPath, content) {
        if (fs.existsSync(targetPath)) {
            const backupPath = `${targetPath}.bak.${timestamp}`;
            fs.copyFileSync(targetPath, backupPath);
            backupFiles.push(backupPath);
        }
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, content, 'utf8');
    }

    const restored = {
        mcp: 0,
        skills: 0,
        prompts: 0,
        models: 0,
        styles: 0
    };

    // 1. Phục hồi mcp.json
    if (manifest.mcp) {
        const targetMcpPath = path.join(profileDir, 'mcp.json');
        safeWriteFile(targetMcpPath, JSON.stringify(manifest.mcp, null, 2));
        restored.mcp = manifest.mcp.servers ? Object.keys(manifest.mcp.servers).length : 1;
    }

    // 2. Phục hồi chatLanguageModels.json
    if (manifest.models) {
        const targetModelsPath = path.join(profileDir, 'chatLanguageModels.json');
        safeWriteFile(targetModelsPath, JSON.stringify(manifest.models, null, 2));
        restored.models = Array.isArray(manifest.models) ? manifest.models.length : 1;
    }

    // 3. Phục hồi prompts
    if (Array.isArray(manifest.prompts)) {
        const targetPromptsDir = path.join(profileDir, 'prompts');
        for (const prompt of manifest.prompts) {
            const filename = prompt.relativePath || prompt.name;
            if (filename && prompt.content !== undefined) {
                const targetPath = path.join(targetPromptsDir, filename);
                safeWriteFile(targetPath, prompt.content);
                restored.prompts++;
            }
        }
    }

    // 4. Phục hồi external skills
    if (Array.isArray(manifest.skills)) {
        for (const skill of manifest.skills) {
            if (skill.relativePath && skill.content !== undefined) {
                const rootDir = skill.source
                    ? path.join(os.homedir(), ...skill.source.split('/'))
                    : path.join(os.homedir(), '.agents', 'skills');
                const targetPath = path.join(rootDir, ...skill.relativePath.split('/'));
                safeWriteFile(targetPath, skill.content);
                restored.skills++;
            }
        }
    }

    // 5. Phục hồi styles
    if (Array.isArray(manifest.styles)) {
        const targetStyleDir = path.join(os.homedir(), '.jarvis', 'style');
        for (const style of manifest.styles) {
            if (style.relativePath && style.content !== undefined) {
                const targetPath = path.join(targetStyleDir, ...style.relativePath.split('/'));
                safeWriteFile(targetPath, style.content);
                restored.styles++;
            }
        }
    }

    return {
        success: true,
        restored,
        backupFiles
    };
}

module.exports = {
    getCodeUserDir,
    resolveActiveProfileDir,
    collectAgentCustomizations,
    exportVault,
    importVault
};
