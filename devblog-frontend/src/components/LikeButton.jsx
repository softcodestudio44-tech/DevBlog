import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const LikeButton = ({ postId, initialCount = 0 }) => {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    fetchLikeStatus();
  }, [postId]);

  // Listen for external like events (other users liking this post)
  useEffect(() => {
    if (!socket || !postId) return;

    const handlePostLiked = (data) => {
      if (data.postId === postId && data.userId !== 'me') {
        // Only update count from socket if it's NOT our own action
        setCount((prev) =>
          data.action === 'like' ? prev + 1 : Math.max(0, prev - 1)
        );
      }
    };

    socket.on('post-liked', handlePostLiked);
    return () => socket.off('post-liked', handlePostLiked);
  }, [socket, postId]);

  const fetchLikeStatus = async () => {
    try {
      const response = await api.get(`/likes/${postId}`);
      setCount(response.data.count);
      setLiked(response.data.userLiked);
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      alert('Please login to like posts');
      return;
    }
    if (loading) return;

    setLoading(true);

    // Optimistic update
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : Math.max(0, count - 1);
    setLiked(newLiked);
    setCount(newCount);

    try {
      const response = await api.post(`/likes/${postId}`);
      // Sync with server response
      setLiked(response.data.liked);
      setCount(response.data.count);
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setLiked(!newLiked);
      setCount(count);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={handleLike}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
        liked
          ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
          : 'bg-white/5 text-white border border-white/10 hover:bg-pink-500/10 hover:text-pink-300'
      }`}
    >
      <Heart className={`w-4 h-4 ${liked ? 'fill-pink-400' : ''}`} />
      <span className="text-sm font-medium">{count}</span>
    </motion.button>
  );
};

export default LikeButton;