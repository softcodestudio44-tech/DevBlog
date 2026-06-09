import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Tag, Heart, MessageCircle, Share2, Trash2, Edit3 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import GlassCard from '../components/GlassCard';
import LikeButton from '../components/LikeButton';
import CommentSection from '../components/CommentSection';
import MarkdownRenderer from '../components/MarkdownRenderer';
import SEO from '../components/SEO';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [id]);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket || !id) return;

    const handlePostUpdated = (data) => {
      if (data.post.id === id) {
        setPost((prev) => ({ ...prev, ...data.post }));
      }
    };

    const handlePostLiked = (data) => {
      if (data.postId === id && post) {
        setPost((prev) => ({
          ...prev,
          likeCount: data.action === 'like'
            ? (prev.likeCount || 0) + 1
            : Math.max(0, (prev.likeCount || 0) - 1),
        }));
      }
    };

    const handleNewComment = (data) => {
      if (data.postId === id && post) {
        setPost((prev) => ({
          ...prev,
          commentCount: (prev.commentCount || 0) + 1,
        }));
      }
    };

    socket.on('post-updated', handlePostUpdated);
    socket.on('post-liked', handlePostLiked);
    socket.on('new-comment', handleNewComment);

    return () => {
      socket.off('post-updated', handlePostUpdated);
      socket.off('post-liked', handlePostLiked);
      socket.off('new-comment', handleNewComment);
    };
  }, [socket, id, post]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/posts/${id}`);
      setPost(response.data);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post?')) return;
    setDeleting(true);
    try {
      await api.delete(`/posts/${id}`);
      navigate('/');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="glass h-96 loading-shimmer rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <GlassCard className="text-center py-12">
          <p className="text-white text-lg">Post not found</p>
          <Link to="/" className="text-lime-400 hover:underline mt-4 inline-block">
            Back to posts
          </Link>
        </GlassCard>
      </div>
    );
  }

  const isAuthor = user && user.id === post.authorId;
  const isAdmin = user && (user.role === 'admin' || user.email === 'softcodestudio44@gmail.com');
  const canDelete = isAuthor || isAdmin;

  return (
    <>
      <SEO title={post.title} description={post.content?.slice(0, 160)} />
      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white hover:text-lime-300 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to posts
            </Link>

            <GlassCard className="mb-8">
              {/* Author info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Link to={`/user/${post.authorId}`}>
                    {post.author?.avatar ? (
                      <img
                        src={post.author.avatar}
                        alt={post.author.name}
                        className="w-10 h-10 rounded-full object-cover border border-lime-500/30"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white">
                        {post.author?.name?.[0] || 'U'}
                      </div>
                    )}
                  </Link>
                  <div>
                    <Link to={`/user/${post.authorId}`} className="text-sm font-medium text-white hover:text-lime-300 transition-colors">
                      {post.author?.name || 'Unknown'}
                    </Link>
                    <div className="flex items-center gap-1 text-xs text-white/60">
                      <Clock className="w-3 h-3" />
                      {formatDate(post.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="p-2 rounded-xl hover:bg-red-500/10 text-white hover:text-red-400 transition-colors"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {isAuthor && (
                    <Link
                      to={`/edit-post/${id}`}
                      className="p-2 rounded-xl hover:bg-white/5 text-white hover:text-lime-300 transition-colors"
                      title="Edit post"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Title with Markdown rendering */}
              <h1 className="text-3xl font-bold mb-4 text-white">
                <MarkdownRenderer content={post.title} />
              </h1>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-6">
                  {post.tags.map((tag) => (
                    <span key={tag} className="tag flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Images */}
              {post.images && post.images.length > 0 && (
                <div className="space-y-4 mb-6">
                  {post.images.map((img, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-white/5">
                      <img
                        src={img}
                        alt={`Post image ${i + 1}`}
                        className="w-full h-auto max-h-[500px] object-contain"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="prose prose-invert max-w-none mb-8">
                <MarkdownRenderer content={post.content} />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                <LikeButton postId={post.id} initialCount={post.likeCount || 0} />
                <button className="flex items-center gap-2 text-white hover:text-lime-300 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{post.commentCount || 0}</span>
                </button>
                <button className="flex items-center gap-2 text-white hover:text-lime-300 transition-colors ml-auto">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm">Share</span>
                </button>
              </div>
            </GlassCard>

            {/* Comments */}
            <CommentSection postId={post.id} postAuthorId={post.authorId} />
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default PostDetail;