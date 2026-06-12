const prisma = require('../config/database');

const getRooms = async (req, res) => {
  try {
    const rooms = await prisma.chatRoom.findMany({
      where: {
        NOT: {
          name: {
            startsWith: 'dm:',
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(rooms);
  } catch (error) {
    console.error('getRooms error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Try to find room by ID first, then by name (for DM rooms)
    let room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      room = await prisma.chatRoom.findUnique({
        where: { name: roomId },
      });
    }

    // If room doesn't exist (DM first time), create it
    if (!room) {
      room = await prisma.chatRoom.create({
        data: {
          name: roomId,
          topic: roomId.startsWith('dm:') ? 'Direct Message' : 'General',
        },
      });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { roomId: room.id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
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
    const room = await prisma.chatRoom.create({
      data: { name, topic },
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

    if (global.io) {
      global.io.to(message.roomId).emit('message-deleted', { messageId });
    }

    res.json({ message: 'Message deleted', messageId });
  } catch (error) {
    console.error('deleteMessage error:', error);
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

    if (global.io) {
      global.io.to(room.id).emit('messages-cleared', { roomId: room.id });
    }

    res.json({ message: 'All messages cleared' });
  } catch (error) {
    console.error('clearRoomMessages error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRooms, getMessages, getDMHistory, createRoom, deleteMessage, clearRoomMessages };