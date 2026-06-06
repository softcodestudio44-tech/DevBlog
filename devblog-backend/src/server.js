require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const likeRoutes = require('./routes/likeRoutes');
const commentRoutes = require('./routes/commentRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const prisma = require('./config/database');

const app = express();
const server = http.createServer(app);

const ADMIN_EMAIL = 'softcodestudio44@gmail.com';

// CORS allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://devblog-44.vercel.app',
  'https://dev-blog-woad-seven.vercel.app'
];

// Express CORS - MUST come BEFORE routes
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
});

const onlineUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.user = null;
      return next();
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, avatar: true, email: true, role: true },
    });
    
    if (user && user.email === ADMIN_EMAIL) {
      user.isAdmin = true;
    }
    
    socket.user = user;
    next();
  } catch (err) {
    socket.user = null;
    next();
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id, socket.user?.email || 'guest');

  if (socket.user) {
    socket.join(`user:${socket.user.id}`);
    // Add to online users immediately on connection
    onlineUsers.set(socket.user.id, {
      ...socket.user,
      socketId: socket.id,
    });
    // Emit updated online users list
    io.emit('online-users', Array.from(onlineUsers.values()));
  }

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    // Re-emit online users when someone joins a room
    if (socket.user) {
      io.emit('online-users', Array.from(onlineUsers.values()));
    }
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
  });

  socket.on('send-message', async (data) => {
    try {
      const { roomId, content } = data;
      
      if (!socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const message = await prisma.chatMessage.create({
        data: {
          content,
          roomId,
          authorId: socket.user.id,
        },
        include: {
          author: { select: { id: true, name: true, avatar: true } },
        },
      });

      io.to(roomId).emit('new-message', message);
    } catch (error) {
      console.error('Socket message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('send-dm', async (data) => {
    try {
      const { recipientId, content } = data;
      
      if (!socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const sortedIds = [socket.user.id, recipientId].sort();
      const roomName = `dm:${sortedIds[0]}:${sortedIds[1]}`;

      let room = await prisma.chatRoom.findUnique({
        where: { name: roomName },
      });

      if (!room) {
        room = await prisma.chatRoom.create({
          data: {
            name: roomName,
            topic: 'Direct Message',
          },
        });
      }

      const message = await prisma.chatMessage.create({
        data: {
          content,
          roomId: room.id,
          authorId: socket.user.id,
        },
        include: {
          author: { select: { id: true, name: true, avatar: true } },
        },
      });

      // Emit to both users' personal rooms
      io.to(`user:${socket.user.id}`).to(`user:${recipientId}`).emit('new-dm', {
        ...message,
        roomId: room.id,
        roomName: room.name,
      });
    } catch (error) {
      console.error('DM error:', error);
      socket.emit('error', { message: 'Failed to send DM' });
    }
  });

  socket.on('typing', (data) => {
    const { roomId, isTyping } = data;
    if (socket.user) {
      socket.to(roomId).emit('user-typing', {
        userId: socket.user.id,
        userName: socket.user.name,
        isTyping,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.user) {
      onlineUsers.delete(socket.user.id);
      io.emit('online-users', Array.from(onlineUsers.values()));
    }
  });
});

const isAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { email: true },
    });
    
    if (user?.email === ADMIN_EMAIL) {
      req.isAdmin = true;
      return next();
    }
    
    res.status(403).json({ message: 'Admin only' });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

app.delete('/api/admin/chat/clear/:roomId', isAdmin, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    await prisma.chatMessage.deleteMany({
      where: { roomId },
    });
    
    io.to(roomId).emit('messages-cleared', { roomId });
    
    res.json({ message: 'Chat cleared successfully' });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/admin/make-admin', isAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'admin' },
    });
    res.json({ message: 'User promoted to admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Routes - MUST come after CORS
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'DevBlog API is running', status: 'OK', phase: '3' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Socket.IO ready for real-time chat');
});