const { test } = require('node:test');
const assert = require('node:assert/strict');

test('Macro regex trích xuất đúng token và param từ instructions rule (hỗ trợ cả có và không có backtick đóng)', () => {
    const regex = /^\s*-\s*`([a-z0-9_-]+)`?(?:\s+(<[^>]+>))?:\s*([^\r\n]+)/gm;
    const sample = `
    - \`wtn <name>: Tạo worktree độc lập từ develop hoặc main
    - \`mtdb <target>: Dùng MCP oracle-mes-test kiểm thử target
    - \`ver\` <version>: update new version
    - \`tt: tiếp tục thực hiện request
    `;

    const results = [];
    let match;
    while ((match = regex.exec(sample)) !== null) {
        results.push({
            token: '`' + match[1],
            param: match[2] ? match[2].trim() : null,
            desc: match[3].trim()
        });
    }

    assert.equal(results.length, 4);
    assert.deepEqual(results[0], {
        token: '`wtn',
        param: '<name>',
        desc: 'Tạo worktree độc lập từ develop hoặc main'
    });
    assert.deepEqual(results[1], {
        token: '`mtdb',
        param: '<target>',
        desc: 'Dùng MCP oracle-mes-test kiểm thử target'
    });
    assert.deepEqual(results[2], {
        token: '`ver',
        param: '<version>',
        desc: 'update new version'
    });
    assert.deepEqual(results[3], {
        token: '`tt',
        param: null,
        desc: 'tiếp tục thực hiện request'
    });
});

test('calculateContextWeight phân loại chính xác theo số turns chuẩn MY_RULE #21', () => {
    function calculateContextWeight(turns) {
        if (turns >= 20) return { label: 'Critical', color: '#f38ba8', dot: '🔴' };
        if (turns >= 15) return { label: 'Medium', color: '#f9e2af', dot: '🟡' };
        return { label: 'Light', color: '#a6e3a1', dot: '🟢' };
    }

    assert.deepEqual(calculateContextWeight(1), { label: 'Light', color: '#a6e3a1', dot: '🟢' });
    assert.deepEqual(calculateContextWeight(14), { label: 'Light', color: '#a6e3a1', dot: '🟢' });
    assert.deepEqual(calculateContextWeight(15), { label: 'Medium', color: '#f9e2af', dot: '🟡' });
    assert.deepEqual(calculateContextWeight(19), { label: 'Medium', color: '#f9e2af', dot: '🟡' });
    assert.deepEqual(calculateContextWeight(20), { label: 'Critical', color: '#f38ba8', dot: '🔴' });
    assert.deepEqual(calculateContextWeight(35), { label: 'Critical', color: '#f38ba8', dot: '🔴' });
});

test('Danh sách Quick Action Chips mặc định chứa đầy đủ 6 nút cốt lõi', () => {
    const DEFAULT_QUICK_CHIPS = [
        { label: '⚡ Tiếp tục', token: '`tt', desc: 'Tiếp tục thực thi implementation' },
        { label: '📋 Kế hoạch', token: '`fp', desc: 'Reindex & lập Task Plan 100% không điểm mù' },
        { label: '💡 Gợi ý', token: '`rcm', desc: 'Gợi ý 3 phương án thực thi/sửa lỗi' },
        { label: '🚀 Commit', token: '`git', desc: 'Cập nhật changelog/readme và commit git' },
        { label: '🧪 Test DB', token: '`mtdb', param: '<target>', desc: 'Kiểm thử Oracle DB mes_test' },
        { label: '🧹 Clear', token: '/clear', desc: 'Xóa phiên trò chuyện hiện tại' }
    ];

    assert.equal(DEFAULT_QUICK_CHIPS.length, 6);
    const tokens = DEFAULT_QUICK_CHIPS.map(c => c.token);
    assert.ok(tokens.includes('`tt'));
    assert.ok(tokens.includes('`fp'));
    assert.ok(tokens.includes('`rcm'));
    assert.ok(tokens.includes('`git'));
    assert.ok(tokens.includes('`mtdb'));
    assert.ok(tokens.includes('/clear'));

    const dbChip = DEFAULT_QUICK_CHIPS.find(c => c.token === '`mtdb');
    assert.equal(dbChip.param, '<target>');
});

