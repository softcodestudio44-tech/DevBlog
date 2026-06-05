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

    // Try to find room by ID first, then by name
    let room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
    });

    // If not found by ID, try by name (for DM rooms)
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

    res.json({ message: 'All messages cleared' });
  } catch (error) {
    console.error('clearRoomMessages error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getRooms, getMessages, createRoom, clearRoomMessages };