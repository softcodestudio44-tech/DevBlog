const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getRooms, getMessages, getDMHistory, createRoom, deleteRoom, deleteMessage, clearRoomMessages, sendDirectMessage, markMessagesAsRead, cleanupUUIDRooms } = require('../controllers/chatController');

const isAdmin = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const { prisma, withReconnect } = require('../config/database');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await withReconnect(prisma.user.findUnique, {
      where: { id: decoded.id },
      select: { email: true, role: true },
    });
    if (user?.role === 'admin' || user?.email === 'softcodestudio44@gmail.com') {
      return next();
    }
    res.status(403).json({ message: 'Admin only' });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/rooms', getRooms);
router.get('/rooms/:roomId/messages', getMessages);
router.get('/dm-history', protect, getDMHistory);
router.post('/rooms', protect, createRoom);
router.post('/dm', protect, sendDirectMessage);
router.post('/messages/read', protect, markMessagesAsRead);
router.delete('/messages/:messageId', protect, deleteMessage);
router.delete('/rooms/:roomId/clear', protect, clearRoomMessages);
router.delete('/rooms/:roomId', protect, isAdmin, deleteRoom);

// Admin: Clean up UUID-named rooms (accidentally created with UUIDs as names)
router.post('/admin/cleanup-uuids', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.email === 'softcodestudio44@gmail.com';
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin only' });
    }
    const deletedCount = await cleanupUUIDRooms();
    res.json({ message: `Cleaned up ${deletedCount} UUID-named rooms`, deletedCount });
  } catch (error) {
    console.error('Cleanup UUID rooms error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
