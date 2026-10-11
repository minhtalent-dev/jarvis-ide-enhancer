const os = require('os');
const path = require('path');

/**
 * Tokenize đường dẫn cục bộ thành biến ảo (${userHome}, ${mcpStorage})
 * @param {string} text - Chuỗi văn bản cấu hình
 * @returns {string} Chuỗi văn bản sau khi chuẩn hóa
 */
function tokenizePaths(text) {
    if (!text || typeof text !== 'string') return text;

    let result = text;
    const home = os.homedir();

    if (home) {
        // Windows backslash escaped trong JSON: C:\\Users\\mes
        const homeDoubleEscaped = home.replace(/\\/g, '\\\\').replace(/[.*+?^${}()|[\]]/g, '\\$&');
        // Normal backslash: C:\Users\mes
        const homeSingleEscaped = home.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Forward slash: C:/Users/mes
        const homeForwardSlash = home.replace(/\\/g, '/').replace(/[.*+?^${}()|[\]]/g, '\\$&');

        const flag = process.platform === 'win32' ? 'gi' : 'g';
        result = result.replace(new RegExp(homeDoubleEscaped, flag), '${userHome}');
        result = result.replace(new RegExp(homeSingleEscaped, flag), '${userHome}');
        result = result.replace(new RegExp(homeForwardSlash, flag), '${userHome}');
    }

    // Chuẩn hóa đường dẫn cố định D:\4_MCP
    const mcpStoragePatterns = [
        /D:\\\\4_MCP/gi,
        /D:\\4_MCP/gi,
        /D:\/4_MCP/gi
    ];
    for (const p of mcpStoragePatterns) {
        result = result.replace(p, '${mcpStorage}');
    }

    return result;
}

/**
 * Detokenize biến ảo ngược lại thành đường dẫn thực tế trên máy đích
 * @param {string} text - Chuỗi văn bản đã tokenized
 * @param {Object} envMap - Bản đồ ghi đè môi trường đích (userHome, mcpStorage)
 * @returns {string} Chuỗi văn bản thực tế
 */
function detokenizePaths(text, envMap = {}) {
    if (!text || typeof text !== 'string') return text;

    const targetHome = envMap.userHome || os.homedir();
    const defaultMcpStorage = path.join(os.homedir(), '.jarvis', 'mcp-storage');
    const targetMcpStorage = envMap.mcpStorage || defaultMcpStorage;

    const trimmed = text.trim();
    const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');

    // Trong JSON string, ký tự backslash của Windows bắt buộc phải escape thành \\
    const homeVal = isJson ? targetHome.replace(/\\/g, '\\\\') : targetHome;
    const mcpVal = isJson ? targetMcpStorage.replace(/\\/g, '\\\\') : targetMcpStorage;

    return text
        .replace(/\$\{userHome\}/g, homeVal)
        .replace(/\$\{mcpStorage\}/g, mcpVal);
}

/**
 * Bóc tách mật khẩu DB, Brave API Key, Private Tunnel URLs và Secret IDs
 * @param {string} jsonString - Chuỗi JSON cấu hình
 * @returns {{ sanitizedText: string, secretMap: Object }}
 */
