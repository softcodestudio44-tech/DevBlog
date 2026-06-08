const prisma = require('../config/database');
const { cloudinary } = require('../config/cloudinary');

const getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { isDraft: false },
      include: {
        author: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
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

    if (post.isDraft && (!req.user || req.user.id !== post.authorId)) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likeCount = await prisma.like.count({ where: { postId: post.id } });
    const commentCount = await prisma.comment.count({ where: { postId: post.id } });

    res.json({ ...post, likeCount, commentCount });
  } catch (error) {
    console.error('getPostById error:', error);
    res.status(500).json({ message: error.message });
  }
};

const createPost = async (req, res) => {
  try {
    const { title, content, tags, images } = req.body;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        tags: tags || [],
        images: images || [],
        isDraft: false,
        authorId: req.user.id,
      },
      include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    const postWithCounts = { ...post, likeCount: 0, commentCount: 0 };

    // Emit socket event for real-time feed updates
    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit('new-post', { post: postWithCounts });
    }

    res.status(201).json({ message: 'Post created', post: postWithCounts });
  } catch (error) {
    console.error('createPost error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, images } = req.body;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isAdmin = req.user.role === 'admin' || req.user.email === 'softcodestudio44@gmail.com';
    if (post.authorId !== req.user.id && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { title, content, tags: tags || [], images: images || [] },
      include: { author: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    const likeCount = await prisma.like.count({ where: { postId: id } });
    const commentCount = await prisma.comment.count({ where: { postId: id } });
    const postWithCounts = { ...updated, likeCount, commentCount };

    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit('post-updated', { post: postWithCounts });
    }

    res.json({ message: 'Post updated', post: postWithCounts });
  } catch (error) {
    console.error('updatePost error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isAdmin = req.user.role === 'admin' || req.user.email === 'softcodestudio44@gmail.com';
    if (post.authorId !== req.user.id && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await prisma.post.delete({ where: { id: req.params.id } });

    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit('post-deleted', { postId: req.params.id });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('deletePost error:', error);
    res.status(500).json({ message: error.message });
  }
};

const uploadPostImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const uploadPromises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'devblog-posts',
            transformation: [{ width: 1200, crop: 'limit' }],
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );
        uploadStream.end(file.buffer);
      });
    });

    const imageUrls = await Promise.all(uploadPromises);
    res.json({ images: imageUrls });
  } catch (error) {
    console.error('uploadPostImages error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllPosts, getPostById, createPost, updatePost, deletePost, uploadPostImages };