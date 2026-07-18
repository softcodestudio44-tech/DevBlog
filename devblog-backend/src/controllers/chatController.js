const prisma = require('../config/database');

// Helper function to add cache-busting to avatar URLs
const addCacheBust = (user) => {
  if (user && user.avatar && user.updatedAt) {
    const timestamp = new Date(user.updatedAt).getTime();
    user.avatar = `${user.avatar}?v=${timestamp}`;
  }
  return user;
};

const DEFAULT_ROOMS = [
  { name: 'general', topic: 'General discussion for all developers' },
  { name: 'javascript', topic: 'JavaScript, TypeScript, Node.js' },
  { name: 'react', topic: 'React, Next.js, Frontend frameworks' },
  { name: 'backend', topic: 'APIs, Databases, Server architecture' },
  { name: 'career', topic: 'Jobs, interviews, career advice' },
  { name: 'showcase', topic: 'Show off your projects' },
];

// UUID regex pattern to detect rooms created with UUIDs as names
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ensureDefaultRooms = async () => {
  for (const room of DEFAULT_ROOMS) {
    const existing = await prisma.chatRoom.findUnique({
      where: { name: room.name },
    });
    if (!existing) {
      await prisma.chatRoom.create({ data: room });
      console.log(`Created default room: ${room.name}`);
    }
  }
};

// Clean up any rooms that were accidentally created with UUIDs as names
const cleanupUUIDRooms = async () => {
  const allRooms = await prisma.chatRoom.findMany({
    where: {
      NOT: { name: { startsWith: 'dm:' } },
    },
    select: { id: true, name: true },
  });

  const uuidRooms = allRooms.filter(room => UUID_PATTERN.test(room.name));
  
  for (const room of uuidRooms) {
    // Delete messages first, then the room
    await prisma.chatMessage.deleteMany({ where: { roomId: room.id } });
    await prisma.chatRoom.delete({ where: { id: room.id } });
    console.log(`Deleted UUID room: ${room.name} (${room.id})`);
  }
  
  return uuidRooms.length;
};

const markMessagesAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomName } = req.body;

    if (!roomName) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const room = await prisma.chatRoom.findUnique({ where: { name: roomName } });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const unreadMessages = await prisma.chatMessage.findMany({
      where: {
        roomId: room.id,
        authorId: { not: userId },
        readAt: null,
      },
      select: { id: true, authorId: true },
    });

    if (!unreadMessages.length) {
      return res.json({ message: 'No unread messages', messageIds: [] });
    }

    const now = new Date();
    await prisma.chatMessage.updateMany({
      where: {
        id: { in: unreadMessages.map((message) => message.id) },
        authorId: { not: userId },
      },
      data: { readAt: now },
    });

    const io = req.app?.get('io') || global.io;
    if (io) {
      const senderIds = [...new Set(unreadMessages.map((message) => message.authorId).filter(Boolean))];
      senderIds.forEach((senderId) => {
        io.to(`user:${senderId}`).emit('messages-read', {
          roomName,
          messageIds: unreadMessages.map((message) => message.id),
          readBy: userId,
        });
      });
    }

    res.json({ message: 'Messages marked as read', messageIds: unreadMessages.map((message) => message.id) });
  } catch (error) {
    console.error('markMessagesAsRead error:', error);
    res.status(500).json({ message: error.message });
  }
};

const sendDirectMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { recipientId, content } = req.body;

    if (!recipientId || !content?.trim()) {
      return res.status(400).json({ message: 'Recipient and content are required' });
    }

    const sortedIds = [senderId, recipientId].sort();
    const roomName = `dm:${sortedIds[0]}:${sortedIds[1]}`;

    let room = await prisma.chatRoom.findUnique({ where: { name: roomName } });
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
        content: content.trim(),
        roomId: room.id,
        authorId: senderId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Add cache-busting to author avatar
    addCacheBust(message.author);

    const io = req.app?.get('io') || global.io;
    if (io) {
      io.to(`user:${senderId}`).to(`user:${recipientId}`).emit('new-dm', {
        ...message,
        roomId: room.id,
        roomName: room.name,
      });
    }

    res.json({ ...message, roomId: room.id, roomName: room.name });
  } catch (error) {
    console.error('sendDirectMessage error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getRooms = async (req, res) => {
  try {
    // Ensure default rooms exist before returning the list
    await ensureDefaultRooms();

    // Clean up any UUID-named rooms that were accidentally created
    await cleanupUUIDRooms();

    const rooms = await prisma.chatRoom.findMany({
      where: {
        NOT: { name: { startsWith: 'dm:' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Also filter out any rooms with UUID-looking names in memory as a safety net
    const validRooms = rooms.filter(room => !UUID_PATTERN.test(room.name));

    res.json(validRooms);
  } catch (error) {
    console.error('getRooms error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Try to find room by ID first
    let room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    // If not found by ID, try by name (for DM rooms)
    if (!room) {
      room = await prisma.chatRoom.findUnique({
        where: { name: roomId },
      });
    }

    // If room still not found AND is a DM pattern, create it
    if (!room && roomId.startsWith('dm:')) {
      room = await prisma.chatRoom.create({
        data: {
          name: roomId,
          topic: 'Direct Message',
        },
      });
    }

    // If room doesn't exist at all, return 404 instead of auto-creating with a UUID name
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: room.id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Add cache-busting to author avatars
    messages.forEach(message => {
      if (message.author) {
        addCacheBust(message.author);
      }
    });

    res.json(messages);
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get DM conversation partners for current user
const getDMHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all DM rooms where this user is actually a participant.
    // Room names are formatted as "dm:<idA>:<idB>" (sorted), so we
    // only match rooms where userId appears as idA or idB — not
    // every "dm:" room in the database.
    const dmRooms = await prisma.chatRoom.findMany({
      where: {
        AND: [
          { name: { startsWith: 'dm:' } },
          {
            OR: [
              { name: { startsWith: `dm:${userId}:` } },
              { name: { endsWith: `:${userId}` } },
            ],
          },
        ],
      },
      include: {
        messages: {
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 1, // Get latest message for preview
        },
      },
    });

    // Extract other user IDs from DM room names (dm:user1:user2)
    const dmPartners = [];

    for (const room of dmRooms) {
      const parts = room.name.split(':');
      if (parts.length === 3) {
        const [, idA, idB] = parts;

        // Double-check this room actually belongs to the current user
        if (idA !== userId && idB !== userId) continue;

        const otherId = idA === userId ? idB : idA;
        if (!otherId || otherId === userId) continue;

        // Get user info
        const otherUser = await prisma.user.findUnique({
          where: { id: otherId },
          select: { id: true, name: true, avatar: true },
        });

        if (otherUser) {
          addCacheBust(otherUser);

          dmPartners.push({
            id: otherUser.id,
            name: otherUser.name,
            avatar: otherUser.avatar,
            roomName: room.name,
            lastMessage: room.messages[0]?.content || '',
            lastMessageAt: room.messages[0]?.createdAt || null,
          });
        }
      }
    }

    // Sort by most recent message first
    dmPartners.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    res.json(dmPartners);
  } catch (error) {
    console.error('getDMHistory error:', error);
    res.status(500).json({ message: error.message });
  }
};

const createRoom = async (req, res) => {
  try {
    const { name, topic } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const trimmedName = name.trim().toLowerCase();

    // Prevent UUID-named rooms from being created
    if (UUID_PATTERN.test(trimmedName)) {
      return res.status(400).json({ message: 'Invalid room name: cannot use UUID format' });
    }

    // Prevent rooms with "dm:" prefix from being created via this endpoint
    if (trimmedName.startsWith('dm:')) {
      return res.status(400).json({ message: 'Invalid room name: cannot use dm: prefix' });
    }

    const existing = await prisma.chatRoom.findUnique({
      where: { name: trimmedName },
    });
    if (existing) {
      return res.status(409).json({ message: 'Room already exists' });
    }

    const room = await prisma.chatRoom.create({
      data: { name: trimmedName, topic: topic?.trim() || '' },
    });
    res.json(room);
  } catch (error) {
    console.error('createRoom error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await prisma.chatMessage.delete({ where: { id: messageId } });

    const io = req.app?.get('io') || global.io;
    if (io) {
      io.to(message.roomId).emit('message-deleted', { messageId });
    }

    res.json({ message: 'Message deleted', messageId });
  } catch (error) {
    console.error('deleteMessage error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: Delete an entire room and its messages
const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Prevent deleting DM rooms
    if (room.name.startsWith('dm:')) {
      return res.status(400).json({ message: 'Cannot delete DM rooms' });
    }

    await prisma.chatMessage.deleteMany({
      where: { roomId: room.id },
    });

    await prisma.chatRoom.delete({
      where: { id: room.id },
    });

    const io = req.app?.get('io') || global.io;
    if (io) {
      io.to(room.id).emit('room-deleted', { roomId: room.id, roomName: room.name });
    }

    res.json({ message: 'Room deleted', roomId: room.id });
  } catch (error) {
    console.error('deleteRoom error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin: Clear all messages in a room
const clearRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    await prisma.chatMessage.deleteMany({
      where: { roomId: room.id },
    });

    const io = req.app?.get('io') || global.io;
    if (io) {
      io.to(room.id).emit('messages-cleared', { roomId: room.id });
    }

    res.json({ message: 'All messages cleared' });
  } catch (error) {
    console.error('clearRoomMessages error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRooms, getMessages, getDMHistory, createRoom, deleteRoom, deleteMessage, clearRoomMessages, sendDirectMessage, markMessagesAsRead, ensureDefaultRooms, cleanupUUIDRooms };