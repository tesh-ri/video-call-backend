const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
  },
});

const rooms = {}; // track room users

io.on('connection', (socket) => {
  console.log('🟢 New connection:', socket.id);

  socket.on('join', (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(socket.id);

    const otherUsers = Array.from(rooms[roomId]).filter(id => id !== socket.id);
    if (otherUsers.length > 0) {
      // notify new user about one peer
      socket.emit('user-joined', otherUsers[0], rooms[roomId].size);
    }

    // update everyone in the room about the new count
    io.to(roomId).emit('update-user-count', rooms[roomId].size);
  });

  socket.on('offer', (data) => {
    io.to(data.to).emit('offer', { offer: data.offer, from: socket.id });
  });

  socket.on('answer', (data) => {
    io.to(data.to).emit('answer', { answer: data.answer });
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.to).emit('ice-candidate', { candidate: data.candidate });
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        rooms[roomId].delete(socket.id);
        if (rooms[roomId].size === 0) {
          delete rooms[roomId];
        } else {
          socket.to(roomId).emit('user-left', rooms[roomId].size);
        }
      }
    }
  });
});

server.listen(8000, () => {
  console.log('✅ Server started on port 8000');
});
