const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getComments, createComment, deleteComment } = require('../controllers/commentController');

router.get('/:postId', getComments);
router.post('/:postId', protect, createComment);
router.delete('/:id', protect, deleteComment);

module.exports = router;