import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, CornerDownRight, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const CommentItem = ({ comment, postId, postAuthorId, onCommentAdded, depth = 0 }) => {
  const { user, isAuthenticated } = useAuth();
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(true);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: replyContent,
          post_id: postId,
          author_id: user.id,
          parent_id: comment.id,
        })
        .select(`
          *,
          author:profiles(id, name, avatar, email)
        `)
        .single();

      if (error) throw error;
      if (data && comment.replies) {
        comment.replies.push(data);
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
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', comment.id);
      if (error) throw error;
      onCommentAdded();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const isCommentAuthor = user && user.id === comment.author_id;
  const isPostOwner = user && user.id === postAuthorId;
  const isAdmin = user && (user.role === 'admin' || user.email === 'sofcodestudio44@gmail.com');
  const canDelete = isCommentAuthor || isPostOwner || isAdmin;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${depth > 0 ? 'ml-8 border-l-2 border-primary/20 pl-4' : ''}`}
    >
      <div className="flex gap-3 mb-3">
        <Link to={`/user/${comment.author_id}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
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
              <Link to={`/user/${comment.author_id}`} className="text-sm font-medium text-primary-300 hover:text-white transition-colors truncate">
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
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles(id, name, avatar, email),
          replies:comments(
            *,
            author:profiles(id, name, avatar, email),
            replies:comments(
              *,
              author:profiles(id, name, avatar, email)
            )
          )
        `)
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
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

  // Subscribe to new comments in real-time
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const newComment = payload.new;
          
          // Skip own comments (already added optimistically)
          if (newComment.author_id === user?.id) return;

          // Fetch the full comment with author info
          const { data } = await supabase
            .from('comments')
            .select(`
              *,
              author:profiles(id, name, avatar, email),
              replies:comments(
                *,
                author:profiles(id, name, avatar, email)
              )
            `)
            .eq('id', newComment.id)
            .single();

          if (!data) return;

          setComments((prev) => {
            // If it's a reply, find parent and add to replies
            if (data.parent_id) {
              return prev.map((c) => {
                if (c.id === data.parent_id) {
                  if (c.replies?.find(r => r.id === data.id)) return c;
                  return { ...c, replies: [...(c.replies || []), data] };
                }
                return c;
              });
            }
            // Top-level comment - avoid duplicates
            if (prev.find((c) => c.id === data.id)) return prev;
            return [data, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const { id } = payload.old;
          setComments((prev) => prev.filter((c) => c.id !== id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      content: newComment,
      author_id: user.id,
      author: { id: user.id, name: user.name, avatar: user.avatar },
      created_at: new Date().toISOString(),
      replies: [],
    };

    setComments((prev) => [optimisticComment, ...prev]);
    setNewComment('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          content: optimisticComment.content,
          post_id: postId,
          author_id: user.id,
        })
        .select(`
          *,
          author:profiles(id, name, avatar, email)
        `)
        .single();

      if (error) throw error;
      if (data) {
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? { ...data, replies: [] } : c))
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