const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  uploadPostImages,
} = require('../controllers/postController');
const { getComments, createComment, deleteComment } = require('../controllers/commentController');
const upload = require('../middleware/upload');

// Post routes
router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);  // NEW: Edit post
router.delete('/:id', protect, deletePost);

// Image upload
router.post('/upload-images', protect, upload.array('images', 10), uploadPostImages);

// Comment routes (nested under posts)
router.get('/:postId/comments', getComments);
router.post('/:postId/comments', protect, createComment);
router.delete('/:postId/comments/:id', protect, deleteComment);

module.exports = router;