/**
 * Custom JS Loader - Chat Slash Command Decoration Bridge
 * Tự động bôi xanh pill cho mọi slash command trong Chat Input (sau space, >, hoặc đầu câu)
 */
(function () {
    'use strict';

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
        { token: '`wtn', desc: 'Tạo worktree mới độc lập từ develop/main' },
        { token: '`wtm', desc: 'Merge worktree vào develop/main & sync DB' },
        { token: '`ver', desc: 'Cập nhật new version cho hệ thống/tài liệu' },
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
            const insertText = macro.token + ' ';
            targetEditor.executeEdits('jarvis-macro', [{
                range: range,
                text: insertText
            }]);
            const nextCol = range.startColumn + insertText.length;
            if (typeof targetEditor.setPosition === 'function') {
                targetEditor.setPosition({
                    lineNumber: range.startLineNumber,
                    column: nextCol
                });
            }
            if (typeof targetEditor.focus === 'function') {
                targetEditor.focus();
            }
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
            tokenSpan.className = m.token.startsWith('/') ? 'jarvis-slash-token' : 'jarvis-macro-token';
            tokenSpan.textContent = m.token;

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
                    matched = getActiveSlashCommands().filter((m) => m.token.toLowerCase().startsWith(prefix));
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
            if (!isMacroPopupActive() || _activeEditorForMacro !== editor) return;

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
                    newDecos.push({
                        range: {
                            startLineNumber: p1.lineNumber,
                            startColumn: p1.column,
                            endLineNumber: p2.lineNumber,
                            endColumn: p2.column
                        },
                        options: {
                            description: 'custom-slash-command-pill',
                            inlineClassName: 'custom-wf-pill'
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
            return;
        }

        // Kênh 2: window.__allCodeEditors
        if (window.__allCodeEditors && Array.isArray(window.__allCodeEditors)) {
            for (const ed of window.__allCodeEditors) {
                if (ed && !ed.__slashPillAttached) {
                    const dom = ed.getContainerDomNode && ed.getContainerDomNode();
                    if (dom && dom.closest && dom.closest('.interactive-input-part, .chat-input-editor, .interactive-input-editor, .chat-input-widget, .chat-input-container, [class*="interactive-input"], [class*="chat-input"]')) {
                        window.__chatInputEditor = ed;
                        attachChatPillDecorations(ed);
                        return;
                    }
                }
            }
        }

        // Kênh 3: Query trực tiếp DOM
        const domEls = document.querySelectorAll('.interactive-input-editor .monaco-editor, .chat-input-editor .monaco-editor, .interactive-input-part .monaco-editor, .chat-input-widget .monaco-editor, .chat-input-container .monaco-editor, [class*="interactive-input"] .monaco-editor, [class*="chat-input"] .monaco-editor');
        for (const el of domEls) {
            if (el.__monacoEditor && !el.__monacoEditor.__slashPillAttached) {
                window.__chatInputEditor = el.__monacoEditor;
                attachChatPillDecorations(el.__monacoEditor);
                return;
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

        const currentText = markdownEl.textContent || '';
        // Tránh chạy lặp nếu text không đổi và đã có pill
        if (markdownEl.__jarvisProcessedText === currentText && markdownEl.querySelector('.custom-wf-pill, .custom-backtick-pill')) {
            return;
        }

        // 1. Unwrap các thẻ <code> inline (không thuộc <pre>) thành text node có backtick
        const codeElements = Array.from(markdownEl.querySelectorAll('code')).filter(
            (codeEl) => !codeEl.closest('pre')
        );
        for (const codeEl of codeElements) {
            const rawContent = codeEl.textContent || '';
            const textNode = document.createTextNode('`' + rawContent + '`');
            if (codeEl.parentNode) {
                codeEl.parentNode.replaceChild(textNode, codeEl);
            }
        }
        if (typeof markdownEl.normalize === 'function') {
            markdownEl.normalize();
        }

        markdownEl.__jarvisProcessedText = markdownEl.textContent || '';

        // 2. Duyệt các text node và thay thế các tokens
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
                    if (parent.closest('.custom-wf-pill, .custom-backtick-pill, pre')) {
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
        const inlineCodeRe = /(?:^|[^\\])`([^`\r\n]+)`(?=[\s.,;:!?)\]\r\n]|$)/gu;

        for (const textNode of nodesToReplace) {
            const text = textNode.nodeValue;
            const allItems = [];

            // Quét các inline code thật sự để phục hồi lại thẻ <code>
            inlineCodeRe.lastIndex = 0;
            let icm;
            while ((icm = inlineCodeRe.exec(text)) !== null) {
                const full = icm[0];
                const codeContent = icm[1];
                const startIdx = icm.index + full.indexOf('`');
                const endIdx = startIdx + codeContent.length + 2;
                allItems.push({
                    start: startIdx,
                    end: endIdx,
                    type: 'inline-code',
                    content: codeContent
                });
            }

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
                        span.className = 'custom-wf-pill';
                        span.textContent = item.token;
                        frag.appendChild(span);
                    } else if (item.type === 'backtick') {
                        const span = document.createElement('span');
                        span.className = 'custom-backtick-pill';
                        span.textContent = item.token;
                        frag.appendChild(span);
                    } else if (item.type === 'inline-code') {
                        const code = document.createElement('code');
                        code.textContent = item.content;
                        frag.appendChild(code);
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

    /**
     * Quét và áp dụng decorate cho toàn bộ bong bóng chat history
     */
    function scanAndDecorateHistory() {
        if (typeof document === 'undefined') return;
        if (!scanAndDecorateHistory._polling && typeof setInterval !== 'undefined') {
            scanAndDecorateHistory._polling = true;
            setInterval(scanAndDecorateHistory, 600);
        }
        try {
            const targets = document.querySelectorAll(
                '.interactive-request .rendered-markdown, .chat-item.request .rendered-markdown, .monaco-list-row.request .rendered-markdown, [data-index].request .rendered-markdown, .chat-row.request .rendered-markdown, .chat-request .rendered-markdown, div[class*="request"] .rendered-markdown'
            );
            targets.forEach((el) => decorateHistoryBubble(el));
        } catch (err) {
            console.error('[JARVIS] Error scanning history:', err);
        }
    }

    /**
     * Triệt tiêu viền khung output khi terminal không có stdout
     * Tuyệt đối bảo toàn hiển thị khi terminal có output thực tế
     */
    function evaluateEmptyToolElements(rootNode) {
        if (!rootNode || typeof document === 'undefined') return;

        const selector = '.chat-terminal-output-container';
        const targets = rootNode.querySelectorAll ? Array.from(rootNode.querySelectorAll(selector)) : [];
        if (rootNode.matches && rootNode.matches(selector)) {
            targets.push(rootNode);
        }

        for (const el of targets) {
            // 1. Nếu terminal đang chạy hoặc có loading indicator -> giữ nguyên
            if (el.querySelector && el.querySelector('.codicon-loading, [class*="progress"], .chat-terminal-running-spinner')) {
                el.classList.remove('chat-terminal-output-container-no-output');
                continue;
            }

            // 2. Kiểm tra xem có output thực tế không:
            // Xterm.js render lên canvas; hoặc có xterm-rows, pre, code, command-output
            const hasCanvasOrRows = el.querySelector && el.querySelector(
                '.xterm canvas, .xterm-screen canvas, .xterm-rows span, pre code, .chat-terminal-command-output'
            );
            if (hasCanvasOrRows) {
                el.classList.remove('chat-terminal-output-container-no-output');
                continue;
            }

            // 3. Kiểm tra xem có text thực tế trong terminal buffer không
            const outputEl = el.querySelector ? el.querySelector(
                '.chat-terminal-output-terminal, .chat-terminal-output-content, pre'
            ) : null;
            if (outputEl) {
                const text = (outputEl.textContent || '')
                    .replace(/\u001b(?:\[[0-9;?]*[a-zA-Z]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)?)/g, '')
                    .replace(/[\u200B-\u200D\uFEFF]/g, '')
                    .trim();
                if (text !== '' && text !== 'No output was produced by the command.') {
                    el.classList.remove('chat-terminal-output-container-no-output');
                    continue;
                }
            }

            // 4. Chỉ khi VS Code core xác nhận no-output HOẶC thông báo empty có nội dung rõ ràng
            const emptyEl = el.querySelector ? el.querySelector('.chat-terminal-output-empty') : null;
            const emptyText = emptyEl ? (emptyEl.textContent || '').trim() : '';
            const isCoreNoOutput = el.querySelector && el.querySelector('.chat-terminal-output-terminal-no-output');

            if (emptyText === 'No output was produced by the command.' || (isCoreNoOutput && !hasCanvasOrRows)) {
                el.classList.add('chat-terminal-output-container-no-output');
            } else {
                el.classList.remove('chat-terminal-output-container-no-output');
            }
        }
    }

    /**
     * ==========================================================================
     * JARVIS Chat Timeline Minimap & Hover Preview Card
     * Zero-Core Patch: 100% Client-side Minimap cho Copilot Chat
     * ==========================================================================
     */

    if (typeof window !== 'undefined') {
        window.__jarvisSessionCache = window.__jarvisSessionCache || new Map();
    }

    function revealTurn(turn, chatContainer) {
        if (!turn || !chatContainer) return;
        const scrollable = chatContainer.querySelector('.monaco-scrollable-element');
        if (!scrollable) return;

        const triggerUpdate = () => {
            if (typeof chatContainer.__jarvisUpdateTimeline === 'function') {
                chatContainer.__jarvisUpdateTimeline();
            }
        };

        // 1. Kiểm tra nếu phần tử đã có sẵn trong DOM và không phải placeholder
        let targetRow = null;
        if (!turn.isPlaceholder) {
            if (turn.dataIndex !== null && turn.dataIndex !== undefined) {
                targetRow = chatContainer.querySelector(`[data-index="${turn.dataIndex}"]`);
            }
            if (!targetRow && turn.text) {
                const rows = chatContainer.querySelectorAll(
                    '.interactive-request, .monaco-list-row.request, [data-index].request, .chat-row.request, .chat-request, div[class*="request"]'
                );
                for (const r of rows) {
                    if ((r.textContent || '').trim().startsWith(turn.text.substring(0, 30))) {
                        targetRow = r.closest('.monaco-list-row') || r;
                        break;
                    }
                }
            }
        }

        if (targetRow && typeof targetRow.scrollIntoView === 'function') {
            targetRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(triggerUpdate, 150);
            setTimeout(triggerUpdate, 300);
            return;
        }

        // 2. Nếu turn.isPlaceholder hoặc phần tử chưa có trong DOM: cuộn theo tỷ lệ trên .monaco-scrollable-element
        const ratio = typeof turn.estimatedOffsetRatio === 'number'
            ? turn.estimatedOffsetRatio
            : (typeof turn.lastKnownTop === 'number' && scrollable.scrollHeight > 0
                ? turn.lastKnownTop / Math.max(scrollable.scrollHeight - scrollable.clientHeight, 1)
                : 0);

        const targetTop = Math.round(ratio * (scrollable.scrollHeight - scrollable.clientHeight));

        if (typeof scrollable.scrollTo === 'function') {
            scrollable.scrollTo({ top: targetTop, behavior: 'smooth' });
        } else {
            scrollable.scrollTop = targetTop;
        }

        // Sau 150ms và 300ms, tự động kích hoạt updateTimeline() để bắt các row vừa mount
        setTimeout(triggerUpdate, 150);
        setTimeout(triggerUpdate, 300);

        // 3. Snap chính xác khi row mount lại vào DOM
        let attempts = 0;
        const snapInterval = setInterval(() => {
            attempts++;
            let mountedRow = null;
            if (turn.dataIndex !== null && turn.dataIndex !== undefined) {
                mountedRow = chatContainer.querySelector(`[data-index="${turn.dataIndex}"]`);
            }
            if (!mountedRow && turn.text) {
                const rows = chatContainer.querySelectorAll(
                    '.interactive-request, .monaco-list-row.request, [data-index].request, .chat-row.request, .chat-request, div[class*="request"]'
                );
                for (const r of rows) {
                    if ((r.textContent || '').trim().startsWith(turn.text.substring(0, 30))) {
                        mountedRow = r.closest('.monaco-list-row') || r;
                        break;
                    }
                }
            }
            if (mountedRow && typeof mountedRow.scrollIntoView === 'function') {
                clearInterval(snapInterval);
                mountedRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
                triggerUpdate();
            } else if (attempts >= 10) {
                clearInterval(snapInterval);
            }
        }, 50);
    }

    /**
     * Tìm phần tử response AI liền kề của một request row
     */
    function findAiResponseElement(rowEl, dataIndex, chatContainer) {
        if (!rowEl) return null;

        // 1. Kiểm tra response lồng bên trong rowEl (nếu cấu trúc container gộp)
        const innerResp = rowEl.querySelector('.interactive-response, .chat-response, .chat-item.response, [class~="response"]');
        if (innerResp && !innerResp.matches('.request, [class*="request"]')) return innerResp;

        // 2. Tìm trong các phần tử kế tiếp cùng cấp (nextElementSibling)
        let sib = rowEl.nextElementSibling;
        while (sib) {
            if (sib.matches && (sib.matches('.interactive-request, .chat-item.request, [class*="request"]') || sib.classList.contains('request'))) {
                break; // Đã chạm request tiếp theo
            }
            if ((sib.matches && (sib.matches('.interactive-response, .chat-response, [class*="response"]') || sib.classList.contains('response'))) ||
                sib.querySelector('.interactive-response, .chat-response, .chat-item.response, .rendered-markdown')) {
                return sib;
            }
            sib = sib.nextElementSibling;
        }

        // 3. Tra cứu qua data-index liền kề (dataIndex + 1)
        if (dataIndex !== null && dataIndex !== undefined && chatContainer) {
            const nextRow = chatContainer.querySelector(`[data-index="${dataIndex + 1}"]`);
            if (nextRow && !nextRow.matches('.request, [class*="request"]') && !nextRow.querySelector('.interactive-request-content')) {
                return nextRow;
            }
        }
        return null;
    }

    /**
     * Trích xuất thông minh 1-2 dòng đầu câu trả lời của AI hoặc bullet points
     */
    function extractAiResponseSnippet(respEl) {
        if (!respEl) return '';
        const mdEl = respEl.querySelector('.rendered-markdown') ||
                     respEl.querySelector('.chat-response-content') ||
                     respEl.querySelector('.interactive-response-content') ||
                     respEl;

        let clone;
        try {
            clone = mdEl.cloneNode(true);
        } catch (e) {
            return '';
        }

        const unwanted = clone.querySelectorAll('pre, code, .chat-terminal-output-container, .codicon-loading, [class*="progress"], [class*="toolbar"], [class*="actions"], table');
        unwanted.forEach((el) => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });

        const text = (clone.textContent || '').trim();
        if (!text) return '';

        const lines = text.split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && !l.startsWith('```') && !l.startsWith('|'));

        if (lines.length === 0) return '';

        const snippetLines = lines.slice(0, 2);
        let snippet = snippetLines.join(' ');
        if (snippet.length > 140) {
            snippet = snippet.substring(0, 137) + '...';
        }
        return snippet;
    }

    function updateViewportAndActiveTick(chatContainer, railEl, viewportIndicator) {
        const scrollable = chatContainer.querySelector('.monaco-scrollable-element');
        if (!scrollable || !railEl || !viewportIndicator) return;

        const railHeight = railEl.clientHeight;
        if (railHeight <= 0) return;

        const scrollHeight = scrollable.scrollHeight || 1;
        const clientHeight = scrollable.clientHeight || 1;
        const scrollTop = scrollable.scrollTop || 0;

        const maxScroll = Math.max(scrollHeight - clientHeight, 1);
        const scrollRatio = Math.min(Math.max(scrollTop / maxScroll, 0), 1);

        const trackEl = railEl.querySelector('.jarvis-timeline-track');
        let trackTop = 10;
        let trackHeight = Math.max(railHeight - 20, 0);
        if (trackEl && trackEl.style.display !== 'none') {
            trackTop = parseFloat(trackEl.style.top) || 10;
            trackHeight = parseFloat(trackEl.style.height) || trackHeight;
        }

        const indicatorTop = Math.round(trackTop + scrollRatio * trackHeight);
        viewportIndicator.style.top = `${indicatorTop}px`;
        viewportIndicator.style.height = '2px';

        // Cập nhật tick active
        const ticks = railEl.querySelectorAll('.jarvis-timeline-tick');
        if (ticks.length === 0) return;

        const vpStart = scrollTop;
        const vpEnd = scrollTop + clientHeight;

        let activeTick = null;
        let minDistance = Infinity;

        ticks.forEach((tick) => {
            const turn = tick.__jarvisTurn;
            if (!turn) return;
            const turnPos = typeof turn.lastKnownTop === 'number'
                ? turn.lastKnownTop
                : (turn.estimatedOffsetRatio || 0) * scrollHeight;

            if (turnPos >= vpStart - 40 && turnPos <= vpEnd) {
                const dist = Math.abs(turnPos - vpStart);
                if (dist < minDistance) {
                    minDistance = dist;
                    activeTick = tick;
                }
            }
        });

        if (!activeTick && ticks.length > 0) {
            ticks.forEach((tick) => {
                const turn = tick.__jarvisTurn;
                if (!turn) return;
                const turnPos = typeof turn.lastKnownTop === 'number'
                    ? turn.lastKnownTop
                    : (turn.estimatedOffsetRatio || 0) * scrollHeight;
                const dist = Math.abs(turnPos - vpStart);
                if (dist < minDistance) {
                    minDistance = dist;
                    activeTick = tick;
                }
            });
        }

        ticks.forEach((t) => {
            if (t === activeTick) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
    }

    function showHoverCard(cardEl, railEl, tickEl, turn) {
        if (!cardEl || !railEl || !tickEl || !turn) return;

        const title = cardEl.querySelector('.jarvis-timeline-card-title');
        const badge = cardEl.querySelector('.jarvis-timeline-card-badge');
        const time = cardEl.querySelector('.jarvis-timeline-card-time');
        const snippet = cardEl.querySelector('.jarvis-timeline-card-snippet');

        if (title) title.textContent = turn.title || 'User Prompt';
        if (badge) badge.textContent = `Turn #${turn.number || 1}`;
        if (time) time.textContent = turn.timestamp || '';

        // Hiển thị tóm tắt câu trả lời của AI hoặc nội dung prompt
        const displaySnippet = turn.responseSnippet ? turn.responseSnippet : (turn.snippet || '');
        if (snippet) snippet.textContent = displaySnippet;

        const railHeight = railEl.clientHeight;
        const cardHeight = cardEl.offsetHeight || 90;
        const tickTop = tickEl.offsetTop;

        let cardTop = tickTop - Math.round(cardHeight / 2) + 2;
        cardTop = Math.max(0, Math.min(cardTop, Math.max(railHeight - cardHeight, 0)));

        cardEl.style.top = `${cardTop}px`;
        cardEl.classList.add('visible');
    }

    function hideHoverCard(cardEl) {
        if (cardEl) {
            cardEl.classList.remove('visible');
        }
    }

    function renderTimelineTicks(railEl, cardEl, turns, chatContainer, viewportIndicator) {
        const railHeight = railEl.clientHeight || (chatContainer.clientHeight - 125);
        if (railHeight <= 0) return;

        const trackEl = railEl.querySelector('.jarvis-timeline-track');
        const existingTicks = Array.from(railEl.querySelectorAll('.jarvis-timeline-tick'));

        while (existingTicks.length < turns.length) {
            const tick = document.createElement('div');
            tick.className = 'jarvis-timeline-tick';
            railEl.appendChild(tick);
            existingTicks.push(tick);
        }
        while (existingTicks.length > turns.length) {
            const tick = existingTicks.pop();
            if (tick.parentNode) tick.parentNode.removeChild(tick);
        }

        const total = turns.length;
        if (total === 0) return;

        const tickPositions = [];

        if (total <= 15) {
            // Khi số turns <= 15: Phân bố khoảng cách đều thanh lịch từ 18px đến 30px mỗi tick (bắt đầu từ top 10px)
            let step = 24;
            if (total > 1) {
                const maxStepForRail = Math.floor((railHeight - 20) / (total - 1));
                step = Math.min(30, Math.max(18, maxStepForRail));
                if (step * (total - 1) > railHeight - 20) {
                    step = Math.max(6, maxStepForRail);
                }
            }

            for (let i = 0; i < total; i++) {
                const topPx = 10 + i * step;
                tickPositions.push(topPx);
            }
        } else {
            // Khi số turns > 15: Phân bố tỷ lệ theo chiều cao rail, đảm bảo khoảng cách tối thiểu giữa các tick >= 6px
            const startTop = 10;
            const availHeight = Math.max(railHeight - 20, 1);
            let prevTop = startTop - 6;

            for (let i = 0; i < total; i++) {
                const turn = turns[i];
                const ratio = typeof turn.estimatedOffsetRatio === 'number'
                    ? turn.estimatedOffsetRatio
                    : (i / Math.max(total - 1, 1));

                let topPx = startTop + Math.round(ratio * availHeight);
                if (topPx <= prevTop + 5) {
                    topPx = prevTop + 6;
                }
                topPx = Math.min(Math.max(topPx, startTop), railHeight - 6);
                prevTop = topPx;
                tickPositions.push(topPx);
            }
        }

        // Cập nhật đường track nối các tick
        if (trackEl) {
            const firstTop = tickPositions[0] !== undefined ? tickPositions[0] : 10;
            const lastTop = tickPositions[total - 1] !== undefined ? tickPositions[total - 1] : firstTop;
            const trackHeight = Math.max(lastTop - firstTop, 0);

            trackEl.style.top = `${firstTop}px`;
            trackEl.style.height = `${trackHeight}px`;
            trackEl.style.display = total > 1 ? 'block' : 'none';
        }

        // Cập nhật vị trí và gắn listener cho từng tick
        turns.forEach((turn, idx) => {
            const tickEl = existingTicks[idx];
            tickEl.__jarvisTurn = turn;
            const topPx = tickPositions[idx];
            tickEl.style.top = `${topPx}px`;

            if (!tickEl.__jarvisEventsAttached) {
                tickEl.__jarvisEventsAttached = true;

                tickEl.addEventListener('mouseenter', () => {
                    showHoverCard(cardEl, railEl, tickEl, tickEl.__jarvisTurn);
                });

                tickEl.addEventListener('mouseleave', (e) => {
                    const related = e.relatedTarget;
                    if (!cardEl.contains(related)) {
                        hideHoverCard(cardEl);
                    }
                });

                tickEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    revealTurn(tickEl.__jarvisTurn, chatContainer);
                });
            }
        });

        updateViewportAndActiveTick(chatContainer, railEl, viewportIndicator);
    }

    function setupChatTimelineMinimap(chatContainer) {
        if (!chatContainer || chatContainer.__jarvisTimelineAttached) return;
        chatContainer.__jarvisTimelineAttached = true;
        chatContainer.__jarvisTurns = new Map();

        const compStyle = window.getComputedStyle ? window.getComputedStyle(chatContainer) : null;
        if (compStyle && compStyle.position === 'static') {
            chatContainer.style.position = 'relative';
        }

        const railEl = document.createElement('div');
        railEl.className = 'jarvis-chat-timeline-rail';

        const trackEl = document.createElement('div');
        trackEl.className = 'jarvis-timeline-track';
        railEl.appendChild(trackEl);

        const viewportIndicator = document.createElement('div');
        viewportIndicator.className = 'jarvis-timeline-viewport-indicator';
        railEl.appendChild(viewportIndicator);

        const cardEl = document.createElement('div');
        cardEl.className = 'jarvis-timeline-card';
        cardEl.innerHTML = `
            <div class="jarvis-timeline-card-header">
                <div class="jarvis-timeline-card-title"></div>
                <div class="jarvis-timeline-card-bookmark">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
            </div>
            <div class="jarvis-timeline-card-meta">
                <span class="jarvis-timeline-card-badge">Turn #1</span>
                <span class="jarvis-timeline-card-time"></span>
            </div>
            <div class="jarvis-timeline-card-snippet"></div>
        `;
        railEl.appendChild(cardEl);

        railEl.addEventListener('mouseleave', () => {
            hideHoverCard(cardEl);
        });

        chatContainer.appendChild(railEl);

        let scrollAttached = false;
        let scrollRafId = null;

        function attachScrollListener() {
            if (scrollAttached) return;
            const scrollable = chatContainer.querySelector('.monaco-scrollable-element');
            if (scrollable) {
                scrollAttached = true;
                scrollable.addEventListener('scroll', () => {
                    if (scrollRafId) cancelAnimationFrame(scrollRafId);
                    scrollRafId = requestAnimationFrame(() => {
                        updateViewportAndActiveTick(chatContainer, railEl, viewportIndicator);
                    });
                }, { passive: true });
            }
        }

        attachScrollListener();

        function updateTimeline() {
            if (chatContainer.clientWidth < 180) {
                railEl.style.display = 'none';
                return;
            }

            attachScrollListener();

            // 1. Nhận diện session hiện tại (qua tiêu đề session trong DOM hoặc qua text của turn 0)
            const sessionTitleEl = chatContainer.querySelector('.chat-title, .interactive-session-title, .title-label, .pane-header .title, .title') ||
                                   (typeof document !== 'undefined' ? document.querySelector('.chat-editor-title, .interactive-title') : null);
            const currentSessionTitle = sessionTitleEl ? (sessionTitleEl.textContent || '').trim() : '';

            const row0 = chatContainer.querySelector('[data-index="0"]');
            let turn0TextSnippet = '';
            if (row0) {
                const md0 = row0.querySelector('.rendered-markdown') || row0.querySelector('.interactive-request-content') || row0;
                turn0TextSnippet = (md0.textContent || '').trim().substring(0, 40);
            }

            const currentSessionKey = currentSessionTitle ? `${currentSessionTitle}|${turn0TextSnippet}` : turn0TextSnippet;
            if (currentSessionKey) {
                if (chatContainer.__jarvisCurrentSession && chatContainer.__jarvisCurrentSession !== currentSessionKey) {
                    chatContainer.__jarvisTurns.clear();
                }
                chatContainer.__jarvisCurrentSession = currentSessionKey;
            }

            // 2. Quét tất cả các .monaco-list-row trong chatContainer để lấy aria-setsize và maxIndexFound
            const allListRows = chatContainer.querySelectorAll('.monaco-list-row');
            let ariaSetSize = 0;
            let maxIndexFound = -1;

            allListRows.forEach((row) => {
                const setSizeAttr = row.getAttribute('aria-setsize');
                if (setSizeAttr) {
                    const parsed = parseInt(setSizeAttr, 10);
                    if (!isNaN(parsed) && parsed > ariaSetSize) {
                        ariaSetSize = parsed;
                    }
                }
                const idxAttr = row.getAttribute('data-index');
                if (idxAttr !== null) {
                    const parsed = parseInt(idxAttr, 10);
                    if (!isNaN(parsed) && parsed > maxIndexFound) {
                        maxIndexFound = parsed;
                    }
                }
            });

            const listEl = chatContainer.querySelector('.monaco-list');
            if (listEl && listEl.getAttribute('aria-setsize')) {
                const parsed = parseInt(listEl.getAttribute('aria-setsize'), 10);
                if (!isNaN(parsed) && parsed > ariaSetSize) {
                    ariaSetSize = parsed;
                }
            }

            // Tính toán tổng số turn thực tế
            const estimatedTurnCount = Math.max(
                ariaSetSize ? Math.ceil(ariaSetSize / 2) : 0,
                maxIndexFound >= 0 ? Math.ceil((maxIndexFound + 1) / 2) : 0,
                chatContainer.__jarvisTurns.size,
                1
            );

            const REQUEST_SELECTOR = '.interactive-request, .monaco-list-row.request, [data-index].request, .chat-row.request, .chat-request, .chat-item.request, div[class*="request"]';
            const candidateNodes = chatContainer.querySelectorAll(REQUEST_SELECTOR);
            const rowSet = new Set();
            for (const node of candidateNodes) {
                if (node.closest('.interactive-response, .chat-response, .chat-item.response, [class~="response"]')) {
                    continue;
                }
                if (node.closest('.interactive-input-part, .chat-input-editor, .interactive-input-editor, .chat-input-widget, .chat-input-container')) {
                    continue;
                }
                const rowEl = node.closest('.monaco-list-row') || node;
                rowSet.add(rowEl);
            }

            const scrollable = chatContainer.querySelector('.monaco-scrollable-element');
            const scrollableRect = scrollable ? scrollable.getBoundingClientRect() : null;
            const totalScrollHeight = scrollable ? Math.max(scrollable.scrollHeight, 1) : 1;

            if (rowSet.size === 0 && (chatContainer.querySelector('.chat-welcome-view') || (ariaSetSize === 0 && maxIndexFound < 0 && chatContainer.__jarvisTurns.size === 0))) {
                chatContainer.__jarvisTurns.clear();
                railEl.style.display = 'none';
                return;
            }

            rowSet.forEach((rowEl) => {
                const dataIndexStr = rowEl.getAttribute('data-index') || (rowEl.querySelector('[data-index]') && rowEl.querySelector('[data-index]').getAttribute('data-index'));
                const dataIndex = dataIndexStr !== null && dataIndexStr !== undefined ? parseInt(dataIndexStr, 10) : null;

                const mdEl = rowEl.querySelector('.rendered-markdown') || rowEl.querySelector('.interactive-request-content') || rowEl;
                const rawText = (mdEl.textContent || '').trim();
                if (!rawText) return;

                if (dataIndex === 0 && chatContainer.__jarvisTurns.size > 0) {
                    const turn0 = chatContainer.__jarvisTurns.get('idx_0');
                    if (turn0 && turn0.text && !turn0.isPlaceholder && !rawText.startsWith(turn0.text.substring(0, 30)) && !turn0.text.startsWith(rawText.substring(0, 30))) {
                        chatContainer.__jarvisTurns.clear();
                    }
                }

                // Trích xuất response của AI liền kề
                const respEl = findAiResponseElement(rowEl, dataIndex, chatContainer);
                const respSnippet = extractAiResponseSnippet(respEl);

                const turnKey = dataIndex !== null ? `idx_${dataIndex}` : `txt_${rawText.substring(0, 40)}`;
                const altEvenKey = dataIndex !== null ? `idx_${Math.floor(dataIndex / 2) * 2}` : null;
                let turn = chatContainer.__jarvisTurns.get(turnKey);
                if (!turn && altEvenKey && chatContainer.__jarvisTurns.has(altEvenKey)) {
                    turn = chatContainer.__jarvisTurns.get(altEvenKey);
                }

                const firstLine = rawText.split('\n')[0].trim();
                const titleStr = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
                const snippetStr = rawText.length > 130 ? rawText.substring(0, 127) + '...' : rawText;

                if (!turn) {
                    const now = new Date();
                    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    turn = {
                        key: turnKey,
                        dataIndex: dataIndex,
                        text: rawText,
                        title: titleStr,
                        snippet: snippetStr,
                        responseSnippet: respSnippet,
                        timestamp: timeStr,
                        createdTime: Date.now(),
                        isPlaceholder: false
                    };
                    chatContainer.__jarvisTurns.set(turnKey, turn);
                } else {
                    turn.text = rawText;
                    turn.title = titleStr;
                    turn.snippet = snippetStr;
                    turn.isPlaceholder = false;
                    if (dataIndex !== null) turn.dataIndex = dataIndex;
                    if (respSnippet) {
                        turn.responseSnippet = respSnippet;
                    }
                    if (!turn.timestamp) {
                        const now = new Date();
                        turn.timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    }
                }

                if (scrollable && scrollableRect) {
                    const rowRect = rowEl.getBoundingClientRect();
                    const rowTop = rowRect.top - scrollableRect.top + scrollable.scrollTop;
                    turn.lastKnownTop = Math.max(0, rowTop);
                    turn.estimatedOffsetRatio = Math.min(Math.max(rowTop / totalScrollHeight, 0), 1);
                }

                // Ghi đè placeholder bằng dữ liệu thật và lưu vào window.__jarvisSessionCache
                if (typeof window !== 'undefined' && window.__jarvisSessionCache) {
                    const cachePayload = {
                        dataIndex: turn.dataIndex,
                        text: turn.text,
                        title: turn.title,
                        snippet: turn.snippet,
                        responseSnippet: turn.responseSnippet,
                        timestamp: turn.timestamp,
                        createdTime: turn.createdTime,
                        estimatedOffsetRatio: turn.estimatedOffsetRatio,
                        lastKnownTop: turn.lastKnownTop,
                        isPlaceholder: false
                    };
                    window.__jarvisSessionCache.set(turnKey, cachePayload);
                    if (altEvenKey && altEvenKey !== turnKey) {
                        window.__jarvisSessionCache.set(altEvenKey, cachePayload);
                    }
                    if (chatContainer.__jarvisCurrentSession) {
                        window.__jarvisSessionCache.set(`${chatContainer.__jarvisCurrentSession}:${turnKey}`, cachePayload);
                        if (altEvenKey && altEvenKey !== turnKey) {
                            window.__jarvisSessionCache.set(`${chatContainer.__jarvisCurrentSession}:${altEvenKey}`, cachePayload);
                        }
                    }
                }
            });

            // Tự động tạo các turn vạch mốc đại diện (placeholder / cached turns) nếu estimatedTurnCount > chatContainer.__jarvisTurns.size
            if (estimatedTurnCount > chatContainer.__jarvisTurns.size) {
                for (let k = 0; k < estimatedTurnCount; k++) {
                    const kKey = `idx_${k * 2}`;
                    if (!chatContainer.__jarvisTurns.has(kKey)) {
                        const ratio = k / Math.max(estimatedTurnCount - 1, 1);
                        let cached = null;
                        if (typeof window !== 'undefined' && window.__jarvisSessionCache) {
                            if (chatContainer.__jarvisCurrentSession) {
                                cached = window.__jarvisSessionCache.get(`${chatContainer.__jarvisCurrentSession}:${kKey}`);
                            }
                            if (!cached) {
                                cached = window.__jarvisSessionCache.get(kKey);
                            }
                        }

                        if (cached) {
                            chatContainer.__jarvisTurns.set(kKey, {
                                key: kKey,
                                dataIndex: k * 2,
                                text: cached.text || '',
                                title: cached.title || `Lượt chat #${k + 1}`,
                                snippet: cached.snippet || 'Nhấp vào vạch mốc để cuộn nhanh đến câu hỏi và phản hồi này.',
                                responseSnippet: cached.responseSnippet || '',
                                timestamp: cached.timestamp || '',
                                createdTime: cached.createdTime || Date.now(),
                                estimatedOffsetRatio: typeof cached.estimatedOffsetRatio === 'number' ? cached.estimatedOffsetRatio : ratio,
                                lastKnownTop: cached.lastKnownTop,
                                isPlaceholder: false
                            });
                        } else {
                            chatContainer.__jarvisTurns.set(kKey, {
                                key: kKey,
                                dataIndex: k * 2,
                                text: '',
                                title: `Lượt chat #${k + 1}`,
                                snippet: 'Nhấp vào vạch mốc để cuộn nhanh đến câu hỏi và phản hồi này.',
                                responseSnippet: '',
                                timestamp: '',
                                createdTime: Date.now() + k,
                                estimatedOffsetRatio: ratio,
                                isPlaceholder: true
                            });
                        }
                    }
                }
            }

            const turns = Array.from(chatContainer.__jarvisTurns.values());
            turns.sort((a, b) => {
                if (a.dataIndex !== null && b.dataIndex !== null) return a.dataIndex - b.dataIndex;
                if (typeof a.estimatedOffsetRatio === 'number' && typeof b.estimatedOffsetRatio === 'number') {
                    return a.estimatedOffsetRatio - b.estimatedOffsetRatio;
                }
                return a.createdTime - b.createdTime;
            });

            turns.forEach((t, i) => {
                t.number = i + 1;
            });

            if (turns.length === 0) {
                railEl.style.display = 'none';
                return;
            }
            railEl.style.display = 'block';

            renderTimelineTicks(railEl, cardEl, turns, chatContainer, viewportIndicator);
        }

        chatContainer.__jarvisUpdateTimeline = updateTimeline;
        updateTimeline();

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(() => {
                updateTimeline();
            });
            ro.observe(chatContainer);
        }
    }

    function scanAndSetupChatTimelines() {
        if (typeof document === 'undefined') return;
        const chatContainers = document.querySelectorAll('.interactive-session, [class*="interactive-session"]');
        for (const container of chatContainers) {
            if (!container.__jarvisTimelineAttached) {
                setupChatTimelineMinimap(container);
            } else if (typeof container.__jarvisUpdateTimeline === 'function') {
                container.__jarvisUpdateTimeline();
            }
        }
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('resize', scanAndSetupChatTimelines, { passive: true });
    }

    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
        const historyObserver = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (let i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }
            if (shouldScan) {
                scanAndDecorateHistory();
                if (document.body) {
                    evaluateEmptyToolElements(document.body);
                }
                scanAndSetupChatTimelines();
            }
        });

        const startObserver = () => {
            const target = document.body || document.documentElement;
            if (target) {
                historyObserver.observe(target, { childList: true, subtree: true });
                scanAndDecorateHistory();
                evaluateEmptyToolElements(document.body || target);
                findAndAttachChatEditor();
                scanAndSetupChatTimelines();
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                startObserver();
                findAndAttachChatEditor();
                scanAndSetupChatTimelines();
            });
        } else {
            startObserver();
            findAndAttachChatEditor();
            scanAndSetupChatTimelines();
        }
    }

    if (typeof setInterval !== 'undefined') {
        setInterval(() => {
            if (typeof document !== 'undefined' && document.body) {
                evaluateEmptyToolElements(document.body);
                scanAndSetupChatTimelines();
            }
        }, 600);
    }

    /**
     * Theo dõi window.__codeEditorService để tự động gắn decorations cho mọi Monaco Editor
     */
    function watchAllEditors() {
        function hookService(svc) {
            if (!svc || svc.__watched) return;
            svc.__watched = true;

            if (typeof svc.listCodeEditors === 'function') {
                try {
                    const editors = svc.listCodeEditors();
                    if (editors && typeof editors[Symbol.iterator] === 'function') {
                        for (const ed of editors) {
                            attachChatPillDecorations(ed);
                        }
                    }
                } catch (e) {
                    console.error('[JARVIS] Error listing code editors:', e);
                }
            }

            if (typeof svc.onCodeEditorAdd === 'function') {
                try {
                    svc.onCodeEditorAdd((editor) => {
                        attachChatPillDecorations(editor);
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
                                attachChatPillDecorations(ed);
                            }
                        }
                    }
                } catch (e) {
                    console.error('[JARVIS] Error polling code editors:', e);
                }
            }, 300);
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
})();
