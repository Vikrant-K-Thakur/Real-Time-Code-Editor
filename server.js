const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve React build files
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all route to serve index.html for React Router
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
// Keep per-room file state
const roomFileState = {}; 
function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        // Ensure room has initialized file state
        if (!roomFileState[roomId]) {
            roomFileState[roomId] = {
                files: ['index.js'],
                fileContents: { 'index.js': '' },
                activeFile: 'index.js',
            };
        }

        const clients = getAllConnectedClients(roomId);

        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });

        // Send full snapshot to the newly joined client
        io.to(socket.id).emit(ACTIONS.FILES_UPDATE, roomFileState[roomId]);
    });

    // ===== Real-time code sync =====
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        if (roomFileState[roomId]) {
            roomFileState[roomId].fileContents[roomFileState[roomId].activeFile] = code;
        }
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // ===== Multi-file sync =====
    socket.on(ACTIONS.SYNC_FILES, ({ socketId, files, fileContents, activeFile }) => {
        roomFileState[socket.rooms.values().next().value] = {
            files,
            fileContents,
            activeFile,
        };
        io.to(socketId).emit(ACTIONS.FILES_UPDATE, { files, fileContents, activeFile });
    });

    socket.on(ACTIONS.NEW_FILE, ({ roomId, fileName, content }) => {
        if (roomFileState[roomId]) {
            if (!roomFileState[roomId].files.includes(fileName)) {
                roomFileState[roomId].files.push(fileName);
                roomFileState[roomId].fileContents[fileName] = content ?? '';
            }
        }
        socket.in(roomId).emit(ACTIONS.NEW_FILE, { fileName, content });
    });

    socket.on(ACTIONS.RENAME_FILE, ({ roomId, oldName, newName }) => {
        if (roomFileState[roomId]) {
            roomFileState[roomId].files = roomFileState[roomId].files.map((f) =>
                f === oldName ? newName : f
            );
            roomFileState[roomId].fileContents[newName] =
                roomFileState[roomId].fileContents[oldName] ?? '';
            delete roomFileState[roomId].fileContents[oldName];
            if (roomFileState[roomId].activeFile === oldName) {
                roomFileState[roomId].activeFile = newName;
            }
        }
        socket.in(roomId).emit(ACTIONS.RENAME_FILE, { oldName, newName });
    });

    socket.on(ACTIONS.ACTIVE_FILE, ({ roomId, file }) => {
        if (roomFileState[roomId]) {
            roomFileState[roomId].activeFile = file;
        }
        socket.in(roomId).emit(ACTIONS.ACTIVE_FILE, { file });
    });

    socket.on(ACTIONS.DELETE_FILE, ({ roomId, file }) => {
        if (roomFileState[roomId]) {
            roomFileState[roomId].files = roomFileState[roomId].files.filter(
                (f) => f !== file
            );
            delete roomFileState[roomId].fileContents[file];
            if (roomFileState[roomId].activeFile === file) {
                roomFileState[roomId].activeFile =
                    roomFileState[roomId].files[0] || 'index.js';
            }
        }
        socket.in(roomId).emit(ACTIONS.DELETE_FILE, { file });
    });
    // --------------------------------

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
