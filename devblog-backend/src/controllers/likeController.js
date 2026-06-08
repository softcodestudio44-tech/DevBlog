const prisma = require('../config/database');
const { createNotification } = require('./notificationController');

const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const existingLike = await prisma.like.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      // Emit socket event for real-time like count update
      const io = req.app.get('io') || global.io;
      if (io) {
        io.emit('post-liked', { postId, userId, action: 'unlike' });
      }

      res.json({ message: 'Post unliked', liked: false });
    } else {
      await prisma.like.create({
        data: { postId, userId },
      });

      // Notify post author
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true, title: true },
      });

      if (post && post.authorId !== userId) {
        await createNotification({
          userId: post.authorId,
          type: 'like',
          message: `${req.user.name} liked your post "${post.title.substring(0, 30)}${post.title.length > 30 ? '...' : ''}"`,
          sourceId: postId,
          sourceType: 'post',
          actorId: userId,
        });
      }

      // Emit socket event for real-time like count update
      const io = req.app.get('io') || global.io;
      if (io) {
        io.emit('post-liked', { postId, userId, action: 'like' });
      }

      res.json({ message: 'Post liked', liked: true });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getLikesCount = async (req, res) => {
  try {
    const { postId } = req.params;
    const count = await prisma.like.count({ where: { postId } });
    const userLiked = req.user
      ? !!(await prisma.like.findUnique({
          where: { postId_userId: { postId, userId: req.user.id } },
        }))
      : false;
    res.json({ count, userLiked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { toggleLike, getLikesCount };