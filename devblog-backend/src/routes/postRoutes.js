const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAllPosts, getPostById, createPost, deletePost } = require('../controllers/postController');

router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/', protect, createPost);
router.delete('/:id', protect, deletePost);

module.exports = router;