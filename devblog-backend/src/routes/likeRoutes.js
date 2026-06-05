const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { toggleLike, getLikesCount } = require('../controllers/likeController');

router.get('/:postId', getLikesCount); // Public: get like count
router.post('/:postId', protect, toggleLike); // Protected: toggle like

module.exports = router;