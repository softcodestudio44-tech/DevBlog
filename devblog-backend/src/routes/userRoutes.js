const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary'); // ADD THIS LINE
const { getUserProfile, updateProfile, getUserPosts, uploadAvatar } = require('../controllers/userController');

router.get('/:id', getUserProfile);
router.get('/:id/posts', getUserPosts);
router.put('/profile', protect, updateProfile);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar); // UNCOMMENTED

module.exports = router;