/**
 * Custom JS Loader - Chat Slash Command Decoration Bridge
 * Tự động bôi xanh pill cho mọi slash command trong Chat Input (sau space, >, hoặc đầu câu)
 */
(function () {
    'use strict';

    const JARVIS_DEFAULT_QUICK_CHIPS = [
        { label: '⚡ Tiếp tục', token: '`tt', desc: 'Tiếp tục thực thi implementation' },
        { label: '📋 Kế hoạch', token: '`fp', desc: 'Reindex & lập Task Plan 100% không điểm mù' },
        { label: '💡 Gợi ý', token: '`rcm', desc: 'Gợi ý 3 phương án thực thi/sửa lỗi' },
        { label: '🚀 Commit', token: '`git', param: '<hash>', desc: 'Cập nhật changelog/readme và commit git' },
        { label: '🧪 Test DB', token: '`mtdb', param: '<target>', desc: 'Kiểm thử Oracle DB mes_test' },
        { label: '🧹 Clear', token: '/clear', desc: 'Xóa phiên trò chuyện hiện tại' }
    ];

    function resolveChipParam(chip) {
        if (!chip) return null;
        if (typeof chip.param === 'string' && chip.param.trim().length > 0) {
            return chip.param.trim();
        }
        if (window.__jarvisDynamicMacros && Array.isArray(window.__jarvisDynamicMacros)) {
            const macro = window.__jarvisDynamicMacros.find(m => m && m.token === chip.token);
            if (macro && typeof macro.param === 'string' && macro.param.trim().length > 0) {
                return macro.param.trim();
            }
        }
        return null;
    }

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

    function tryHandleTabJump(editor) {
        if (!editor || typeof editor.getModel !== 'function') return false;
        const model = editor.getModel();
        if (!model) return false;

        const selection = typeof editor.getSelection === 'function' ? editor.getSelection() : null;
        const pos = (selection && !selection.isEmpty && !selection.isEmpty())
            ? selection.getEndPosition()
            : (typeof editor.getPosition === 'function' ? editor.getPosition() : null);
        if (!pos) return false;

        let targetLine = pos.lineNumber;
        let lineContent = model.getLineContent(targetLine);
        let result = calculateTabJumpTarget(lineContent, pos.column);

        if (!result && targetLine < model.getLineCount()) {
            const totalLines = model.getLineCount();
            for (let l = targetLine + 1; l <= totalLines; l++) {
                const nextContent = model.getLineContent(l);
                const nextRes = calculateTabJumpTarget(nextContent, 1);
                if (nextRes) {
                    targetLine = l;
                    lineContent = nextContent;
                    result = nextRes;
                    break;
                }
            }
        }

        if (!result) return false;

        let targetCol = result.targetColumn;
        if (result.needsSpace) {
            editor.executeEdits('jarvis-tab-jump', [{
                range: { startLineNumber: targetLine, startColumn: targetCol, endLineNumber: targetLine, endColumn: targetCol },
                text: ' '
            }]);
            targetCol += 1;
        }

        if (result.selection) {
            const selOffset = result.needsSpace ? 1 : 0;
            editor.setSelection({
                startLineNumber: targetLine,
                startColumn: result.selection.startColumn + selOffset,
                endLineNumber: targetLine,
                endColumn: result.selection.endColumn + selOffset
            });
        } else {
            editor.setPosition({
                lineNumber: targetLine,
                column: targetCol
            });
        }
        editor.focus();
        return true;
    }

    function getQuickChips() {
        const raw = (window.__jarvisQuickChips && Array.isArray(window.__jarvisQuickChips) && window.__jarvisQuickChips.length > 0)
            ? window.__jarvisQuickChips
            : JARVIS_DEFAULT_QUICK_CHIPS;
        if (!window.__jarvisDynamicMacros || !Array.isArray(window.__jarvisDynamicMacros)) {
            return raw;
        }
        return raw.map(chip => {
            if (!chip || !chip.token) return chip;
            const dynamicParam = resolveChipParam(chip);
            return dynamicParam ? { ...chip, param: dynamicParam } : chip;
        });
    }

    function handleQuickChipClick(chip) {
        if (!chip || !chip.token) return;
        let ed = window.__chatInputEditor;
        if (ed && typeof ed.focus === 'function') {
            ed.focus();
        } else {
            findAndAttachChatEditor();
            ed = window.__chatInputEditor;
        }
        if (!ed || typeof ed.getSelection !== 'function' || typeof ed.executeEdits !== 'function') return;

        const selection = ed.getSelection();
        if (!selection) return;
        let range = {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn
        };
        const model = ed.getModel();
        if (model && range.startLineNumber === range.endLineNumber) {
            const lineContent = model.getLineContent(range.endLineNumber);
            const textAfter = lineContent.slice(range.endColumn - 1);
            if (/^\s*>\s*$/.test(textAfter)) {
                // Con trỏ đang đứng ngay trước dấu > cuối dòng; tự động chuyển vị trí chèn ra sau >
                const endCol = lineContent.length + 1;
                range = {
                    startLineNumber: range.endLineNumber,
                    startColumn: endCol,
                    endLineNumber: range.endLineNumber,
                    endColumn: endCol
                };
            }
        }
        const param = resolveChipParam(chip);
        const hasParam = typeof param === 'string' && param.length > 0;
        const suffix = (chip.token === '/clear' || chip.token.trim().endsWith('>')) ? ' ' : ' > ';
        const insertText = hasParam ? `${chip.token} ${param}${suffix}` : `${chip.token}${suffix}`;
        ed.executeEdits('jarvis-quick-chip', [{ range, text: insertText }]);

        if (hasParam) {
            const paramStartColumn = range.startColumn + chip.token.length + 1;
            ed.setSelection({
                startLineNumber: range.startLineNumber,
                startColumn: paramStartColumn,
                endLineNumber: range.startLineNumber,
                endColumn: paramStartColumn + param.length
            });
        } else {
            ed.setPosition({
                lineNumber: range.startLineNumber,
                column: range.startColumn + insertText.length
            });
        }
        ed.focus();
    }

    function getTargetChatContainer() {
        const editor = window.__chatInputEditor;
        const editorDom = editor && ((editor.getDomNode && editor.getDomNode()) || (editor.getContainerDomNode && editor.getContainerDomNode()));
        if (editorDom && editorDom.closest) {
            const innerContainer = editorDom.closest('.chat-input-container');
            if (innerContainer) return innerContainer;
        }
        const activeContainer = document.querySelector('.interactive-session:not(.hidden) .chat-input-container, .interactive-input-part:not(.hidden) .chat-input-container');
        if (activeContainer) return activeContainer;
        return document.querySelector('.chat-input-container') || document.querySelector('.interactive-input-part');
    }

    let _isInjectingChips = false;
    function injectQuickActionChips() {
        if (_isInjectingChips || typeof document === 'undefined') return;
        _isInjectingChips = true;
        try {
            const container = getTargetChatContainer();
            if (!container) return;

            const chips = getQuickChips();
            const signature = JSON.stringify(chips);
            let bar = document.getElementById('jarvis-quick-chips-bar');
            if (bar) {
                if (bar.parentElement !== container) {
                    container.insertBefore(bar, container.firstChild);
                }
                // Nếu nội dung chips không đổi và bar đã ở trong container, KHÔNG XÓA CON để tránh giật chiều cao
                if (bar.dataset.quickChipsSignature === signature) return;
                while (bar.firstChild) bar.removeChild(bar.firstChild);
            } else {
                bar = document.createElement('div');
                bar.className = 'jarvis-quick-chips-bar';
                bar.id = 'jarvis-quick-chips-bar';
                container.insertBefore(bar, container.firstChild);
            }

            for (const chip of chips) {
                if (!chip || !chip.label || !chip.token) continue;
                const button = document.createElement('button');
                button.className = 'jarvis-quick-chip';
                button.type = 'button';
                button.textContent = chip.label;
                button.title = (chip.desc || chip.token) + (chip.param ? ` ${chip.param}` : '');
                button.addEventListener('mousedown', (event) => event.preventDefault());
                button.addEventListener('click', () => handleQuickChipClick(chip));
                button.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    if (window.__commandService) {
                        window.__commandService.executeCommand('jarvisEnhancer.manageQuickChips');
                    }
                });
                bar.appendChild(button);
            }

            const addButton = document.createElement('button');
            addButton.className = 'jarvis-quick-chip-add';
            addButton.type = 'button';
            addButton.title = 'Quản lý Quick Chips (Thêm/Xóa/Reset)';
            addButton.textContent = '+';
            addButton.addEventListener('mousedown', (event) => event.preventDefault());
            addButton.addEventListener('click', () => {
                if (window.__commandService) {
                    window.__commandService.executeCommand('jarvisEnhancer.manageQuickChips');
                }
            });
            bar.appendChild(addButton);
            bar.dataset.quickChipsSignature = signature;
        } catch (_) {} finally {
            _isInjectingChips = false;
        }
    }

    let _chipsDebounceTimer = null;
    function scheduleInjectQuickActionChips() {
        if (_chipsDebounceTimer) return;
        _chipsDebounceTimer = setTimeout(() => {
            _chipsDebounceTimer = null;
            injectQuickActionChips();
        }, 300);
    }

    window.addEventListener('jarvis-chips-updated', () => scheduleInjectQuickActionChips());

    window.__jarvisSessionTurnMap = new Map();

    /**
     * Quét và trích xuất danh sách token backtick macro, loại trừ các khối inline code Markdown
     */
    function findBacktickMacroTokens(text) {
        if (!text || typeof text !== 'string') return [];

        const activeMacros = getActiveMacros();
        const knownMacroTokens = new Set(activeMacros.map((m) => m.token.toLowerCase()));

        const inlineCodeRanges = [];
        const inlineCodeRe = /(?:^|[^\\])`([^`\r\n]+)`(?=[\s.,;:!?)\]\r\n]|$)/gu;
        let m;
        while ((m = inlineCodeRe.exec(text)) !== null) {
            const fullMatch = m[0];
            const codeContent = m[1];
            if (knownMacroTokens.has(('`' + codeContent).toLowerCase())) {
                continue;
            }
            const prefixLen = fullMatch.length - codeContent.length - 2;
            const codeStart = m.index + prefixLen;
            const codeEnd = codeStart + codeContent.length + 2;
            inlineCodeRanges.push([codeStart, codeEnd]);
        }

        const tokens = [];
        const macroRe = /(?:^|[\s>:,;])(`[\p{L}0-9_.:-]+)(?:`|(?=[\s>:,;.?!)\]]|$))/gu;
        let mb;
        while ((mb = macroRe.exec(text)) !== null) {
            const fullMatch = mb[0];
            const rawToken = mb[1];
            const tokenStart = mb.index + fullMatch.lastIndexOf(rawToken);
            const hasTrailingBacktick = fullMatch.endsWith('`');
            const tokenEnd = tokenStart + rawToken.length + (hasTrailingBacktick ? 1 : 0);

            const insideInline = inlineCodeRanges.some(([start, end]) => tokenStart < end && tokenEnd > start);

            if (!insideInline) {
                tokens.push({
                    token: rawToken,
                    start: tokenStart,
                    end: tokenEnd,
                    index: tokenStart,
                    length: tokenEnd - tokenStart
                });
            }
        }

        return tokens;
    }

    /**
     * Macro Registry - 20 backtick macros chuẩn của JARVIS
     */
    const JARVIS_DEFAULT_MACROS = [
        { token: '`fp', desc: 'Reindex LSP, ma trận 4 tầng, plan 100% không điểm mù' },
        { token: '`tt', desc: 'Tiếp tục thực hiện implementation plan' },
        { token: '`rcm', desc: 'Gợi ý 3 option fix/execute/debug' },
        { token: '`wtn', param: '<name>', desc: 'Tạo worktree mới độc lập từ develop/main' },
        { token: '`wtm', param: '<name>', desc: 'Merge worktree vào develop/main & sync DB' },
        { token: '`ver', param: '<version>', desc: 'Cập nhật new version cho hệ thống/tài liệu' },
        { token: '`mtdb', param: '<target>', desc: 'Kiểm thử Oracle DB mes_test (describe, test cases, cleanup)' },
        { token: '`rf', desc: 'Reindex function' },
        { token: '`rp', desc: 'Reindex project' },
        { token: '`rp1', desc: 'Kiểm tra plan/phase đúng đủ chuẩn 100%' },
        { token: '`rp2', desc: 'Lên plan toàn diện bằng 17-auto-plan' },
        { token: '`rp3', desc: 'Kiểm tra plan đủ chi tiết và không điểm mù' },
        { token: '`rp4', desc: 'Reindex & kiểm tra triển khai xong plan/phase' },
        { token: '`rp5', desc: 'Reindex & kiểm tra triển khai plan/phase' },
        { token: '`git', desc: 'Cập nhật changelog, readme và commit git' },
        { token: '`up', desc: 'Cập nhật thêm yêu cầu vào plan, không xóa cũ' },
        { token: '`mit', desc: 'Thực hiện qua MCP minit-it-factory' },
        { token: '`dp', desc: 'Auto-execute thực hiện chuẩn 100% plan/phase' },
        { token: '`nbd', desc: 'Không build, không debug bằng browser' },
        { token: '`nd', desc: 'Không debug bằng browser' },
        { token: '`vrf', desc: 'Verify yêu cầu/kết quả thực thi có bằng chứng' }
    ];

    /**
     * Slash Commands & Skills Registry - 36 skills + system commands
     */
    const JARVIS_DEFAULT_SLASH_COMMANDS = [
        { token: '/33-new-task', desc: 'Tạo hoặc cập nhật task plan production-grade 11 sections' },
        { token: '/01-create-plan', desc: 'Lập kế hoạch triển khai chi tiết' },
        { token: '/02-critic', desc: 'Đánh giá, phản biện và thẩm định rủi ro' },
        { token: '/03-planner-refine', desc: 'Tinh chỉnh và bổ sung kế hoạch' },
        { token: '/04-do-plan', desc: 'Thực thi các task theo kế hoạch đã duyệt' },
        { token: '/05-validate', desc: 'Kiểm tra và nghiệm thu kết quả' },
        { token: '/06-debug', desc: 'Điều tra và xử lý lỗi hệ thống' },
        { token: '/07-ui-fix', desc: 'Sửa lỗi giao diện và trải nghiệm người dùng' },
        { token: '/08-project-index', desc: 'Đánh chỉ mục toàn bộ dự án' },
        { token: '/09-function-index', desc: 'Đánh chỉ mục chi tiết các hàm' },
        { token: '/10-new-feature', desc: 'Phát triển tính năng mới' },
        { token: '/11-save-brain', desc: 'Lưu tri thức và ghi nhận CHANGELOG/README' },
        { token: '/12-design-ui-ux', desc: 'Thiết kế giao diện người dùng hiện đại' },
        { token: '/17-auto-plan', desc: 'Lập kế hoạch tự động toàn diện' },
        { token: '/18-auto-execute', desc: 'Thực thi tự động tuân thủ 100% plan' },
        { token: '/20-call-mcp', desc: 'Gọi công cụ MCP Server' },
        { token: '/34-auto-screenshot-dotnet', desc: 'Tự động chụp ảnh tài liệu giao diện' },
        { token: '/ccs-delegation', desc: 'Ủy quyền task cho CCS CLI profile' },
        { token: '/find-skills', desc: 'Tìm kiếm và khám phá các skills mới' },
        { token: '/clear', desc: 'Xóa ngữ cảnh hội thoại hiện tại' },
        { token: '/help', desc: 'Trợ giúp về Copilot và các lệnh' }
    ];

    function getActiveMacros() {
        const dynamicMacros = window.__jarvisDynamicMacros || window.__jarvisCustomMacros;
        if (Array.isArray(dynamicMacros) && dynamicMacros.length > 0) {
            return dynamicMacros;
        }
        return JARVIS_DEFAULT_MACROS;
    }

    function getActiveSlashCommands() {
        const dynamicCommands = window.__jarvisSlashCommands;
        if (Array.isArray(dynamicCommands) && dynamicCommands.length > 0) {
            return dynamicCommands;
        }
        return JARVIS_DEFAULT_SLASH_COMMANDS;
    }

    let _macroPopupEl = null;
    let _activeEditorForMacro = null;
    let _currentReplaceRange = null;
    let _filteredMacros = [];
    let _selectedMacroIndex = 0;

    function getOrCreateMacroPopup() {
        if (typeof document === 'undefined') return null;
        if (!_macroPopupEl) {
            _macroPopupEl = document.getElementById('jarvis-macro-autocomplete-popup');
            if (!_macroPopupEl) {
                _macroPopupEl = document.createElement('div');
                _macroPopupEl.id = 'jarvis-macro-autocomplete-popup';
                _macroPopupEl.className = 'jarvis-macro-popup';
                _macroPopupEl.addEventListener('mousedown', (e) => {
                    // Giữ focus trên Monaco editor khi click vào popup
                    e.preventDefault();
                });
                document.addEventListener('pointerdown', (e) => {
                    if (_macroPopupEl && _macroPopupEl.classList.contains('active')) {
                        if (!_macroPopupEl.contains(e.target)) {
                            hideMacroPopup();
                        }
                    }
                }, true);
                document.body.appendChild(_macroPopupEl);
            }
        }
        return _macroPopupEl;
    }

    function hideMacroPopup() {
        if (_macroPopupEl) {
            _macroPopupEl.classList.remove('active');
            _macroPopupEl.innerHTML = '';
        }
        _currentReplaceRange = null;
        _filteredMacros = [];
        _selectedMacroIndex = 0;
        _activeEditorForMacro = null;
    }

    function isMacroPopupActive() {
        return !!(_macroPopupEl && _macroPopupEl.classList.contains('active'));
    }

    function applyMacroToEditor(macro) {
        if (!macro || !_currentReplaceRange || !_activeEditorForMacro) return;
        try {
            const targetEditor = _activeEditorForMacro;
            const range = { ..._currentReplaceRange };
            const model = typeof targetEditor.getModel === 'function' ? targetEditor.getModel() : null;
            if (model && macro.token.startsWith('`')) {
                const lineContent = model.getLineContent(range.endLineNumber) || '';
                if (lineContent.charAt(range.endColumn - 1) === '`') {
                    range.endColumn = range.endColumn + 1;
                }
            }
            const hasParam = !!(macro && macro.param && typeof macro.param === 'string');
            const insertText = hasParam ? `${macro.token} ${macro.param} ` : `${macro.token} `;
            targetEditor.executeEdits('jarvis-macro', [{ range, text: insertText }]);
            if (hasParam) {
                const paramStartCol = range.startColumn + macro.token.length + 1;
                const paramEndCol = paramStartCol + macro.param.length;
                targetEditor.setSelection({
                    startLineNumber: range.startLineNumber,
                    startColumn: paramStartCol,
                    endLineNumber: range.startLineNumber,
                    endColumn: paramEndCol
                });
            } else {
                const nextCol = range.startColumn + insertText.length;
                targetEditor.setPosition({
                    lineNumber: range.startLineNumber,
                    column: nextCol
                });
            }
            targetEditor.focus();
        } catch (err) {
            console.error('[JARVIS] Error applying macro edit:', err);
        }
        hideMacroPopup();
    }

    function updateMacroSelectionHighlight() {
        if (!_macroPopupEl) return;
        const items = _macroPopupEl.querySelectorAll('.jarvis-macro-item');
        items.forEach((item, idx) => {
            if (idx === _selectedMacroIndex) {
                item.classList.add('selected');
                if (typeof item.scrollIntoView === 'function') {
                    item.scrollIntoView({ block: 'nearest' });
                }
            } else {
                item.classList.remove('selected');
            }
        });
    }

    function renderMacroPopup(filtered, selectedIdx) {
        const popup = getOrCreateMacroPopup();
        if (!popup) return;
        popup.innerHTML = '';
        filtered.forEach((m, idx) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'jarvis-macro-item' + (idx === selectedIdx ? ' selected' : '');

            const tokenSpan = document.createElement('span');
            tokenSpan.className = m.token.startsWith('/mcp:')
                ? 'jarvis-mcp-token'
                : (m.token.startsWith('/') ? 'jarvis-slash-token' : 'jarvis-macro-token');
            tokenSpan.textContent = m.param ? `${m.token} ${m.param}` : m.token;

            const descSpan = document.createElement('span');
            descSpan.className = 'jarvis-macro-desc';
            descSpan.textContent = m.desc;

            itemEl.appendChild(tokenSpan);
            itemEl.appendChild(descSpan);

            itemEl.addEventListener('mouseenter', () => {
                _selectedMacroIndex = idx;
                updateMacroSelectionHighlight();
            });

            itemEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                applyMacroToEditor(m);
            });

            popup.appendChild(itemEl);
        });

        updateMacroSelectionHighlight();
    }

    function positionMacroPopup(editor, pos) {
        const popup = getOrCreateMacroPopup();
        if (!popup || !editor) return;

        const domNode = typeof editor.getDomNode === 'function' ? editor.getDomNode() : null;
        if (!domNode) return;

        const editorRect = domNode.getBoundingClientRect();
        const cursorCoord = typeof editor.getScrolledVisiblePosition === 'function'
            ? editor.getScrolledVisiblePosition(pos)
            : null;

        popup.classList.add('active');

        const popupHeight = popup.offsetHeight || 220;
        const popupWidth = popup.offsetWidth || 340;

        let left = editorRect.left + (cursorCoord ? cursorCoord.left : 10);
        let top = editorRect.top + (cursorCoord ? (cursorCoord.top + cursorCoord.height + 4) : editorRect.height + 4);

        if (top + popupHeight > window.innerHeight) {
            const topAbove = editorRect.top + (cursorCoord ? cursorCoord.top : 0) - popupHeight - 6;
            if (topAbove >= 10) {
                top = topAbove;
            } else {
                top = Math.max(10, window.innerHeight - popupHeight - 10);
            }
        }

        if (left + popupWidth > window.innerWidth) {
            left = Math.max(10, window.innerWidth - popupWidth - 16);
        }

        popup.style.left = `${Math.round(left)}px`;
        popup.style.top = `${Math.round(top)}px`;
    }

    // AUTOCOMPLETE_SEARCH_HELPER_START
    function filterSlashCommands(commands, rawToken) {
        const safeString = (value) => {
            try {
                return value == null ? '' : String(value);
            } catch (err) {
                return '';
            }
        };
        let query = safeString(rawToken).replace(/^\//, '').replace(/^mcp:/i, '');
        query = query.normalize('NFC').toLowerCase();

        const ranked = [];
        if (!Array.isArray(commands)) return [];

        commands.forEach((command, index) => {
            if (!command || typeof command !== 'object' || typeof command.token !== 'string') return;

            const normalizedToken = command.token.replace(/^\//, '').normalize('NFC').toLowerCase();
            const tokenBody = normalizedToken.replace(/^mcp:/, '');
            if (!query) {
                ranked.push({ command, index, rank: 0 });
                return;
            }

            let rank = -1;
            if (tokenBody.startsWith(query)) {
                rank = 0;
            } else if (normalizedToken.includes(query)) {
                rank = 1;
            } else if (safeString(command.desc).normalize('NFC').toLowerCase().includes(query)) {
                rank = 2;
            }
            if (rank !== -1) ranked.push({ command, index, rank });
        });

        ranked.sort((left, right) => left.rank - right.rank || left.index - right.index);
        return ranked.slice(0, 50).map((entry) => entry.command);
    }
    // AUTOCOMPLETE_SEARCH_HELPER_END

    function setupMacroAutocomplete(editor) {
        if (!editor || editor.__macroAutocompleteAttached) return;
        editor.__macroAutocompleteAttached = true;

        const domNode = typeof editor.getDomNode === 'function' ? editor.getDomNode() : null;
        if (!domNode) {
            if (typeof editor.onDidFocusEditorText === 'function') {
                const sub = editor.onDidFocusEditorText(() => {
                    if (sub && typeof sub.dispose === 'function') sub.dispose();
                    editor.__macroAutocompleteAttached = false;
                    setupMacroAutocomplete(editor);
                });
            }
            return;
        }

        function checkAndTriggerAutocomplete() {
            try {
                const model = typeof editor.getModel === 'function' ? editor.getModel() : null;
                const pos = typeof editor.getPosition === 'function' ? editor.getPosition() : null;
                if (!model || !pos) {
                    if (_activeEditorForMacro === editor) hideMacroPopup();
                    return;
                }

                const lineContent = model.getLineContent(pos.lineNumber);
                const textBeforeCursor = lineContent.substring(0, pos.column - 1);
                const match = /(?:^|[\s>:,;])([`/][\p{L}0-9_.:-]*)$/u.exec(textBeforeCursor);

                if (!match) {
                    if (_activeEditorForMacro === editor) hideMacroPopup();
                    return;
                }

                const fullMatch = match[0];
                const rawToken = match[1];
                const tokenStartInFullMatch = fullMatch.lastIndexOf(rawToken);
                const startCol = (pos.column - 1) - (fullMatch.length - tokenStartInFullMatch) + 1;

                const prefix = rawToken.toLowerCase();
                let matched = [];
                if (rawToken.startsWith('/')) {
                    matched = filterSlashCommands(getActiveSlashCommands(), rawToken);
                } else {
                    matched = getActiveMacros().filter((m) => m.token.toLowerCase().startsWith(prefix));
                }

                if (matched.length === 0) {
                    if (_activeEditorForMacro === editor) hideMacroPopup();
                    return;
                }

                _activeEditorForMacro = editor;
                _currentReplaceRange = {
                    startLineNumber: pos.lineNumber,
                    startColumn: startCol,
                    endLineNumber: pos.lineNumber,
                    endColumn: pos.column
                };
                _filteredMacros = matched;
                _selectedMacroIndex = 0;

                renderMacroPopup(_filteredMacros, _selectedMacroIndex);
                positionMacroPopup(editor, pos);
            } catch (err) {
                console.error('[JARVIS] Error triggering macro autocomplete:', err);
            }
        }

        if (typeof editor.onDidChangeModelContent === 'function') {
            editor.onDidChangeModelContent(checkAndTriggerAutocomplete);
        }

        if (typeof editor.onDidChangeCursorPosition === 'function') {
            editor.onDidChangeCursorPosition(() => {
                if (isMacroPopupActive() && _activeEditorForMacro === editor) {
                    checkAndTriggerAutocomplete();
                }
            });
        }

        if (typeof editor.onDidBlurEditorText === 'function') {
            editor.onDidBlurEditorText(() => {
                setTimeout(() => {
                    if (_activeEditorForMacro === editor) {
                        hideMacroPopup();
                    }
                }, 150);
            });
        }

        domNode.addEventListener('keydown', (e) => {
            if (isMacroPopupActive() && _activeEditorForMacro === editor) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if (_filteredMacros.length > 0) {
                        _selectedMacroIndex = (_selectedMacroIndex + 1) % _filteredMacros.length;
                        updateMacroSelectionHighlight();
                    }
                    return;
                }

                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if (_filteredMacros.length > 0) {
                        _selectedMacroIndex = (_selectedMacroIndex - 1 + _filteredMacros.length) % _filteredMacros.length;
                        updateMacroSelectionHighlight();
                    }
                    return;
                }

                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if (_filteredMacros.length > 0 && _filteredMacros[_selectedMacroIndex]) {
                        applyMacroToEditor(_filteredMacros[_selectedMacroIndex]);
                    } else {
                        hideMacroPopup();
                    }
                    return;
                }

                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    hideMacroPopup();
                    return;
                }
                return;
            }

            // Khi popup macro KHÔNG hiển thị: Tab-out nhảy qua dấu > hoặc placeholder tiếp theo
            if (e.key === 'Tab' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
                if (tryHandleTabJump(editor)) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    return;
                }
            }
        }, true);
    }

    function attachChatPillDecorations(editor) {
        if (!editor || typeof editor.createDecorationsCollection !== 'function') return;
        if (editor.__slashPillAttached) return;
        editor.__slashPillAttached = true;

        setupMacroAutocomplete(editor);

        const decos = editor.createDecorationsCollection();

        function update() {
            try {
                const model = editor.getModel();
                if (!model) {
                    decos.set([]);
                    return;
                }
                const text = model.getValue();
                const re = /(?:^|[\s>:,;])(\/[\p{L}0-9_.:-]+)/gu;
                const newDecos = [];
                let m;
                while ((m = re.exec(text)) !== null) {
                    const subStart = m.index + m[0].lastIndexOf(m[1]);
                    const p1 = model.getPositionAt(subStart);
                    const p2 = model.getPositionAt(subStart + m[1].length);
                    const isMcp = m[1].startsWith('/mcp:');
                    newDecos.push({
                        range: {
                            startLineNumber: p1.lineNumber,
                            startColumn: p1.column,
                            endLineNumber: p2.lineNumber,
                            endColumn: p2.column
                        },
                        options: {
                            description: isMcp ? 'custom-mcp-command-pill' : 'custom-slash-command-pill',
                            inlineClassName: isMcp ? 'custom-mcp-pill' : 'custom-wf-pill'
                        }
                    });
                }

                const backtickTokens = findBacktickMacroTokens(text);
                for (const item of backtickTokens) {
                    const p1 = model.getPositionAt(item.start);
                    const p2 = model.getPositionAt(item.end);
                    newDecos.push({
                        range: {
                            startLineNumber: p1.lineNumber,
                            startColumn: p1.column,
                            endLineNumber: p2.lineNumber,
                            endColumn: p2.column
                        },
                        options: {
                            description: 'custom-backtick-command-pill',
                            inlineClassName: 'custom-backtick-pill'
                        }
                    });
                }

                decos.set(newDecos);
            } catch (err) {
                console.error('[JARVIS] Error updating slash decorations:', err);
            }
        }

        if (typeof editor.onDidChangeModelContent === 'function') {
            editor.onDidChangeModelContent(update);
        }
        if (typeof editor.onDidChangeModel === 'function') {
            editor.onDidChangeModel(update);
        }
        if (typeof editor.onDidFocusEditorText === 'function') {
            editor.onDidFocusEditorText(update);
        }
        if (typeof editor.onDidBlurEditorText === 'function') {
            editor.onDidBlurEditorText(update);
        }
        if (typeof editor.onDidLayoutChange === 'function') {
            editor.onDidLayoutChange(update);
        }
        update();
        setTimeout(update, 50);
        setTimeout(update, 150);
        setTimeout(update, 350);
        setTimeout(update, 800);
    }

    function findAndAttachChatEditor() {
        if (typeof document === 'undefined') return;

        // Kênh 1: window.__chatInputEditor
        if (window.__chatInputEditor && !window.__chatInputEditor.__slashPillAttached) {
            attachChatPillDecorations(window.__chatInputEditor);
        }

        // Kênh 2: window.__allCodeEditors
        if (window.__allCodeEditors && Array.isArray(window.__allCodeEditors)) {
            for (const ed of window.__allCodeEditors) {
                if (ed && !ed.__slashPillAttached) {
                    const dom = (ed.getDomNode && ed.getDomNode()) || (ed.getContainerDomNode && ed.getContainerDomNode());
                    const uri = ed.getModel && ed.getModel() && ed.getModel().uri && ed.getModel().uri.toString();
                    const isChat = (uri && (uri.includes('chat') || uri.includes('interactive') || uri.includes('session'))) ||
                                  (dom && dom.closest && dom.closest('.interactive-input-part, .chat-input-editor, .interactive-input-editor, .chat-input-widget, .chat-input-container, [class*="interactive-input"], [class*="chat-input"]'));
                    if (isChat) {
                        window.__chatInputEditor = ed;
                        attachChatPillDecorations(ed);
                    }
                }
            }
        }

        // Kênh 3: Query trực tiếp DOM
        const domEls = document.querySelectorAll('.interactive-input-editor, .chat-input-editor, .interactive-input-part, .chat-input-widget, .chat-input-container, [class*="interactive-input"], [class*="chat-input"]');
        for (const el of domEls) {
            if (el.__monacoEditor && !el.__monacoEditor.__slashPillAttached) {
                window.__chatInputEditor = el.__monacoEditor;
                attachChatPillDecorations(el.__monacoEditor);
            }
        }
    }

    let _editor = window.__chatInputEditor;
    if (_editor) attachChatPillDecorations(_editor);

    try {
        Object.defineProperty(window, '__chatInputEditor', {
            configurable: true,
            enumerable: true,
            get() { return _editor; },
            set(v) {
                _editor = v;
                if (v) attachChatPillDecorations(v);
            }
        });
    } catch (e) {}

    const timer = setInterval(() => {
        findAndAttachChatEditor();
    }, 200);

    window.addEventListener('chat-editor-ready', (e) => {
        if (e.detail) attachChatPillDecorations(e.detail);
        findAndAttachChatEditor();
    });

    if (typeof document !== 'undefined') {
        document.addEventListener('focusin', () => {
            findAndAttachChatEditor();
            injectNewLocalChatButton();
        }, true);
    }

    /**
     * Bọc span pill cho token /cmd và `cmd trong bong bóng lịch sử chat
     */
    function decorateHistoryBubble(markdownEl) {
        if (!markdownEl || typeof document === 'undefined') return;

        // Bỏ qua nếu thuộc response của AI
        if (markdownEl.closest('.interactive-response, .chat-response, .chat-item.response, [class~="response"]')) {
            return;
        }
        // Chỉ xử lý trong bong bóng request của user
        const requestContainer = markdownEl.closest('.interactive-request, .chat-item.request, .monaco-list-row.request, [data-index].request, .chat-row.request, .chat-request, div[class*="request"]');
        if (!requestContainer) {
            return;
        }

        // Bỏ qua nếu đã decorate (tránh forced layout reflow từ textContent)
        if (markdownEl.dataset.jarvisDecorated === 'true') {
            return;
        }
        markdownEl.dataset.jarvisDecorated = 'true';

        const currentText = markdownEl.textContent || '';
        if (!currentText.includes('/') && !currentText.includes('`')) {
            return;
        }

        const activeMacros = getActiveMacros();
        const knownMacroTokens = new Set(activeMacros.map((m) => m.token.toLowerCase()));

        // 1. Kiểm tra các thẻ <code> inline: Chỉ chuyển đổi nếu thực sự là macro hợp lệ
        const codeElements = Array.from(markdownEl.querySelectorAll('code')).filter(
            (codeEl) => !codeEl.closest('pre') && !codeEl.closest('.custom-backtick-pill')
        );
        for (const codeEl of codeElements) {
            const rawContent = (codeEl.textContent || '').trim();
            const token = rawContent.startsWith('`') ? rawContent : '`' + rawContent;
            if (knownMacroTokens.has(token.toLowerCase())) {
                const span = document.createElement('span');
                span.className = 'custom-backtick-pill';
                span.textContent = token;
                if (codeEl.parentNode) {
                    codeEl.parentNode.replaceChild(span, codeEl);
                }
            }
        }

        // 2. Duyệt các text node (không nằm trong code, pre, hoặc pill có sẵn)
        const walker = document.createTreeWalker(
            markdownEl,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    if (!node.nodeValue || (!node.nodeValue.includes('/') && !node.nodeValue.includes('`'))) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    if (parent.closest('.custom-wf-pill, .custom-backtick-pill, .custom-mcp-pill, code, pre')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const nodesToReplace = [];
        let currentNode;
        while ((currentNode = walker.nextNode())) {
            nodesToReplace.push(currentNode);
        }

        const slashRe = /(?:^|[\s>:,;])(\/[\p{L}0-9_.:-]+)/gu;

        for (const textNode of nodesToReplace) {
            const text = textNode.nodeValue;
            const allItems = [];

            // Quét slash commands
            slashRe.lastIndex = 0;
            let sm;
            while ((sm = slashRe.exec(text)) !== null) {
                const rawToken = sm[1];
                const tokenStart = sm.index + sm[0].lastIndexOf(rawToken);
                allItems.push({
                    token: rawToken,
                    start: tokenStart,
                    end: tokenStart + rawToken.length,
                    type: 'slash'
                });
            }

            // Quét backtick macros
            const backtickTokens = findBacktickMacroTokens(text);
            for (const bt of backtickTokens) {
                allItems.push({
                    token: bt.token,
                    start: bt.start,
                    end: bt.end,
                    type: 'backtick'
                });
            }

            if (allItems.length === 0) {
                continue;
            }

            // Sắp xếp theo vị trí xuất hiện
            allItems.sort((a, b) => a.start - b.start);

            const nonOverlapping = [];
            let cursor = 0;
            for (const item of allItems) {
                if (item.start >= cursor) {
                    nonOverlapping.push(item);
                    cursor = item.end;
                }
            }

            if (nonOverlapping.length > 0) {
                const frag = document.createDocumentFragment();
                let lastIndex = 0;
                for (const item of nonOverlapping) {
                    if (item.start > lastIndex) {
                        frag.appendChild(document.createTextNode(text.slice(lastIndex, item.start)));
                    }
                    if (item.type === 'slash') {
                        const span = document.createElement('span');
                        span.className = item.token.startsWith('/mcp:') ? 'custom-mcp-pill' : 'custom-wf-pill';
                        span.textContent = item.token;
                        frag.appendChild(span);
                    } else if (item.type === 'backtick') {
                        const span = document.createElement('span');
                        span.className = 'custom-backtick-pill';
                        span.textContent = item.token;
                        frag.appendChild(span);
                    }
                    lastIndex = item.end;
                }
                if (lastIndex < text.length) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
                }
                if (textNode.parentNode) {
                    textNode.parentNode.replaceChild(frag, textNode);
                }
            }
        }
    }

    let _scanHistoryRaf = null;
    function scheduleScanAndDecorateHistory() {
        if (_scanHistoryRaf || typeof requestAnimationFrame === 'undefined') {
            if (!_scanHistoryRaf) scanAndDecorateHistory();
            return;
        }
        _scanHistoryRaf = requestAnimationFrame(() => {
            _scanHistoryRaf = null;
            scanAndDecorateHistory();
        });
    }

    let _evalCodeBlocksRaf = null;
    function scheduleEvaluateEmptyCodeBlocks() {
        if (_evalCodeBlocksRaf || typeof requestAnimationFrame === 'undefined') {
            if (!_evalCodeBlocksRaf && typeof document !== 'undefined' && document.body) {
                evaluateEmptyCodeBlockElements(document.body);
            }
            return;
        }
        _evalCodeBlocksRaf = requestAnimationFrame(() => {
            _evalCodeBlocksRaf = null;
            if (typeof document !== 'undefined' && document.body) {
                evaluateEmptyCodeBlockElements(document.body);
            }
        });
    }

    /**
     * Quét và áp dụng decorate cho toàn bộ bong bóng chat history
     */
    function scanAndDecorateHistory() {
        if (typeof document === 'undefined') return;
        if (scanAndDecorateHistory._isDecorating) return;
        if (!scanAndDecorateHistory._polling && typeof setInterval !== 'undefined') {
            scanAndDecorateHistory._polling = true;
            setInterval(scheduleScanAndDecorateHistory, 2000);
        }
        try {
            scanAndDecorateHistory._isDecorating = true;
            const targets = document.querySelectorAll(
                '.interactive-request .rendered-markdown, .chat-item.request .rendered-markdown, .monaco-list-row.request .rendered-markdown, [data-index].request .rendered-markdown, .chat-row.request .rendered-markdown, .chat-request .rendered-markdown, div[class*="request"] .rendered-markdown'
            );
            targets.forEach((el) => decorateHistoryBubble(el));
        } catch (err) {
            console.error('[JARVIS] Error scanning history:', err);
        } finally {
            scanAndDecorateHistory._isDecorating = false;
        }
    }

    /**
     * Triệt tiêu Code Block rỗng trong Chat Markdown response
     * Bảo toàn 100% khi Code Block có nội dung code thực tế
     */
    function evaluateEmptyCodeBlockElements(rootNode) {
        if (!rootNode || typeof document === 'undefined') return;

        const selector = '.interactive-result-code-block, div[data-code]';
        const rawTargets = rootNode.querySelectorAll ? Array.from(rootNode.querySelectorAll(selector)) : [];
        if (rootNode.matches && rootNode.matches(selector)) {
            rawTargets.push(rootNode);
        }

        const codeBlocks = new Set();
        for (const el of rawTargets) {
            if (el.classList && el.classList.contains('interactive-result-code-block')) {
                codeBlocks.add(el);
            } else {
                const innerBlock = el.querySelector ? el.querySelector('.interactive-result-code-block') : null;
                if (innerBlock) {
                    codeBlocks.add(innerBlock);
                }
            }
        }

        const clearEmptyFlags = (codeBlockEl, parentWrapper) => {
            if (codeBlockEl && codeBlockEl.classList) {
                codeBlockEl.classList.remove('jarvis-empty-codeblock-hidden');
            }
            if (parentWrapper && parentWrapper.classList) {
                parentWrapper.classList.remove('jarvis-empty-codeblock-hidden');
            }
        };

        for (const block of codeBlocks) {
            const wrapper = block.closest ? block.closest('div[data-code]') : (block.parentElement && block.parentElement.hasAttribute('data-code') ? block.parentElement : null);

            // Lớp 1 (Guard Initializing): Chưa có .monaco-editor -> Bỏ qua, đang khởi tạo
            const monacoEditor = block.querySelector ? block.querySelector('.monaco-editor') : null;
            if (!monacoEditor) {
                clearEmptyFlags(block, wrapper);
                continue;
            }

            // Lớp 2 (Guard Real Data): Đọc text trong .interactive-result-editor .view-lines hoặc .monaco-editor
            const viewLines = monacoEditor.querySelector ? monacoEditor.querySelector('.view-lines') : null;
            const targetTextEl = viewLines || monacoEditor;
            const rawText = targetTextEl ? (targetTextEl.textContent || '') : '';

            // Lọc escape code, zero-width chars, whitespace và \u00a0 (&nbsp;)
            const cleanText = rawText
                .replace(/\u001b(?:\[[0-9;?]*[a-zA-Z]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)?)/g, '')
                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                .replace(/\u00a0/g, ' ')
                .trim();

            if (cleanText.length > 0) {
                // Có code thật -> gỡ sạch cờ rỗng
                clearEmptyFlags(block, wrapper);
                continue;
            }

            // Lớp 3 (Confirmed Empty): Text rỗng hoàn toàn -> gán class ẩn
            block.classList.add('jarvis-empty-codeblock-hidden');
            if (wrapper && wrapper.classList) {
                wrapper.classList.add('jarvis-empty-codeblock-hidden');
            }
        }
    }

    /**
     * Mô phỏng chuỗi sự kiện click chuột đầy đủ
     */
    function triggerFullClick(el) {
        if (!el) return;
        const opts = { bubbles: true, cancelable: true, view: window, buttons: 1, button: 0 };
        try { el.dispatchEvent(new PointerEvent('pointerdown', opts)); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('mousedown', opts)); } catch (_) {}
        try { el.dispatchEvent(new PointerEvent('pointerup', opts)); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('mouseup', opts)); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent('click', opts)); } catch (_) {}
        try { if (typeof el.click === 'function') el.click(); } catch (_) {}
    }

    function selectMenuItemByKeywords(keywords) {
        const shadowRoots = Array.from(document.querySelectorAll('.shadow-root-host')).map(h => h.shadowRoot).filter(Boolean);
        const searchScopes = [document, ...shadowRoots];
        for (const scope of searchScopes) {
            try {
                const items = Array.from(scope.querySelectorAll(
                    '.context-view .monaco-list-row, .context-view [role="menuitem"], .context-view .action-item, [role="menuitem"], .action-menu-item, .monaco-menu-container .action-item'
                ));
                for (const item of items) {
                    const text = (item.textContent || '').trim().toLowerCase();
                    const aria = (item.getAttribute('aria-label') || '').toLowerCase();
                    const title = (item.getAttribute('title') || '').toLowerCase();
                    const matches = keywords.some(k => text.includes(k) || aria.includes(k) || title.includes(k));
                    if (matches) {
                        const clickTarget = item.querySelector('a, button, [role="menuitem"]') || item;
                        triggerFullClick(clickTarget);
                        return true;
                    }
                }
            } catch (_) {}
        }
        return false;
    }

    /**
     * Tự động kiểm tra và chuyển session sang Local và phân quyền Allow All nếu chưa được bật
     */
    function ensureLocalAndAutoApprove() {
        if (typeof document === 'undefined') return;

        const checkAndFix = () => {
            // 1. Kiểm tra session picker chip ở footer
            const sessionChips = Array.from(document.querySelectorAll(
                '.chat-session-target-picker-item a.action-label, .chat-sessionPicker-item, [class*="sessionPicker"] a, .chat-session-picker a'
            ));
            for (const chip of sessionChips) {
                const txt = (chip.textContent || '').trim().toLowerCase();
                const aria = (chip.getAttribute('aria-label') || '').toLowerCase();
                if (txt && !txt.includes('local') && !aria.includes('local')) {
                    triggerFullClick(chip);
                    setTimeout(() => {
                        selectMenuItemByKeywords(['local']);
                    }, 60);
                    break;
                }
            }

            // 2. Kiểm tra permission chip ở footer
            const permissionChips = Array.from(document.querySelectorAll(
                '[aria-label*="Permission picker" i] a, .chat-input-picker-item a.action-label[aria-label*="Permission" i], [class*="permission"] a.action-label'
            ));
            for (const chip of permissionChips) {
                const txt = (chip.textContent || '').trim().toLowerCase();
                const aria = (chip.getAttribute('aria-label') || '').toLowerCase();
                if (!txt.includes('allow all') && !aria.includes('allow all') && !chip.classList.contains('info')) {
                    triggerFullClick(chip);
                    setTimeout(() => {
                        selectMenuItemByKeywords(['allow all', 'autoapprove', 'auto-approve', 'tự động phê duyệt']);
                    }, 60);
                    break;
                }
            }
        };

        [100, 300, 700, 1500].forEach((delay) => {
            setTimeout(checkAndFix, delay);
        });
    }

    function getActiveSessionKey(sessionEl) {
        if (!sessionEl) return 'default';
        const titleEl = document.querySelector('.chat-view-title-container, .pane-header .title, .composite.title');
        const title = (titleEl?.textContent || '').trim().slice(0, 60);

        const firstReq = sessionEl.querySelector('.monaco-list-row.interactive-request, .interactive-request');
        const firstText = (firstReq?.textContent || '').trim().slice(0, 40);

        return `${title}:::${firstText}`;
    }

    function calculateContextWeight(turns) {
        if (turns >= 20) return { label: 'Critical', color: '#f38ba8', dot: '🔴' };
        if (turns >= 15) return { label: 'Medium', color: '#f9e2af', dot: '🟡' };
        return { label: 'Light', color: '#a6e3a1', dot: '🟢' };
    }

    function countSessionTurns(sessionEl) {
        if (!sessionEl || typeof sessionEl.querySelectorAll !== 'function') return 0;

        // 1. Quét các phần tử request của User trong DOM hiện tại (loại bỏ hoàn toàn phản hồi của Agent/Assistant)
        const userItems = Array.from(sessionEl.querySelectorAll(
            '.interactive-item-container.interactive-request, .interactive-request:not(.interactive-response), .chat-item.request'
        )).filter((node) => !node.closest('.interactive-response, .chat-response, .chat-item.response'));

        const topLevelRequests = userItems.filter((node) => !userItems.some((other) => other !== node && other.contains(node)));

        // 2. Kiểm tra số lượng prompt từ Microsoft Native Prompt Timeline (chỉ đếm .prompt-timeline-gutter-row, không đếm ruler-mark để tránh nhân đôi)
        const timelineGutterRows = sessionEl.querySelectorAll('.prompt-timeline-gutter-row');
        const timelineCount = timelineGutterRows.length;

        // 3. Nếu không có bất kỳ request nào trong DOM và timeline = 0 -> Đây là phiên chat mới/trống!
        if (topLevelRequests.length === 0 && timelineCount === 0) {
            return 0;
        }

        // 4. Lấy sessionKey độc lập cho phiên chat hiện tại (chống dính số lượt của phiên chat cũ)
        const sessionKey = getActiveSessionKey(sessionEl);
        if (!window.__jarvisSessionTurnMap || !(window.__jarvisSessionTurnMap instanceof Map)) {
            window.__jarvisSessionTurnMap = new Map();
        }
        let state = window.__jarvisSessionTurnMap.get(sessionKey);
        if (!state) {
            state = { seenIndices: new Set(), maxTurns: 0 };
            window.__jarvisSessionTurnMap.set(sessionKey, state);
        }

        for (const req of topLevelRequests) {
            const dataIndex = req.getAttribute('data-index') || req.closest('.monaco-list-row')?.getAttribute('data-index');
            const key = dataIndex != null ? `idx:${dataIndex}` : `txt:${req.textContent?.slice(0, 40)}`;
            if (key) state.seenIndices.add(key);
        }

        const detectedTurns = Math.max(
            timelineCount,
            state.seenIndices.size,
            topLevelRequests.length
        );

        state.maxTurns = Math.max(state.maxTurns, detectedTurns);
        return state.maxTurns;
    }

    let _isUpdatingHud = false;
    function injectOrUpdateChatHud() {
        if (_isUpdatingHud || typeof document === 'undefined') return;
        _isUpdatingHud = true;
        try {
            const sessions = Array.from(document.querySelectorAll('.interactive-session'));
            const inputParts = Array.from(document.querySelectorAll('.interactive-input-part'));
            if (sessions.length === 0 || inputParts.length === 0) return;

            const inputPart = inputParts.find((part) => part.closest('.interactive-session')) || inputParts[inputParts.length - 1];
            const sessionEl = inputPart.closest('.interactive-session') || sessions[sessions.length - 1];

            // Vị trí y cũ nguyên bản: Bên phải các picker (sau [sliders], trước [mic])
            const footerAnchor = inputPart.querySelector('.chat-input-picker-item, .chat-session-target-picker-item');
            const footer = (footerAnchor && footerAnchor.parentElement) || inputPart.querySelector('.chat-secondary-toolbar') || inputPart;
            if (!footer) return;

            const turns = countSessionTurns(sessionEl);
            const turnsStr = String(turns);
            const weight = calculateContextWeight(turns);

            let badge = document.getElementById('jarvis-chat-hud-badge');
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'jarvis-chat-hud-badge';
                badge.id = 'jarvis-chat-hud-badge';
                badge.title = `Lượt trò chuyện: ${turns}/20 (${weight.label}) - Bấm để mở New Local Chat khi đầy`;
                badge.setAttribute('role', 'button');
                badge.setAttribute('tabindex', '0');
                badge.dataset.turns = turnsStr;
                badge.setAttribute('aria-label', `${turns}/20, ${weight.label}`);

                const dot = document.createElement('span');
                dot.className = 'hud-indicator-dot';
                dot.textContent = weight.dot;
                dot.style.color = weight.color;

                const turnsLabel = document.createElement('span');
                turnsLabel.className = 'hud-turns';
                turnsLabel.textContent = `${turns}/20`;

                const sep = document.createElement('span');
                sep.className = 'hud-separator';
                sep.textContent = '|';

                const localBtn = document.createElement('span');
                localBtn.className = 'hud-local-chat-btn codicon codicon-device-desktop';
                localBtn.title = 'New Local Chat (Allow All) [JARVIS]';

                badge.append(dot, turnsLabel, sep, localBtn);

                badge.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNewLocalChatClick();
                });
            }

            if (badge.parentElement !== footer) {
                footer.appendChild(badge);
            }

            if (badge.dataset.turns === turnsStr && badge.parentElement === footer) return;

            badge.dataset.turns = turnsStr;
            badge.title = `Lượt trò chuyện: ${turns}/20 (${weight.label}) - Bấm để mở New Local Chat khi đầy`;
            badge.setAttribute('aria-label', `${turns}/20, ${weight.label}`);

            const dotEl = badge.querySelector('.hud-indicator-dot');
            if (dotEl && dotEl.textContent !== weight.dot) {
                dotEl.textContent = weight.dot;
                dotEl.style.color = weight.color;
            }
            const turnsEl = badge.querySelector('.hud-turns');
            if (turnsEl && turnsEl.textContent !== `${turns}/20`) {
                turnsEl.textContent = `${turns}/20`;
            }
            const weightEl = badge.querySelector('.hud-weight');
            if (weightEl) {
                weightEl.remove();
            }
        } catch (_) {} finally {
            _isUpdatingHud = false;
        }
    }

    let _hudDebounceTimer = null;
    function scheduleUpdateChatHud() {
        if (_hudDebounceTimer) return;
        _hudDebounceTimer = setTimeout(() => {
            _hudDebounceTimer = null;
            injectOrUpdateChatHud();
        }, 80);
    }

    let _newChatBtnTimer = null;
    function scheduleInjectNewLocalChatButton() {
        if (_newChatBtnTimer) return;
        _newChatBtnTimer = setTimeout(() => {
            _newChatBtnTimer = null;
            injectNewLocalChatButton();
        }, 400);
    }

    /**
     * Xử lý click nút New Local Chat: mở New Chat ngay lập tức và đảm bảo Local + Allow all
     */
    function handleNewLocalChatClick(plusItem) {
        console.log('[JARVIS] New Local Chat button clicked!');
        if (typeof document === 'undefined') return;

        // 1. Focus ô nhập liệu để đưa focus về Chat view
        try {
            if (window.__chatInputEditor && typeof window.__chatInputEditor.focus === 'function') {
                window.__chatInputEditor.focus();
            } else {
                const inputDom = document.querySelector('.interactive-input-editor .monaco-editor, .chat-input-editor .monaco-editor');
                if (inputDom) triggerFullClick(inputDom);
            }
        } catch (_) {}

        // 2. Xác định nút New Chat (+) và kích hoạt trực tiếp
        let plusTarget = null;
        if (plusItem) {
            plusTarget = plusItem.querySelector('.action-container')
                || plusItem.querySelector('a.codicon-plus')
                || plusItem.querySelector('[aria-label*="New Chat"]')
                || plusItem;
        } else {
            plusTarget = document.querySelector('.monaco-toolbar .action-item:has(.codicon-plus) .action-container')
                || document.querySelector('.monaco-toolbar .codicon-plus')?.closest('.action-item')
                || document.querySelector('.monaco-toolbar .codicon-plus');
        }

        if (plusTarget) {
            console.log('[JARVIS] Triggering click on New Chat action:', plusTarget);
            triggerFullClick(plusTarget);
            const innerAnchor = plusTarget.querySelector('a.codicon-plus') || (plusTarget.matches('a') ? plusTarget : null);
            if (innerAnchor && innerAnchor !== plusTarget) {
                triggerFullClick(innerAnchor);
            }
        }

        // 3. Fallback qua CommandService nếu có
        if (window.__commandService && typeof window.__commandService.executeCommand === 'function') {
            try {
                window.__commandService.executeCommand('workbench.action.chat.newChat').catch(() => {});
            } catch (_) {}
        }

        // 4. Đảm bảo session chuyển sang Local và Allow All
        ensureLocalAndAutoApprove();
    }

    /**
     * Tự động tiêm nút New Local Chat (Allow All) vào thanh công cụ Chat Header
     */
    function injectNewLocalChatButton() {
        if (typeof document === 'undefined') return;

        // Dọn sạch bất kỳ nút computer nào từng bị tiêm nhầm vào bên trong executeToolbar gây giật
        const rogueActions = document.querySelectorAll(
            '.interactive-input-part .jarvis-new-local-chat-action, .chat-input-toolbars .jarvis-new-local-chat-action, .chat-input-container .jarvis-new-local-chat-action'
        );
        rogueActions.forEach((el) => el.remove());

        const plusIcons = Array.from(document.querySelectorAll(
            '.monaco-toolbar .codicon-plus, .monaco-toolbar [aria-label*="New Chat"], .monaco-toolbar [title*="New Chat"]'
        ));

        plusIcons.forEach((plusEl) => {
            // TUYỆT ĐỐI BỎ QUA các toolbar bên trong khu vực soạn thảo Chat Input (tránh bị ActionBar re-render xoá mất gây giật)
            if (plusEl.closest('.interactive-input-part, .chat-input-container, .chat-input-toolbars, .chat-editor-container')) {
                return;
            }

            if (plusEl.closest('.hidden, [style*="display: none"], [style*="visibility: hidden"], .pane-header.hidden')) {
                return;
            }

            let chatScope = null;
            try {
                chatScope = plusEl.closest(
                    '#workbench\\.parts\\.auxiliarybar, #workbench\\.parts\\.sidebar, .chat-viewpane-container, .interactive-session, .chat-editor, [data-active-composite*="chat"], .composite.title:has([aria-label*="Chat"]), .pane-composite-part:has([data-active-composite*="chat"])'
                );
            } catch (_) {
                chatScope = plusEl.closest(
                    '#workbench\\.parts\\.auxiliarybar, #workbench\\.parts\\.sidebar, .chat-viewpane-container, .interactive-session, .chat-editor, [data-active-composite*="chat"]'
                );
            }
            if (!chatScope) return;

            const plusItem = plusEl.closest('.action-item');
            if (!plusItem || !plusItem.parentNode) return;

            if (plusItem.parentNode.querySelector('.jarvis-new-local-chat-action, #jarvis-new-local-chat-action')) return;

            const li = document.createElement('li');
            li.className = 'action-item jarvis-new-local-chat-item jarvis-new-local-chat-action';
            li.id = 'jarvis-new-local-chat-action';
            li.setAttribute('role', 'presentation');

            const a = document.createElement('a');
            a.className = 'action-label codicon codicon-device-desktop';
            a.setAttribute('role', 'button');
            a.setAttribute('tabindex', '0');
            a.setAttribute('title', 'New Local Chat (Allow All) [JARVIS]');
            a.setAttribute('aria-label', 'New Local Chat (Allow All) [JARVIS]');

            a.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNewLocalChatClick(plusItem);
            });

            li.appendChild(a);
            plusItem.parentNode.insertBefore(li, plusItem);
        });
    }

    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
        const historyObserver = new MutationObserver((mutations) => {
            if (scanAndDecorateHistory._isDecorating) return;
            let shouldScan = false;
            for (let i = 0; i < mutations.length; i++) {
                const added = mutations[i].addedNodes;
                if (!added || added.length === 0) continue;
                for (let j = 0; j < added.length; j++) {
                    const node = added[j];
                    // Bỏ qua các mutation phát sinh từ chính các element của JARVIS để tránh vòng lặp vô tận
                    if (node.nodeType === 1 && node.closest && node.closest(
                        '.jarvis-chat-hud-badge, .jarvis-quick-chips-bar, .jarvis-new-local-chat-action, .custom-wf-pill, .custom-mcp-pill, .custom-backtick-pill, .jarvis-macro-popup'
                    )) {
                        continue;
                    }
                    if (node.parentElement && node.parentElement.closest && node.parentElement.closest(
                        '.jarvis-chat-hud-badge, .jarvis-quick-chips-bar, .jarvis-new-local-chat-action, .custom-wf-pill, .custom-mcp-pill, .custom-backtick-pill, .jarvis-macro-popup'
                    )) {
                        continue;
                    }
                    shouldScan = true;
                    break;
                }
                if (shouldScan) break;
            }
            if (shouldScan) {
                scheduleScanAndDecorateHistory();
                scheduleEvaluateEmptyCodeBlocks();
                scheduleInjectNewLocalChatButton();
                scheduleUpdateChatHud();
                scheduleInjectQuickActionChips();
            }
        });

        const startObserver = () => {
            const target = document.body || document.documentElement;
            if (target) {
                historyObserver.observe(target, { childList: true, subtree: true });
                scheduleScanAndDecorateHistory();
                scheduleEvaluateEmptyCodeBlocks();
                findAndAttachChatEditor();
                scheduleInjectQuickActionChips();
                scheduleInjectNewLocalChatButton();
                scheduleUpdateChatHud();
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                startObserver();
                findAndAttachChatEditor();
                scheduleInjectQuickActionChips();
                scheduleInjectNewLocalChatButton();
                scheduleUpdateChatHud();
            });
        } else {
            startObserver();
            findAndAttachChatEditor();
            scheduleInjectQuickActionChips();
            scheduleInjectNewLocalChatButton();
            scheduleUpdateChatHud();
        }
    }

    if (typeof setInterval !== 'undefined') {
        setInterval(() => {
            scheduleEvaluateEmptyCodeBlocks();
        }, 2000);
        setInterval(() => {
            scheduleInjectNewLocalChatButton();
            scheduleUpdateChatHud();
            scheduleInjectQuickActionChips();
        }, 2500);
    }

    /**
     * Theo dõi window.__codeEditorService để tự động gắn decorations cho Chat Input
     */
    function watchAllEditors() {
        function isChatEditor(ed) {
            if (!ed) return false;
            const dom = (ed.getDomNode && ed.getDomNode()) || (ed.getContainerDomNode && ed.getContainerDomNode());
            const uri = ed.getModel && ed.getModel() && ed.getModel().uri && ed.getModel().uri.toString();
            return !!((uri && (uri.includes('chat') || uri.includes('interactive') || uri.includes('session'))) ||
                      (dom && dom.closest && dom.closest('.interactive-input-part, .chat-input-editor, .interactive-input-editor, .chat-input-widget, .chat-input-container, [class*="interactive-input"], [class*="chat-input"]')));
        }

        function hookService(svc) {
            if (!svc || svc.__watched) return;
            svc.__watched = true;

            if (typeof svc.listCodeEditors === 'function') {
                try {
                    const editors = svc.listCodeEditors();
                    if (editors && typeof editors[Symbol.iterator] === 'function') {
                        for (const ed of editors) {
                            if (isChatEditor(ed)) {
                                attachChatPillDecorations(ed);
                            }
                        }
                    }
                } catch (e) {
                    console.error('[JARVIS] Error listing code editors:', e);
                }
            }

            if (typeof svc.onCodeEditorAdd === 'function') {
                try {
                    svc.onCodeEditorAdd((editor) => {
                        if (isChatEditor(editor)) {
                            attachChatPillDecorations(editor);
                        }
                    });
                } catch (e) {
                    console.error('[JARVIS] Error hooking onCodeEditorAdd:', e);
                }
            }

            setInterval(() => {
                try {
                    if (typeof svc.listCodeEditors === 'function') {
                        const editors = svc.listCodeEditors();
                        if (editors && typeof editors[Symbol.iterator] === 'function') {
                            for (const ed of editors) {
                                if (isChatEditor(ed)) {
                                    attachChatPillDecorations(ed);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('[JARVIS] Error polling code editors:', e);
                }
            }, 2000);
        }

        let _svc = window.__codeEditorService;
        if (_svc) hookService(_svc);

        try {
            Object.defineProperty(window, '__codeEditorService', {
                configurable: true,
                enumerable: true,
                get() { return _svc; },
                set(v) {
                    _svc = v;
                    if (v) hookService(v);
                }
            });
        } catch (e) {}

        const timer = setInterval(() => {
            if (window.__codeEditorService) {
                hookService(window.__codeEditorService);
                if (window.__codeEditorService.__watched) {
                    clearInterval(timer);
                }
            }
        }, 300);
    }

    watchAllEditors();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            calculateTabJumpTarget,
            resolveChipParam
        };
    }
})();
