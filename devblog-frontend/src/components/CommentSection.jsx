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
      await api.post(`/posts/${postId}/comments`, {
        content: replyContent,
        parentId: comment.id,
      });
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
      className={`${depth > 0 ? 'ml-8 border-l-2 border-emerald-500/20 pl-4' : ''}`}
    >
      <div className="flex gap-3 mb-3">
        <Link to={`/user/${comment.authorId}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
          {comment.author && comment.author.avatar ? (
            <img 
              src={comment.author.avatar} 
              alt={comment.author.name || 'User'} 
              className="w-8 h-8 rounded-full object-cover border border-emerald-500/30" 
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
              {comment.author && comment.author.name ? comment.author.name[0] : 'U'}
            </div>
          )}
        </Link>
        <div className="flex-grow min-w-0">
          <div className="glass p-3 rounded-2xl rounded-tl-none">
            <div className="flex items-center justify-between mb-1">
              <Link to={`/user/${comment.authorId}`} className="text-sm font-medium text-emerald-300 hover:text-white transition-colors truncate">
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
                className="text-xs text-white hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                <CornerDownRight className="w-3 h-3" />
                Reply
              </button>
            )}
            {comment.replies && comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-white hover:text-emerald-300 transition-colors"
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
              <input
                type="text"
                placeholder="Write a reply..."
                className="input-glass flex-grow text-sm py-2 px-3 text-white placeholder-white/50"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
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

  // Listen for external comments on this post
  useEffect(() => {
    if (!socket || !postId) return;

    const handleNewComment = (data) => {
      if (data.postId === postId) {
        fetchComments();
      }
    };

    const handleCommentDeleted = (data) => {
      if (data.postId === postId) {
        fetchComments();
      }
    };

    socket.on('new-comment', handleNewComment);
    socket.on('comment-deleted', handleCommentDeleted);

    return () => {
      socket.off('new-comment', handleNewComment);
      socket.off('comment-deleted', handleCommentDeleted);
    };
  }, [socket, postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await api.post(`/posts/${postId}/comments`, { content: newComment });
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <h3 className="text-lg font-semibold text-white">
          Comments <span className="text-white text-sm">({comments.length})</span>
        </h3>
      </div>

      {/* Add Comment */}
      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
          <Link to={`/user/${user ? user.id : ''}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
            {user && user.avatar ? (
              <img src={user.avatar} alt={user.name || 'User'} className="w-8 h-8 rounded-full object-cover border border-emerald-500/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                {user && user.name ? user.name[0] : 'U'}
              </div>
            )}
          </Link>
          <div className="flex-grow flex gap-2 min-w-0">
            <input
              type="text"
              placeholder="Add a comment..."
              className="input-glass flex-grow min-w-0 text-white placeholder-white/50"
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
          Please <Link to="/login" className="text-emerald-400 hover:underline">login</Link> to comment
        </div>
      )}

      {/* Comments List */}
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