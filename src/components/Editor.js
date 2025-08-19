import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange, initialCode }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        editorRef.current = Codemirror.fromTextArea(
            document.getElementById('realtimeEditor'),
            {
                mode: { name: 'javascript', json: true },
                theme: 'dracula',
                autoCloseTags: true,
                autoCloseBrackets: true,
                lineNumbers: true,
            }
        );

        // Force LTR to prevent reversed typing
        const wrap = editorRef.current.getWrapperElement();
        if (wrap) {
            wrap.style.direction = 'ltr';
        }

        // Set initial content (once)
        if (typeof initialCode === 'string') {
            editorRef.current.setValue(initialCode);
            const lastLine = editorRef.current.lineCount() - 1;
            const lastCh = editorRef.current.getLine(lastLine)?.length || 0;
            editorRef.current.setCursor({ line: lastLine, ch: lastCh });
        }

        editorRef.current.on('change', (instance, changes) => {
            const { origin } = changes || {};
            const code = instance.getValue();
            onCodeChange(code);
            if (origin !== 'setValue') {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                    roomId,
                    code,
                });
            }
        });

        return () => {
            if (editorRef.current) {
                editorRef.current.toTextArea();
            }
        };
    }, []);

    // Receive remote changes
    useEffect(() => {
        if (socketRef.current) {
            const handler = ({ code }) => {
                const cm = editorRef.current;
                if (cm && code !== null && code !== undefined && cm.getValue() !== code) {
                    cm.setValue(code);
                    // keep caret at end to avoid visual "reverse" effect
                    const lastLine = cm.lineCount() - 1;
                    const lastCh = cm.getLine(lastLine)?.length || 0;
                    cm.setCursor({ line: lastLine, ch: lastCh });
                }
            };
            socketRef.current.on(ACTIONS.CODE_CHANGE, handler);
            return () => socketRef.current.off(ACTIONS.CODE_CHANGE, handler);
        }
    }, [socketRef.current]);

    // When active file changes, update the editor with that file's content
    useEffect(() => {
        const cm = editorRef.current;
        if (cm && typeof initialCode === 'string' && cm.getValue() !== initialCode) {
            cm.setValue(initialCode);
            const lastLine = cm.lineCount() - 1;
            const lastCh = cm.getLine(lastLine)?.length || 0;
            cm.setCursor({ line: lastLine, ch: lastCh });
        }
    }, [initialCode]);

    return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;
