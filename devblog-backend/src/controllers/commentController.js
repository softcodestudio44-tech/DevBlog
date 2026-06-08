const prisma = require('../config/database');
const { createNotification } = require('./notificationController');

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, avatar: true } },
            replies: {
              include: {
                author: { select: { id: true, name: true, avatar: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, parentId } = req.body;

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: req.user.id,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Notify post author
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, title: true },
    });

    if (post && post.authorId !== req.user.id) {
      const type = parentId ? 'reply' : 'comment';
      const message = parentId
        ? `${req.user.name} replied to your comment on "${post.title.substring(0, 25)}${post.title.length > 25 ? '...' : ''}"`
        : `${req.user.name} commented on your post "${post.title.substring(0, 25)}${post.title.length > 25 ? '...' : ''}"`;

      await createNotification({
        userId: post.authorId,
        type,
        message,
        sourceId: postId,
        sourceType: 'post',
        actorId: req.user.id,
      });
    }

    // Emit socket event for real-time comment updates
    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit('new-comment', { postId, comment });
    }

    res.status(201).json({ message: 'Comment added', comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { post: { select: { authorId: true } } }
    });

    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isCommentAuthor = comment.authorId === req.user.id;
    const isPostOwner = comment.post.authorId === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.email === 'softcodestudio44@gmail.com';

    if (!isCommentAuthor && !isPostOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await prisma.comment.delete({ where: { id } });

    // Emit socket event for real-time comment deletion
    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit('comment-deleted', { postId: comment.postId, commentId: id });
    }

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getComments, createComment, deleteComment };