require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const likeRoutes = require('./routes/likeRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const { prisma, withReconnect } = require('./config/database');
const { ADMIN_EMAIL } = require('./config/constants');

const app = express();
const server = http.createServer(app);

// CORS allowed origins
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://softcode-devblog.vercel.app',
  'https://dev-blog-4bnsqfhgm-softcodestudios-projects.vercel.app'
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

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
let redisConnected = false;

const connectRedis = async () => {
  try {
    const pubClient = createClient({ 
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: {
          maxRetriesPerRequest: 3
        }
      }
    });
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => {
      console.error('❌ Redis pubClient error:', err.message);
      redisConnected = false;
    });

    subClient.on('error', (err) => {
      console.error('❌ Redis subClient error:', err.message);
      redisConnected = false;
    });

    pubClient.on('connect', () => {
      console.log('✅ Redis pubClient connected');
      redisConnected = true;
    });

    subClient.on('connect', () => {
      console.log('✅ Redis subClient connected');
      redisConnected = true;
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Socket.IO Redis adapter connected - Multi-server mode enabled');
    return true;
  } catch (err) {
    console.error('⚠️ Socket.IO Redis adapter failed to connect:', err.message);
    console.log('ℹ️  Socket.IO running in single-server mode (no Redis)');
    redisConnected = false;
    return false;
  }
};

// Initial Redis connection
connectRedis();

// Retry Redis connection every 30 seconds
setInterval(async () => {
  if (!redisConnected) {
    console.log('🔄 Attempting to reconnect Redis...');
    await connectRedis();
  }
}, 30000);

// Make io accessible globally for notification controller
app.set('io', io);
global.io = io;

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
    const user = await withReconnect(prisma.user.findUnique, {
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
    onlineUsers.set(socket.user.id, {
      ...socket.user,
      socketId: socket.id,
    });
    io.emit('online-users', Array.from(onlineUsers.values()));
    io.to(`user:${socket.user.id}`).emit('presence-update', {
      userId: socket.user.id,
      online: true,
      lastSeen: null,
    });
  }

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
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

      const message = await withReconnect(prisma.chatMessage.create, {
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

      let room = await withReconnect(prisma.chatRoom.findUnique, {
        where: { name: roomName },
      });

      if (!room) {
        room = await withReconnect(prisma.chatRoom.create, {
          data: {
            name: roomName,
            topic: 'Direct Message',
          },
        });
      }

      const message = await withReconnect(prisma.chatMessage.create, {
        data: {
          content,
          roomId: room.id,
          authorId: socket.user.id,
        },
        include: {
          author: { select: { id: true, name: true, avatar: true } },
        },
      });

      io.to(`user:${socket.user.id}`).to(`user:${recipientId}`).emit('new-dm', {
        ...message,
        roomId: room.id,
        roomName: room.name,
      });

      // Create notification for DM recipient
      const { createNotification } = require('./controllers/notificationController');
      await createNotification({
        userId: recipientId,
        type: 'message',
        message: `${socket.user.name} sent you a message`,
        actorId: socket.user.id,
        sourceId: room.id,
        sourceType: 'chat',
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

  socket.on('mark-as-read', async (data) => {
    try {
      const { roomName } = data;
      if (!socket.user || !roomName) return;

      const room = await withReconnect(prisma.chatRoom.findUnique, { where: { name: roomName } });
      if (!room) return;

      const unreadMessages = await withReconnect(prisma.chatMessage.findMany, {
        where: {
          roomId: room.id,
          authorId: { not: socket.user.id },
          readAt: null,
        },
        select: { id: true, authorId: true },
      });

      if (!unreadMessages.length) return;

      const now = new Date();
      await withReconnect(prisma.chatMessage.updateMany, {
        where: {
          id: { in: unreadMessages.map((message) => message.id) },
          authorId: { not: socket.user.id },
        },
        data: { readAt: now },
      });

      const senderIds = [...new Set(unreadMessages.map((message) => message.authorId).filter(Boolean))];
      senderIds.forEach((senderId) => {
        io.to(`user:${senderId}`).emit('messages-read', {
          roomName,
          messageIds: unreadMessages.map((message) => message.id),
          readBy: socket.user.id,
        });
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (socket.user) {
      onlineUsers.delete(socket.user.id);
      io.emit('online-users', Array.from(onlineUsers.values()));
      io.to(`user:${socket.user.id}`).emit('presence-update', {
        userId: socket.user.id,
        online: false,
        lastSeen: new Date().toISOString(),
      });
    }
  });
});

const isAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await withReconnect(prisma.user.findUnique, {
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

    await withReconnect(prisma.chatMessage.deleteMany, {
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
    await withReconnect(prisma.user.update, {
      where: { id: userId },
      data: { role: 'admin' },
    });
    res.json({ message: 'User promoted to admin' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Stats endpoint for homepage
app.get('/api/stats', async (req, res) => {
  try {
    const [posts, users, likes] = await Promise.all([
      withReconnect(prisma.post.count),
      withReconnect(prisma.user.count),
      withReconnect(prisma.like.count),
    ]);
    res.json({ posts, users, likes });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Routes - MUST come after CORS
app.get('/api/health', async (req, res) => {
  try {
    const isHealthy = await withReconnect(prisma.$queryRaw, `SELECT 1`);
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/likes', likeRoutes);
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