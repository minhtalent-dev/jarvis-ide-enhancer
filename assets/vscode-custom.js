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

        const inlineCodeRanges = [];
        const inlineCodeRe = /(?:^|[^\\])`([^`\r\n]+)`(?=[\s.,;:!?)\]\r\n]|$)/gu;
        let m;
        while ((m = inlineCodeRe.exec(text)) !== null) {
            const fullMatch = m[0];
            const prefixLen = fullMatch.length - m[1].length - 2;
            const codeStart = m.index + prefixLen;
            const codeEnd = codeStart + m[1].length + 2;
            inlineCodeRanges.push([codeStart, codeEnd]);
        }

        const tokens = [];
        const macroRe = /(?:^|[\s>:,;])(`[\p{L}0-9_.:-]+)(?=[\s>:,;.?!)\]]|$)/gu;
        let mb;
        while ((mb = macroRe.exec(text)) !== null) {
            const fullMatch = mb[0];
            const rawToken = mb[1];
            const tokenStart = mb.index + fullMatch.lastIndexOf(rawToken);
            const tokenEnd = tokenStart + rawToken.length;

            const insideInline = inlineCodeRanges.some(([start, end]) => tokenStart < end && tokenEnd > start);

            if (!insideInline) {
                tokens.push({
                    token: rawToken,
                    start: tokenStart,
                    end: tokenEnd,
                    index: tokenStart,
                    length: rawToken.length
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

    function getActiveMacros() {
        const dynamicMacros = window.__jarvisDynamicMacros || window.__jarvisCustomMacros;
        if (Array.isArray(dynamicMacros) && dynamicMacros.length > 0) {
            return dynamicMacros;
        }
        return JARVIS_DEFAULT_MACROS;
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
            const range = _currentReplaceRange;
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
            tokenSpan.className = 'jarvis-macro-token';
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
                const match = /(?:^|[\s>:,;])(`[\p{L}0-9_.:-]*)$/u.exec(textBeforeCursor);

                if (!match) {
                    if (_activeEditorForMacro === editor) hideMacroPopup();
                    return;
                }

                const fullMatch = match[0];
                const rawToken = match[1];
                const tokenStartInFullMatch = fullMatch.lastIndexOf(rawToken);
                const startCol = (pos.column - 1) - (fullMatch.length - tokenStartInFullMatch) + 1;

                const prefix = rawToken.toLowerCase();
                const matched = getActiveMacros().filter((m) => m.token.toLowerCase().startsWith(prefix));

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
        if (window.__chatInputEditor && !window.__chatInputEditor.__slashPillAttached) {
            attachChatPillDecorations(window.__chatInputEditor);
        }
    }, 300);

    window.addEventListener('chat-editor-ready', (e) => {
        if (e.detail) attachChatPillDecorations(e.detail);
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
     * Triệt tiêu khung Terminal / Tool Invocation Rỗng trong Chat Response
     */
    function evaluateEmptyToolElements(rootNode) {
        if (!rootNode || typeof document === 'undefined') return;

        const selector = '.chat-tool-invocation-part, .chat-terminal-output-container, .chat-terminal-content-part, [class*="terminal-output"], .tool-output-part';
        const targets = rootNode.querySelectorAll ? Array.from(rootNode.querySelectorAll(selector)) : [];
        if (rootNode.matches && rootNode.matches(selector)) {
            targets.push(rootNode);
        }

        for (const el of targets) {
            if ((el.dataset && el.dataset.empty === 'true') || el.getAttribute('data-empty') === 'true') continue;
            if (el.querySelector('.codicon-loading, [class*="progress"]')) continue;

            const outputEl = el.querySelector('.chat-terminal-output-terminal, .chat-terminal-output-content, .chat-tool-output, pre, .terminal-widget') || el;
            const raw = outputEl.textContent || '';
            const cleanText = raw
                .replace(/\u001b(?:\[[0-9;?]*[a-zA-Z]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)?)/g, '')
                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                .trim();

            if (cleanText === '') {
                el.setAttribute('data-empty', 'true');
                const parentContainer = el.closest ? el.closest('.chat-terminal-output-container, .chat-terminal-content-part') : null;
                if (parentContainer) {
                    parentContainer.setAttribute('data-empty', 'true');
                }
            }
        }
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
            }
        });

        const startObserver = () => {
            const target = document.body || document.documentElement;
            if (target) {
                historyObserver.observe(target, { childList: true, subtree: true });
                scanAndDecorateHistory();
                evaluateEmptyToolElements(document.body || target);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserver);
        } else {
            startObserver();
        }
    }

    if (typeof setInterval !== 'undefined') {
        setInterval(() => {
            if (typeof document !== 'undefined' && document.body) {
                evaluateEmptyToolElements(document.body);
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
