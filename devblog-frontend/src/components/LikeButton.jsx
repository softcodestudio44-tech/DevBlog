import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const LikeButton = ({ postId, initialCount = 0 }) => {
  const { user, isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    fetchLikeStatus();
  }, [postId]);

  // Subscribe to real-time like changes
  useEffect(() => {
    if (!postId) return;

    const channel = supabase
      .channel(`likes:${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          if (payload.new.user_id !== user?.id) {
            setCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          if (payload.old.user_id !== user?.id) {
            setCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, user?.id]);

  const fetchLikeStatus = async () => {
    try {
      // Get total count
      const { count: totalCount, error: countError } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId);
      if (countError) throw countError;
      setCount(totalCount || 0);

      // Check if current user liked it
      if (user?.id) {
        const { data, error } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        setLiked(!!data);
      }
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
      if (newLiked) {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      }
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