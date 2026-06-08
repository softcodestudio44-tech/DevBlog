const prisma = require('../config/database');
const { cloudinary } = require('../config/cloudinary');

const ADMIN_EMAIL = 'softcodestudio44@gmail.com';

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
        github: true,
        twitter: true,
        linkedin: true,
        website: true,
        tiktok: true,
        facebook: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isAdmin = user.email === ADMIN_EMAIL || user.role === 'admin';

    // Count only published posts
    const postCount = await prisma.post.count({ 
      where: { authorId: id, isDraft: false } 
    });

    // Count likes on published posts
    const userPosts = await prisma.post.findMany({
      where: { authorId: id, isDraft: false },
      select: { id: true }
    });
    const postIds = userPosts.map(p => p.id);
    const totalLikesReceived = postIds.length > 0 
      ? await prisma.like.count({ where: { postId: { in: postIds } } })
      : 0;

    const commentCount = await prisma.comment.count({ where: { authorId: id } });
    const followersCount = await prisma.follow.count({ where: { followingId: id } });
    const followingCount = await prisma.follow.count({ where: { followerId: id } });

    let isFollowing = false;
    if (req.user && req.user.id !== id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: req.user.id,
            followingId: id
          }
        }
      });
      isFollowing = !!follow;
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        follower: { select: { id: true, name: true, avatar: true } }
      }
    });

    const following = await prisma.follow.findMany({
      where: { followerId: id },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        following: { select: { id: true, name: true, avatar: true } }
      }
    });

    res.json({
      ...user,
      isAdmin,
      postCount,
      likeCount: totalLikesReceived,
      commentCount,
      followersCount,
      followingCount,
      isFollowing,
      followersList: followers.map(f => f.follower),
      followingList: following.map(f => f.following),
    });
  } catch (error) {
    console.error('getUserProfile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, bio, avatar, github, twitter, linkedin, website, tiktok, facebook } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, bio, avatar, github, twitter, linkedin, website, tiktok, facebook },
      select: {
        id: true, name: true, email: true, avatar: true, bio: true, role: true,
        github: true, twitter: true, linkedin: true, website: true, tiktok: true, facebook: true,
      }
    });
    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const { id } = req.params;

    // Only show published posts on public profile
    // If viewing own profile, show drafts too
    const whereClause = { authorId: id };
    if (!req.user || req.user.id !== id) {
      whereClause.isDraft = false;
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const likeCount = await prisma.like.count({ where: { postId: post.id } });
        const commentCount = await prisma.comment.count({ where: { postId: post.id } });
        return { ...post, likeCount, commentCount };
      })
    );

    res.json(postsWithCounts);
  } catch (error) {
    console.error('getUserPosts error:', error);
    res.status(500).json({ message: error.message });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'devblog-avatars', transformation: [{ width: 400, height: 400, crop: 'fill' }], resource_type: 'image' },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      uploadStream.end(req.file.buffer);
    });

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: result.secure_url },
      select: { id: true, name: true, email: true, avatar: true, bio: true, role: true,
        github: true, twitter: true, linkedin: true, website: true, tiktok: true, facebook: true },
    });

    res.json({ message: 'Avatar uploaded', user });
  } catch (error) {
    console.error('uploadAvatar error:', error);
    res.status(500).json({ message: error.message });
  }
};

const followUser = async (req, res) => {
  try {
    const { id } = req.params;
    const followerId = req.user.id;
    if (followerId === id) return res.status(400).json({ message: 'Cannot follow yourself' });

    const follow = await prisma.follow.create({
      data: { followerId, followingId: id },
    });

    const { createNotification } = require('./notificationController');
    await createNotification({
      userId: id, type: 'follow', message: `${req.user.name} started following you`, actorId: followerId,
    });

    const io = req.app.get('io');
    if (io) io.emit('follow-update', { followerId, followingId: id, action: 'follow' });

    res.json({ message: 'Followed successfully', follow });
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ message: 'Already following' });
    console.error('Follow error:', error);
    res.status(500).json({ message: error.message });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const followerId = req.user.id;
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId: id } },
    });

    const io = req.app.get('io');
    if (io) io.emit('follow-update', { followerId, followingId: id, action: 'unfollow' });

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUserProfile, updateProfile, getUserPosts, uploadAvatar, followUser, unfollowUser };