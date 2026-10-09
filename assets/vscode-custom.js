/**
 * Custom JS Loader - Chat Slash Command Decoration Bridge
 * Tự động bôi xanh pill cho mọi slash command trong Chat Input (sau space, >, hoặc đầu câu)
 */
(function () {
    'use strict';

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

                const reBacktick = /(?:^|[\s>:,;])(`[\p{L}0-9_.:-]+)(?!`)/gu;
                let mb;
                while ((mb = reBacktick.exec(text)) !== null) {
                    const subStart = mb.index + mb[0].lastIndexOf(mb[1]);
                    const p1 = model.getPositionAt(subStart);
                    const p2 = model.getPositionAt(subStart + mb[1].length);
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
        markdownEl.__historyDecorated = true;

        if (typeof document === 'undefined') return;

        // Unwrap các thẻ <code> (không nằm trong <pre>) thành text node với format ` + code.textContent + `
        const codeElements = Array.from(markdownEl.querySelectorAll('code')).filter(
            (codeEl) => !codeEl.closest('pre')
        );
        for (const codeEl of codeElements) {
            const rawText = '`' + (codeEl.textContent || '') + '`';
            const textNode = document.createTextNode(rawText);
            if (codeEl.parentNode) {
                codeEl.parentNode.replaceChild(textNode, codeEl);
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

        const tokenRe = /(?:^|[\s>:,;])((?:\/[\p{L}0-9_.:-]+)|(?:`[\p{L}0-9_.:-]+(?!`)))/gu;

        for (const textNode of nodesToReplace) {
            const text = textNode.nodeValue;
            tokenRe.lastIndex = 0;
            let match;
            let lastIndex = 0;
            let hasMatches = false;
            const frag = document.createDocumentFragment();

            while ((match = tokenRe.exec(text)) !== null) {
                hasMatches = true;
                const fullMatch = match[0];
                const token = match[1];
                const tokenStart = match.index + fullMatch.lastIndexOf(token);

                if (tokenStart > lastIndex) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex, tokenStart)));
                }

                const span = document.createElement('span');
                if (token.startsWith('/')) {
                    span.className = 'custom-wf-pill';
                } else {
                    span.className = 'custom-backtick-pill';
                }
                span.textContent = token;
                frag.appendChild(span);

                lastIndex = tokenStart + token.length;
            }

            if (hasMatches) {
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
                '.interactive-request .rendered-markdown, .chat-item.request .rendered-markdown, [class*="interactive"] .rendered-markdown, .monaco-list-row.request .rendered-markdown, [data-index].request .rendered-markdown, .chat-row.request .rendered-markdown, .chat-request .rendered-markdown, div[class*="request"] .rendered-markdown'
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
