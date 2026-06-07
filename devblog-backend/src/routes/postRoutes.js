const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  getAllPosts, 
  getPostById, 
  createPost, 
  deletePost, 
  uploadPostImages 
} = require('../controllers/postController');
const upload = require('../middleware/upload');

router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/', protect, createPost);
router.delete('/:id', protect, deletePost);

// Upload images - uses multer array for multiple files
router.post('/upload-images', protect, upload.array('images', 10), uploadPostImages);

module.exports = router;