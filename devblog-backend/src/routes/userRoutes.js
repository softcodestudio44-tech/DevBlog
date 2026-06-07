const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { 
  getUserProfile, 
  updateProfile, 
  getUserPosts, 
  uploadAvatar, 
  followUser, 
  unfollowUser 
} = require('../controllers/userController');
const upload = require('../middleware/upload');

// Get user profile - protected so isFollowing works
router.get('/:id', protect, getUserProfile);

// Get user posts - public
router.get('/:id/posts', getUserPosts);

// Update profile - protected
router.put('/profile', protect, updateProfile);

// Upload avatar - protected
router.post('/avatar', protect, upload.single('avatar'), uploadAvatar);

// Follow/unfollow - protected
router.post('/:id/follow', protect, followUser);
router.post('/:id/unfollow', protect, unfollowUser);

module.exports = router;