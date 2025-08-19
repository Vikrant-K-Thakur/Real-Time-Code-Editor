import React, { useState } from 'react';

const FileExplorer = ({ files, onFileSelect, onNewFile, onRenameFile }) => {
    const [editingFile, setEditingFile] = useState(null);
    const [newName, setNewName] = useState('');

    const handleRename = (file) => {
        setEditingFile(file);
        setNewName(file);
    };

    const submitRename = () => {
        if (newName.trim() !== '') {
            onRenameFile(editingFile, newName.trim());
        }
        setEditingFile(null);
    };

    return (
        <div className="file-explorer">
            <div className="file-actions">
                <button onClick={onNewFile}>+ New File</button>
            </div>
            <ul>
                {files.map((file) => (
                    <li key={file} onClick={() => onFileSelect(file)}>
                        {editingFile === file ? (
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onBlur={submitRename}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitRename();
                                }}
                                autoFocus
                            />
                        ) : (
                            <span>
                                {file}{' '}
                                <button
                                    className="rename-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRename(file);
                                    }}
                                >
                                    Rename
                                </button>
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default FileExplorer;
