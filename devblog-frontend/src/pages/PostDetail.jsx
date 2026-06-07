import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Tag, ArrowLeft, Heart, MessageCircle, Trash2, Image as ImageIcon, Send } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import GlassCard from '../components/GlassCard';
import LikeButton from '../components/LikeButton';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    fetchPostAndComments();
  }, [id]);

  useEffect(() => {
    if (socket) {
      socket.on('new-comment', (comment) => {
        if (comment.postId === id) {
          setComments(prev => {
            const exists = prev.find(c => c.id === comment.id);
            if (exists) return prev;
            return [...prev, comment];
          });
        }
      });

      return () => {
        socket.off('new-comment');
      };
    }
  }, [socket, id]);

  const fetchPostAndComments = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        api.get(`/posts/${id}`),
        api.get(`/posts/${id}/comments`)
      ]);

      setPost(postRes.data);
      setComments(commentsRes.data || []);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await api.delete(`/posts/${id}`);
      navigate('/');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete post');
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const response = await api.post(`/posts/${id}/comments`, {
        content: newComment.trim(),
      });

      setComments(prev => [...prev, response.data]);
      setNewComment('');
    } catch (error) {
      console.error('Comment error:', error);
      alert('Failed to post comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isAuthor = user?.id === post?.authorId;
  const isAdmin = user?.role === 'admin' || user?.email === 'softcodestudio44@gmail.com';

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
          <p className="text-white/60 text-lg">Post not found</p>
          <Link to="/" className="text-emerald-400 hover:underline mt-4 inline-block">
            Go back home
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/50 hover:text-emerald-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to posts
            </Link>

            {(isAuthor || isAdmin) && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>

          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              {post.author?.avatar ? (
                <img 
                  src={post.author.avatar} 
                  alt={post.author.name} 
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30" 
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg font-bold text-white">
                  {post.author?.name?.[0] || 'U'}
                </div>
              )}
              <div>
                <Link to={`/user/${post.authorId}`} className="font-medium hover:text-emerald-300 transition-colors">
                  {post.author?.name || 'Unknown'}
                </Link>
                <div className="flex items-center gap-1 text-sm text-white/40">
                  <Clock className="w-3 h-3" />
                  {formatDate(post.createdAt)}
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-6">{post.title}</h1>

            {/* Post Images */}
            {post.images && post.images.length > 0 && (
              <div className="mb-6 space-y-3">
                {post.images.map((img, i) => (
                  <img 
                    key={i} 
                    src={img} 
                    alt={`Post image ${i + 1}`} 
                    className="w-full rounded-xl object-cover max-h-[500px]" 
                    loading="lazy"
                  />
                ))}
              </div>
            )}

            <div className="prose prose-invert max-w-none mb-6">
              <p className="text-white/70 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/10 flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap">
                {post.tags?.map((tag) => (
                  <span key={tag} className="tag flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <LikeButton postId={post.id} initialCount={post.likeCount || 0} />
                <div className="flex items-center gap-2 text-white/50">
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">{comments.length || 0}</span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Comments Section */}
          <div className="mt-6">
            <GlassCard>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                Comments ({comments.length})
              </h3>

              {/* Comment Form */}
              {user && (
                <form onSubmit={handleCommentSubmit} className="mb-6">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="input-glass resize-none min-h-[80px]"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={commentLoading || !newComment.trim()}
                      className="self-end w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-30 shadow-lg shadow-emerald-500/20"
                    >
                      {commentLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-white/30 text-center py-8">No comments yet. Be the first to comment!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      {comment.author?.avatar ? (
                        <img 
                          src={comment.author.avatar} 
                          alt={comment.author.name} 
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {comment.author?.name?.[0] || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white/80">
                            {comment.author?.name || 'Unknown'}
                          </span>
                          <span className="text-xs text-white/30">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-white/60 break-words">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PostDetail;