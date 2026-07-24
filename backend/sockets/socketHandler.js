const jwt = require('jsonwebtoken');

function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: user ${socket.user.id} (${socket.id})`);

    socket.on('group:join', (groupId) => {
      socket.join(`group:${groupId}`);
      console.log(`User ${socket.user.id} joined room group:${groupId}`);
    });

    socket.on('group:leave', (groupId) => {
      socket.leave(`group:${groupId}`);
    });

    socket.on('expense:typing', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('expense:typing', {
        userId: socket.user.id,
        name: socket.user.name
      });
    });

    socket.on('expense:typing:stop', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('expense:typing:stop', {
        userId: socket.user.id
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: user ${socket.user.id}`);
    });
  });
}

module.exports = initSocket;
