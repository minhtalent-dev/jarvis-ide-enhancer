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
                            inlineClassName: 'custom-wf-pill',
                            className: 'custom-wf-pill-bg'
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
        update();
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
})();
