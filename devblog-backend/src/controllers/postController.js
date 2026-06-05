const prisma = require('../config/database');

const getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get counts manually for CockroachDB compatibility
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
    console.error('getAllPosts error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPostById = async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    if (!post) return res.status(404).json({ message: 'Post not found' });

    const likeCount = await prisma.like.count({ where: { postId: post.id } });
    const commentCount = await prisma.comment.count({ where: { postId: post.id } });

    res.json({
      ...post,
      likeCount,
      commentCount,
    });
  } catch (error) {
    console.error('getPostById error:', error);
    res.status(500).json({ message: error.message });
  }
};

const createPost = async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const post = await prisma.post.create({
      data: {
        title,
        content,
        tags: tags || [],
        authorId: req.user.id,
      },
      include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    res.status(201).json({ message: 'Post created', post });
  } catch (error) {
    console.error('createPost error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await prisma.post.delete({ where: { id: req.params.id } });
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('deletePost error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllPosts, getPostById, createPost, deletePost };