const { test } = require('node:test');
const assert = require('node:assert/strict');

test('Macro regex trích xuất đúng token và param từ instructions rule (hỗ trợ cả có và không có backtick đóng)', () => {
    const regex = /^\s*-\s*`([a-z0-9_-]+)`?(?:\s+(<[^>]+>))?`?:\s*([^\r\n]+)/gm;
    const sample = `
    - \`wtn <name>: Tạo worktree độc lập từ develop hoặc main
    - \`mtdb <target>: Dùng MCP oracle-mes-test kiểm thử target
    - \`ver\` <version>: update new version
    - \`tt: tiếp tục thực hiện request
    - \`git <hash>\`: cập nhật commit git
    - \`rf <function>\`: reindex function
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

    assert.equal(results.length, 6);
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
    assert.deepEqual(results[4], {
        token: '`git',
        param: '<hash>',
        desc: 'cập nhật commit git'
    });
    assert.deepEqual(results[5], {
        token: '`rf',
        param: '<function>',
        desc: 'reindex function'
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
        { label: '🚀 Commit', token: '`git', param: '<hash>', desc: 'Cập nhật changelog/readme và commit git' },
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

    const gitChip = DEFAULT_QUICK_CHIPS.find(c => c.token === '`git');
    assert.equal(gitChip.param, '<hash>');
});

test('Quick Action Chip tự động kế thừa param từ dynamic macros khi cấu hình chip cũ không có param', () => {
    const dynamicMacros = [
        { token: '`git', param: '<hash>', desc: 'commit git' },
        { token: '`vrf', param: '<target>', desc: 'verify target' },
        { token: '`tt', param: null, desc: 'continue' }
    ];

    function resolveChipParam(chip, macros) {
        if (!chip) return null;
        if (typeof chip.param === 'string' && chip.param.trim().length > 0) return chip.param.trim();
        if (Array.isArray(macros)) {
            const m = macros.find(item => item && item.token === chip.token);
            if (m && typeof m.param === 'string' && m.param.trim().length > 0) return m.param.trim();
        }
        return null;
    }

    const staleGitChip = { label: 'git', token: '`git' };
    assert.equal(resolveChipParam(staleGitChip, dynamicMacros), '<hash>');

    const staleVrfChip = { label: 'vrf', token: '`vrf' };
    assert.equal(resolveChipParam(staleVrfChip, dynamicMacros), '<target>');

    const ttChip = { label: 'tt', token: '`tt' };
    assert.equal(resolveChipParam(ttChip, dynamicMacros), null);
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

test('calculateTabJumpTarget tự động nhảy qua dấu > và bôi đen placeholder kế tiếp', () => {
    function calculateTabJumpTarget(lineContent, cursorColumn) {
        if (typeof lineContent !== 'string') return null;
        const col = Math.max(1, Math.min(cursorColumn, lineContent.length + 1));
        const textAfter = lineContent.slice(col - 1);

        const match = /(?:^|\s*)>\s*/.exec(textAfter);
        if (match) {
            let targetCol = col + match.index + match[0].length;
            let needsSpace = false;
            if (!match[0].endsWith(' ') && (targetCol > lineContent.length || lineContent.charAt(targetCol - 1) !== ' ')) {
                needsSpace = true;
            }
            const textAhead = lineContent.slice(targetCol - 1);
            const placeholderMatch = /^(?:[^\s<]*\s+)?(<[a-zA-Z0-9_.:-]+>)/.exec(textAhead);
            if (placeholderMatch) {
                const pToken = placeholderMatch[1];
                const pStart = targetCol + placeholderMatch[0].lastIndexOf(pToken);
                const pEnd = pStart + pToken.length;
                return { targetColumn: targetCol, selection: { startColumn: pStart, endColumn: pEnd }, needsSpace };
            }
            return { targetColumn: targetCol, selection: null, needsSpace };
        }

        const directPlaceholder = /<[a-zA-Z0-9_.:-]+>/.exec(textAfter);
        if (directPlaceholder) {
            const pStart = col + directPlaceholder.index;
            const pEnd = pStart + directPlaceholder[0].length;
            return { targetColumn: pEnd, selection: { startColumn: pStart, endColumn: pEnd }, needsSpace: false };
        }

        return null;
    }

    // Trường hợp 1: Đã nhập xong param `git zxczxc > `, cursor ở cột 13 (sau zxczxc)
    const line1 = '`git zxczxc > ';
    const res1 = calculateTabJumpTarget(line1, 13);
    assert.ok(res1);
    assert.equal(res1.targetColumn, 15);
    assert.equal(res1.selection, null);
    assert.equal(res1.needsSpace, false);

    // Trường hợp 2: Dấu > ở cuối không có space `git zxczxc >`
    const line2 = '`git zxczxc >';
    const res2 = calculateTabJumpTarget(line2, 13);
    assert.ok(res2);
    assert.equal(res2.targetColumn, 14);
    assert.equal(res2.needsSpace, true);

    // Trường hợp 3: Chuỗi workflow kép `git zxczxc > `vrf <target> > `
    const line3 = '`git zxczxc > `vrf <target> > ';
    const res3 = calculateTabJumpTarget(line3, 13);
    assert.ok(res3);
    assert.equal(res3.targetColumn, 15);
    assert.ok(res3.selection);
    assert.equal(res3.selection.startColumn, 20);
    assert.equal(res3.selection.endColumn, 28);
    assert.equal(line3.slice(res3.selection.startColumn - 1, res3.selection.endColumn - 1), '<target>');

    // Trường hợp 4: Không có dấu > hay placeholder nào
    const line4 = 'hello world';
    const res4 = calculateTabJumpTarget(line4, 5);
    assert.equal(res4, null);
});
