import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, CornerDownRight, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const CommentItem = ({ comment, postId, postAuthorId, onCommentAdded, depth = 0 }) => {
  const { user, isAuthenticated } = useAuth();
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(true);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      const response = await api.post(`/posts/${postId}/comments`, {
        content: replyContent,
        parentId: comment.id,
      });
      const newReply = response.data?.comment;
      if (newReply && comment.replies) {
        comment.replies.push(newReply);
      }
      setReplyContent('');
      setReplying(false);
      onCommentAdded();
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.delete(`/posts/${postId}/comments/${comment.id}`);
      onCommentAdded();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const isCommentAuthor = user && user.id === comment.authorId;
  const isPostOwner = user && user.id === postAuthorId;
  const isAdmin = user && (user.role === 'admin' || user.email === 'softcodestudio44@gmail.com');
  const canDelete = isCommentAuthor || isPostOwner || isAdmin;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${depth > 0 ? 'ml-8 border-l-2 border-primary/20 pl-4' : ''}`}
    >
      <div className="flex gap-3 mb-3">
        <Link to={`/user/${comment.authorId}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
          {comment.author && comment.author.avatar ? (
            <img 
              src={comment.author.avatar} 
              alt={comment.author.name || 'User'} 
              className="w-8 h-8 rounded-full object-cover border border-primary/30" 
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-xs font-bold text-white">
              {comment.author && comment.author.name ? comment.author.name[0] : 'U'}
            </div>
          )}
        </Link>
        <div className="flex-grow min-w-0">
          <div className="glass p-3 rounded-2xl rounded-tl-none">
            <div className="flex items-center justify-between mb-1">
              <Link to={`/user/${comment.authorId}`} className="text-sm font-medium text-primary-300 hover:text-white transition-colors truncate">
                {comment.author && comment.author.name ? comment.author.name : 'Unknown'}
              </Link>
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="text-white hover:text-red-400 transition-colors ml-2"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <p className="text-white text-sm break-words">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1 flex-wrap">
            {isAuthenticated && (
              <button
                onClick={() => setReplying(!replying)}
                className="text-xs text-white hover:text-primary-300 transition-colors flex items-center gap-1"
              >
                <CornerDownRight className="w-3 h-3" />
                Reply
              </button>
            )}
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-white hover:text-primary-300 transition-colors"
              >
                {showReplies ? 'Hide' : 'Show'} {comment.replies.length} replies
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {replying && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleReply}
            className="ml-11 mb-3"
          >
            <div className="flex gap-2">
              <textarea
                rows={1}
                placeholder="Write a reply..."
                className="flex-grow text-sm py-2 px-3 text-white placeholder-white/50 bg-white/[0.04] border border-white/[0.06] rounded-xl focus:outline-none focus:border-primary/30 focus:bg-white/[0.06] transition-all resize-none"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-primary/20 text-primary-300 hover:bg-primary/30 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {showReplies && comment.replies && comment.replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          postId={postId}
          postAuthorId={postAuthorId}
          onCommentAdded={onCommentAdded}
          depth={depth + 1}
        />
      ))}
    </motion.div>
  );
};

const CommentSection = ({ postId, postAuthorId }) => {
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const response = await api.get(`/posts/${postId}/comments`);
      setComments(response.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  // Socket listener - skip own comments to avoid duplicates
  useEffect(() => {
    if (!socket || !postId) return;

    const handleNewComment = (data) => {
      // Skip the current user's comments (they're already added optimistically)
      if (data.comment && data.comment.authorId === user?.id) return;

      if (data.postId === postId && data.comment) {
        setComments((prev) => {
          // If it's a reply, find parent and add to replies
          if (data.comment.parentId) {
            return prev.map((c) => {
              if (c.id === data.comment.parentId) {
                // Avoid duplicate reply
                if (c.replies?.find(r => r.id === data.comment.id)) return c;
                return { ...c, replies: [...(c.replies || []), data.comment] };
              }
              return c;
            });
          }
          // Top-level comment - avoid duplicates
          if (prev.find((c) => c.id === data.comment.id)) return prev;
          return [data.comment, ...prev];
        });
      }
    };

    const handleCommentDeleted = (data) => {
      if (data.postId === postId) {
        setComments((prev) => prev.filter((c) => c.id !== data.commentId));
      }
    };

    socket.on('new-comment', handleNewComment);
    socket.on('comment-deleted', handleCommentDeleted);

    return () => {
      socket.off('new-comment', handleNewComment);
      socket.off('comment-deleted', handleCommentDeleted);
    };
  }, [socket, postId, user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      content: newComment,
      authorId: user.id,
      author: { id: user.id, name: user.name, avatar: user.avatar },
      createdAt: new Date().toISOString(),
      replies: [],
    };

    setComments((prev) => [optimisticComment, ...prev]);
    setNewComment('');
    setLoading(true);

    try {
      const response = await api.post(`/posts/${postId}/comments`, { content: optimisticComment.content });
      const realComment = response.data?.comment;
      if (realComment) {
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? { ...realComment, replies: [] } : c))
        );
      }
    } catch (error) {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-primary-400 flex-shrink-0" />
        <h3 className="text-lg font-semibold text-white">
          Comments <span className="text-white text-sm">({comments.length})</span>
        </h3>
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
          <Link to={`/user/${user ? user.id : ''}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
            {user && user.avatar ? (
              <img src={user.avatar} alt={user.name || 'User'} className="w-8 h-8 rounded-full object-cover border border-primary/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-xs font-bold text-white">
                {user && user.name ? user.name[0] : 'U'}
              </div>
            )}
          </Link>
          <div className="flex-grow flex gap-2 min-w-0">
            <textarea
              rows={2}
              placeholder="Add a comment..."
              className="flex-grow min-w-0 text-white placeholder-white/50 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 focus:outline-none focus:border-primary/30 focus:bg-white/[0.06] transition-all resize-none"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-neon px-4 py-2 disabled:opacity-50 flex-shrink-0"
            >
              {loading ? '...' : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      ) : (
        <div className="glass p-4 text-center mb-6 text-white text-sm">
          Please <Link to="/login" className="text-primary-400 hover:underline">login</Link> to comment
        </div>
      )}

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={postId}
            postAuthorId={postAuthorId}
            onCommentAdded={fetchComments}
          />
        ))}
      </div>
    </div>
  );
};

export default CommentSection;