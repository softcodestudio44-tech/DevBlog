const prisma = require('../config/database');
const { cloudinary } = require('../config/cloudinary'); // ADD THIS LINE

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
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const postCount = await prisma.post.count({ where: { authorId: id } });
    const likeCount = await prisma.like.count({ where: { userId: id } });
    const commentCount = await prisma.comment.count({ where: { authorId: id } });

    res.json({
      ...user,
      postCount,
      likeCount,
      commentCount
    });
  } catch (error) {
    console.error('getUserProfile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, bio, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, bio, avatar },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        role: true
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
    const posts = await prisma.post.findMany({
      where: { authorId: id },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const likeCount = await prisma.like.count({ where: { postId: post.id } });
        const commentCount = await prisma.comment.count({ where: { postId: post.id } });
        return {
          ...post,
          likeCount,
          commentCount,
        };
      })
    );

    res.json(postsWithCounts);
  } catch (error) {
    console.error('getUserPosts error:', error);
    res.status(500).json({ message: error.message });
  }
};

// FIXED: Upload buffer to Cloudinary, then save URL
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'devblog-avatars',
          transformation: [{ width: 400, height: 400, crop: 'fill' }],
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Save Cloudinary URL to database
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: result.secure_url },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        role: true,
      },
    });

    res.json({ message: 'Avatar uploaded', user });
  } catch (error) {
    console.error('uploadAvatar error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUserProfile, updateProfile, getUserPosts, uploadAvatar };