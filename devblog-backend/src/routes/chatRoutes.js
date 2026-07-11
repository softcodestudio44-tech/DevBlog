const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getRooms, getMessages, getDMHistory, createRoom, deleteMessage, clearRoomMessages, sendDirectMessage, markMessagesAsRead, cleanupUUIDRooms } = require('../controllers/chatController');

router.get('/rooms', getRooms);
router.get('/rooms/:roomId/messages', getMessages);
router.get('/dm-history', protect, getDMHistory);
router.post('/rooms', protect, createRoom);
router.post('/dm', protect, sendDirectMessage);
router.post('/messages/read', protect, markMessagesAsRead);
router.delete('/messages/:messageId', protect, deleteMessage);
router.delete('/rooms/:roomId/clear', protect, clearRoomMessages);

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
