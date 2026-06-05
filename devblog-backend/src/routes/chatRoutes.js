const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getRooms, getMessages, createRoom, clearRoomMessages } = require('../controllers/chatController');

router.get('/rooms', getRooms);
router.get('/rooms/:roomId/messages', getMessages);
router.post('/rooms', protect, createRoom);
router.delete('/rooms/:roomId/clear', protect, clearRoomMessages); // Admin clear

module.exports = router;