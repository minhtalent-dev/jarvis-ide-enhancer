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

    function attachChatPillDecorations(editor) {
        if (!editor || typeof editor.createDecorationsCollection !== 'function') return;
        if (editor.__slashPillAttached) return;
        editor.__slashPillAttached = true;

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
        if (!markdownEl || markdownEl.__historyDecorated) return;
        if (typeof document === 'undefined') return;

        if (markdownEl.closest('.interactive-response, .chat-response, [class*="response"]')) {
            return;
        }
        if (!markdownEl.closest('.interactive-request, .chat-item.request, [class*="request"]')) {
            return;
        }

        markdownEl.__historyDecorated = true;

        // Unwrap các thẻ <code> (không nằm trong <pre>) thành text node nếu chứa backtick macro token
        const codeElements = Array.from(markdownEl.querySelectorAll('code')).filter(
            (codeEl) => !codeEl.closest('pre')
        );
        for (const codeEl of codeElements) {
            const rawContent = codeEl.textContent || '';
            if (findBacktickMacroTokens('`' + rawContent + '`').length > 0) {
                const rawText = '`' + rawContent + '`';
                const textNode = document.createTextNode(rawText);
                if (codeEl.parentNode) {
                    codeEl.parentNode.replaceChild(textNode, codeEl);
                }
            }
        }
        if (typeof markdownEl.normalize === 'function') {
            markdownEl.normalize();
        }

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

        for (const textNode of nodesToReplace) {
            const text = textNode.nodeValue;
            const allTokens = [];

            slashRe.lastIndex = 0;
            let sm;
            while ((sm = slashRe.exec(text)) !== null) {
                const rawToken = sm[1];
                const tokenStart = sm.index + sm[0].lastIndexOf(rawToken);
                allTokens.push({
                    token: rawToken,
                    start: tokenStart,
                    end: tokenStart + rawToken.length,
                    type: 'slash'
                });
            }

            const backtickTokens = findBacktickMacroTokens(text);
            for (const bt of backtickTokens) {
                allTokens.push({
                    token: bt.token,
                    start: bt.start,
                    end: bt.end,
                    type: 'backtick'
                });
            }

            allTokens.sort((a, b) => a.start - b.start);

            const nonOverlapping = [];
            let cursor = 0;
            for (const tok of allTokens) {
                if (tok.start >= cursor) {
                    nonOverlapping.push(tok);
                    cursor = tok.end;
                }
            }

            if (nonOverlapping.length > 0) {
                const frag = document.createDocumentFragment();
                let lastIndex = 0;
                for (const tok of nonOverlapping) {
                    if (tok.start > lastIndex) {
                        frag.appendChild(document.createTextNode(text.slice(lastIndex, tok.start)));
                    }
                    const span = document.createElement('span');
                    span.className = tok.type === 'slash' ? 'custom-wf-pill' : 'custom-backtick-pill';
                    span.textContent = tok.token;
                    frag.appendChild(span);
                    lastIndex = tok.end;
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
        try {
            const targets = document.querySelectorAll(
                '.interactive-request .rendered-markdown, .chat-item.request .rendered-markdown, .monaco-list-row.request .rendered-markdown, [data-index].request .rendered-markdown, .chat-row.request .rendered-markdown, .chat-request .rendered-markdown, div[class*="request"] .rendered-markdown'
            );
            targets.forEach((el) => decorateHistoryBubble(el));
        } catch (err) {
            console.error('[JARVIS] Error scanning history:', err);
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
            }
        });

        const startObserver = () => {
            const target = document.body || document.documentElement;
            if (target) {
                historyObserver.observe(target, { childList: true, subtree: true });
                scanAndDecorateHistory();
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserver);
        } else {
            startObserver();
        }
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
