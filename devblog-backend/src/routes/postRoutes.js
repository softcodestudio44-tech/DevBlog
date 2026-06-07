const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAllPosts, getPostById, createPost, deletePost } = require('../controllers/postController');
const { getComments, createComment, deleteComment } = require('../controllers/commentController');

// Post routes
router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/', protect, createPost);
router.delete('/:id', protect, deletePost);

// Nested comment routes under posts
router.get('/:postId/comments', getComments);
router.post('/:postId/comments', protect, createComment);
router.delete('/:postId/comments/:id', protect, deleteComment);

module.exports = router;