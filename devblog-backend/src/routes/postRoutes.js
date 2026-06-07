const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getAllPosts, getPostById, createPost, deletePost, uploadPostImages } = require('../controllers/postController');

router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/', protect, createPost);
router.delete('/:id', protect, deletePost);
router.post('/upload-images', protect, upload.array('images', 5), uploadPostImages);

module.exports = router;