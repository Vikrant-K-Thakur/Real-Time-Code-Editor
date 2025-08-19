import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';
import { FiPlus, FiTrash2 } from 'react-icons/fi'; // Plus & Delete icons

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);

    // File management states
    const [files, setFiles] = useState(['index.js']);
    const [activeFile, setActiveFile] = useState('index.js');
    const [fileContents, setFileContents] = useState({ 'index.js': '' });

    // Rename state
    const [renamingFile, setRenamingFile] = useState(null);
    const [newFileName, setNewFileName] = useState('');

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // When anyone joins
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                    }
                    setClients(clients);

                    // Send current buffer (existing logic)
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });

                    // Send full files snapshot (additive)
                    socketRef.current.emit(ACTIONS.SYNC_FILES, {
                        socketId,
                        files,
                        fileContents,
                        activeFile,
                    });
                }
            );

            // Receive full snapshot of files/contents/active tab
            socketRef.current.on(
                ACTIONS.FILES_UPDATE,
                ({ files, fileContents, activeFile }) => {
                    setFiles(files && files.length ? files : ['index.js']);
                    setFileContents(fileContents || { 'index.js': '' });
                    setActiveFile(
                        activeFile || (files && files[0]) || 'index.js'
                    );
                }
            );

            // New file created elsewhere
            socketRef.current.on(ACTIONS.NEW_FILE, ({ fileName, content }) => {
                setFiles((prev) =>
                    prev.includes(fileName) ? prev : [...prev, fileName]
                );
                setFileContents((prev) => ({
                    ...prev,
                    [fileName]: content ?? '',
                }));
            });

            // File renamed elsewhere
            socketRef.current.on(ACTIONS.RENAME_FILE, ({ oldName, newName }) => {
                setFiles((prev) => prev.map((f) => (f === oldName ? newName : f)));
                setFileContents((prev) => {
                    const next = { ...prev, [newName]: prev[oldName] ?? '' };
                    delete next[oldName];
                    return next;
                });
                setActiveFile((prev) => (prev === oldName ? newName : prev));
            });

            // Active file switched elsewhere
            socketRef.current.on(ACTIONS.ACTIVE_FILE, ({ file }) => {
                setActiveFile(file);
            });

            // File deleted elsewhere
            socketRef.current.on(ACTIONS.DELETE_FILE, ({ file }) => {
                setFiles((prev) => prev.filter((f) => f !== file));
                setFileContents((prev) => {
                    const next = { ...prev };
                    delete next[file];
                    return next;
                });
                setActiveFile((prev) => {
                    if (prev === file) {
                        // Switch gracefully to first remaining file
                        const remaining = files.filter((f) => f !== file);
                        return remaining[0] || 'index.js';
                    }
                    return prev;
                });
            });

            // Disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) =>
                        prev.filter((client) => client.socketId !== socketId)
                    );
                }
            );
        };
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
            socketRef.current.off(ACTIONS.FILES_UPDATE);
            socketRef.current.off(ACTIONS.NEW_FILE);
            socketRef.current.off(ACTIONS.RENAME_FILE);
            socketRef.current.off(ACTIONS.ACTIVE_FILE);
            socketRef.current.off(ACTIONS.DELETE_FILE);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    // === File operations ===
    const handleNewFile = () => {
        const newFile = `file${files.length + 1}.js`;
        setFiles((prev) => [...prev, newFile]);
        setFileContents((prev) => ({ ...prev, [newFile]: '' }));
        setActiveFile(newFile);
        socketRef.current.emit(ACTIONS.NEW_FILE, {
            roomId,
            fileName: newFile,
            content: '',
        });
        socketRef.current.emit(ACTIONS.ACTIVE_FILE, { roomId, file: newFile });
    };

    const handleFileSelect = (file) => {
        setActiveFile(file);
        socketRef.current.emit(ACTIONS.ACTIVE_FILE, { roomId, file });
    };

    const handleRenameFile = (oldName, newName) => {
        if (!newName.trim()) return;
        if (files.includes(newName)) {
            toast.error('File already exists');
            return;
        }
        setFiles((prev) => prev.map((f) => (f === oldName ? newName : f)));
        setFileContents((prev) => {
            const next = { ...prev, [newName]: prev[oldName] ?? '' };
            delete next[oldName];
            return next;
        });
        setActiveFile((prev) => (prev === oldName ? newName : prev));

        socketRef.current.emit(ACTIONS.RENAME_FILE, {
            roomId,
            oldName,
            newName,
        });
    };

    const handleRenameStart = (file) => {
        setRenamingFile(file);
        setNewFileName(file);
    };

    const handleRenameSubmit = (e, oldName) => {
        e.preventDefault();
        handleRenameFile(oldName, newFileName);
        setRenamingFile(null);
        setNewFileName('');
    };

    const handleDeleteFile = (file) => {
        if (files.length === 1) {
            toast.error('At least one file is required.');
            return;
        }
        const nextFiles = files.filter((f) => f !== file);
        setFiles(nextFiles);
        setFileContents((prev) => {
            const next = { ...prev };
            delete next[file];
            return next;
        });

        const nextActive =
            activeFile === file ? nextFiles[0] : activeFile;
        setActiveFile(nextActive);
        socketRef.current.emit(ACTIONS.ACTIVE_FILE, {
            roomId,
            file: nextActive,
        });

        socketRef.current.emit(ACTIONS.DELETE_FILE, { roomId, file });
    };

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <h3
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        Files
                        <FiPlus onClick={handleNewFile} style={{ cursor: 'pointer' }} />
                    </h3>
                    <div className="fileList">
                        {files.map((file) => (
                            <div
                                key={file}
                                className={`fileItem ${activeFile === file ? 'active' : ''}`}
                                onClick={() => handleFileSelect(file)}
                                onDoubleClick={() => handleRenameStart(file)}
                            >
                                <span className="fileNameText">
                                    {renamingFile === file ? (
                                        <form onSubmit={(e) => handleRenameSubmit(e, file)}>
                                            <input
                                                autoFocus
                                                value={newFileName}
                                                onChange={(e) => setNewFileName(e.target.value)}
                                                onBlur={(e) => handleRenameSubmit(e, file)}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid #555',
                                                    color: 'white',
                                                    width: '100%',
                                                }}
                                            />
                                        </form>
                                    ) : (
                                        file
                                    )}
                                </span>
                                <span
                                    className="deleteIcon"
                                    title="Delete"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteFile(file);
                                    }}
                                >
                                    <FiTrash2 />
                                </span>
                            </div>
                        ))}
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client key={client.socketId} username={client.username} />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                <div className="tabs">
                    {files.map((file) => (
                        <button
                            key={file}
                            className={`tab ${activeFile === file ? 'active' : ''}`}
                            onClick={() => handleFileSelect(file)}
                        >
                            {file}
                        </button>
                    ))}
                </div>
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                        setFileContents((prev) => ({
                            ...prev,
                            [activeFile]: code,
                        }));
                    }}
                    initialCode={fileContents[activeFile]}
                />
            </div>
        </div>
    );
};

export default EditorPage;
