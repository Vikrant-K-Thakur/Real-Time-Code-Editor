const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    DISCONNECTED: 'disconnected',
    CODE_CHANGE: 'code-change',
    SYNC_CODE: 'sync-code',
    LEAVE: 'leave',

    // --- Added for multi-file sync ---
    SYNC_FILES: 'sync-files',
    FILES_UPDATE: 'files-update',
    NEW_FILE: 'new-file',
    RENAME_FILE: 'rename-file',
    ACTIVE_FILE: 'active-file',
    DELETE_FILE: 'delete-file',      // <-- NEW
};

module.exports = ACTIONS;
