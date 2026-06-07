const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getRooms, getMessages, getDMHistory, createRoom, clearRoomMessages } = require('../controllers/chatController');

router.get('/rooms', getRooms);
router.get('/rooms/:roomId/messages', getMessages);
router.get('/dm-history', protect, getDMHistory);
router.post('/rooms', protect, createRoom);
router.delete('/rooms/:roomId/clear', protect, clearRoomMessages);

module.exports = router;