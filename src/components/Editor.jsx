import React, { useEffect } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/theme/dracula.css';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/addon/edit/closetag.js';
import 'codemirror/addon/edit/closebrackets.js';

const editor = () => {

    useEffect(() => {
        async function init (){
            Codemirror.fromTextArea(document.getElementById('realtimeEditor'), {
                mode: {name: 'javascript', json: true}, 
                theme: 'dracula',   
                autoCloseTags: true,
                autoCloseBrackets: true,
                lineNumbers: true,
            });
        }
        init();
    }, []);

    return (
        <textarea id="realtimeEditor"></textarea>
    );
}


export default editor;