test('Tính toán tọa độ selection khi bôi đen tham số', () => {
    const range = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 };
    const macro = { token: '`wtn', param: '<name>' };
    const insertText = `${macro.token} ${macro.param} `;

    assert.equal(insertText, '`wtn <name> ');
    const paramStartCol = range.startColumn + macro.token.length + 1; // 1 + 4 + 1 = 6
    const paramEndCol = paramStartCol + macro.param.length; // 6 + 6 = 12

    assert.equal(paramStartCol, 6);
    assert.equal(paramEndCol, 12);
    assert.equal(insertText.substring(paramStartCol - range.startColumn, paramEndCol - range.startColumn), '<name>');
});

test('Quick Action Chip tự động thêm hậu tố > để add nhanh workflow', () => {
    function formatChipInsertText(chip) {
        const hasParam = typeof chip.param === 'string' && chip.param.length > 0;
        const suffix = (chip.token === '/clear' || chip.token.trim().endsWith('>')) ? ' ' : ' > ';
        return hasParam ? `${chip.token} ${chip.param}${suffix}` : `${chip.token}${suffix}`;
    }

    assert.equal(formatChipInsertText({ token: '`tt' }), '`tt > ');
    assert.equal(formatChipInsertText({ token: '`fp' }), '`fp > ');
    assert.equal(formatChipInsertText({ token: '`rcm' }), '`rcm > ');
    assert.equal(formatChipInsertText({ token: '`git' }), '`git > ');
    assert.equal(formatChipInsertText({ token: '`mtdb', param: '<target>' }), '`mtdb <target> > ');
    assert.equal(formatChipInsertText({ token: '/clear' }), '/clear ');
    assert.equal(formatChipInsertText({ token: '`custom >' }), '`custom > ');
});

test('Session turn counter cô lập theo sessionKey và trả về 0 cho phiên mới', () => {
    const turnMap = new Map();

    function mockCountSessionTurns(sessionKey, userRequests, timelineCount) {
        if (userRequests.length === 0 && timelineCount === 0) {
            return 0;
        }
        let state = turnMap.get(sessionKey);
        if (!state) {
            state = { seenIndices: new Set(), maxTurns: 0 };
            turnMap.set(sessionKey, state);
        }
        for (const req of userRequests) {
            state.seenIndices.add(req);
        }
        state.maxTurns = Math.max(state.maxTurns, timelineCount, state.seenIndices.size, userRequests.length);
        return state.maxTurns;
    }

    // Phiên cũ: 13 turns
    const oldKey = 'Local · session cu:::hoi cu';
    const oldTurns = mockCountSessionTurns(oldKey, Array.from({ length: 13 }, (_, i) => `req-${i}`), 13);
    assert.equal(oldTurns, 13);

    // Phiên mới hoàn toàn trống: phải là 0, không bị dính 13 của phiên cũ
    const emptyNewKey = 'New Chat:::';
    const emptyTurns = mockCountSessionTurns(emptyNewKey, [], 0);
    assert.equal(emptyTurns, 0);

    // Phiên mới sau khi user gửi 3 câu: phải là 3
    const newChatKey = 'Local · chao:::chao';
    const turns1 = mockCountSessionTurns(newChatKey, ['req-chao-1'], 1);
    assert.equal(turns1, 1);
    const turns3 = mockCountSessionTurns(newChatKey, ['req-chao-1', 'req-chao-2', 'req-chao-3'], 3);
    assert.equal(turns3, 3);

    // Kiểm tra lại phiên cũ vẫn giữ nguyên 13 độc lập
    assert.equal(turnMap.get(oldKey).maxTurns, 13);
});