function sanitizeSecrets(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
        return { sanitizedText: jsonString, secretMap: {} };
    }

    let sanitized = jsonString;
    const secretMap = {};
    const counters = {
        'SECRET:MSSQL_PASSWORD': 0,
        'SECRET:POSTGRES_PASSWORD': 0,
        'SECRET:BRAVE_API_KEY': 0,
        'TUNNEL:ENDPOINT': 0,
        'SECRET:ID': 0
    };

    function registerSecret(prefix, val) {
        if (!val || typeof val !== 'string' || val.startsWith('{{')) return null;

        // Nếu secret này đã được ánh xạ với prefix tương ứng, tái sử dụng token
        for (const [token, mappedVal] of Object.entries(secretMap)) {
            if (mappedVal === val && token.startsWith(`{{${prefix}`)) {
                return token;
            }
        }

        counters[prefix] = (counters[prefix] || 0) + 1;
        const count = counters[prefix];
        const placeholder = count === 1 ? `{{${prefix}}}` : `{{${prefix}_${count}}}`;
        secretMap[placeholder] = val;
        return placeholder;
    }

    // 1. Brave API Key
    sanitized = sanitized.replace(/("BRAVE_API_KEY"\s*:\s*")([^"]+)(")/g, (match, p1, keyVal, p3) => {
        const token = registerSecret('SECRET:BRAVE_API_KEY', keyVal);
        return token ? `${p1}${token}${p3}` : match;
    });

    // 2. MSSQL Passwords
    // 2.1 Password trong connection string: Password=xyz; hoặc PWD=xyz;
    sanitized = sanitized.replace(/(Password|PWD)=([^;"]+)(;?)/gi, (match, p1, pwdVal, p3) => {
        const token = registerSecret('SECRET:MSSQL_PASSWORD', pwdVal);
        return token ? `${p1}=${token}${p3}` : match;
    });

    // 2.2 Password trong env: "MSSQL_PASSWORD": "xyz"
    sanitized = sanitized.replace(/("MSSQL_PASSWORD"\s*:\s*")([^"]+)(")/gi, (match, p1, pwdVal, p3) => {
        const token = registerSecret('SECRET:MSSQL_PASSWORD', pwdVal);
        return token ? `${p1}${token}${p3}` : match;
    });

    // 2.3 Password trong arguments: "--password", "xyz"
    sanitized = sanitized.replace(/("--password"\s*,\s*")([^"]+)(")/gi, (match, p1, pwdVal, p3) => {
        const token = registerSecret('SECRET:MSSQL_PASSWORD', pwdVal);
        return token ? `${p1}${token}${p3}` : match;
    });

    // 3. PostgreSQL Passwords
    // 3.1 postgresql://user:password@host
    sanitized = sanitized.replace(/(postgresql:\/\/[^:]+:)([^@"]+)(@)/gi, (match, p1, pwdVal, p3) => {
        const token = registerSecret('SECRET:POSTGRES_PASSWORD', pwdVal);
        return token ? `${p1}${token}${p3}` : match;
    });

    // 3.2 env: "POSTGRES_PASSWORD": "xyz"
    sanitized = sanitized.replace(/("POSTGRES_PASSWORD"\s*:\s*")([^"]+)(")/gi, (match, p1, pwdVal, p3) => {
        const token = registerSecret('SECRET:POSTGRES_PASSWORD', pwdVal);
        return token ? `${p1}${token}${p3}` : match;
    });

    // 4. Private Tunnel URLs (*.abc-tunnel.us)
    sanitized = sanitized.replace(/(https?:\/\/[a-zA-Z0-9.-]+\.abc-tunnel\.us(?::\d+)?)/gi, (match, urlVal) => {
        const token = registerSecret('TUNNEL:ENDPOINT', urlVal);
        return token || match;
    });

    // 5. LAN IPs trong Connection Strings / Hosts (192.168.x.x, 10.x.x.x)
    sanitized = sanitized.replace(/(Server=|\/\/|@|\bhost["':\s]+)(\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})\b)/gi, (match, p1, ipVal) => {
        const token = registerSecret('TUNNEL:ENDPOINT', ipVal);
        return token ? `${p1}${token}` : match;
    });

    // 6. Secret IDs: ${input:chat.lm.secret.-xyz}
    sanitized = sanitized.replace(/(\$\{input:chat\.lm\.secret\.[a-zA-Z0-9_-]+\})/gi, (match, idVal) => {
        const token = registerSecret('SECRET:ID', idVal);
        return token || match;
    });

    return {
        sanitizedText: sanitized,
        secretMap
    };
}

/**
 * Khôi phục các token placeholder thành giá trị secret thực tế
 * @param {string} jsonString - Chuỗi đã được sanitize
 * @param {Object} secretMap - Bản đồ ánh xạ token -> secret
 * @returns {string} Chuỗi khôi phục đầy đủ
 */
function rehydrateSecrets(jsonString, secretMap) {
    if (!jsonString || typeof jsonString !== 'string' || !secretMap || typeof secretMap !== 'object') {
        return jsonString;
    }

    let rehydrated = jsonString;
    for (const [placeholder, val] of Object.entries(secretMap)) {
        if (typeof val === 'string') {
            rehydrated = rehydrated.split(placeholder).join(val);
        }
    }
    return rehydrated;
}

module.exports = {
    tokenizePaths,
    detokenizePaths,
    sanitizeSecrets,
    rehydrateSecrets
};
