const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { 
  getUserProfile, 
  updateProfile, 
  getUserPosts, 
  uploadAvatar,
  followUser,
  unfollowUser 
} = require('../controllers/userController');

router.get('/:id', getUserProfile);
router.get('/:id/posts', getUserPosts);
router.put('/profile', protect, updateProfile);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);
router.post('/:id/follow', protect, followUser);
router.post('/:id/unfollow', protect, unfollowUser);

module.exports = router;