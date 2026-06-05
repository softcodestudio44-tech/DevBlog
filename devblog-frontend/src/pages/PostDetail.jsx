import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Tag, ArrowLeft, Heart, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import GlassCard from '../components/GlassCard';
import LikeButton from '../components/LikeButton';
import CommentSection from '../components/CommentSection';

const PostDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      const response = await api.get(`/posts/${id}`);
      setPost(response.data);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
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
          <p className="text-white/60 text-lg">Post not found</p>
          <Link to="/" className="purple-text hover:underline mt-4 inline-block">
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
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/50 hover:text-purple-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to posts
          </Link>

          <GlassCard>
            <div className="flex items-center gap-3 mb-6">
              {/* AVATAR WITH IMAGE SUPPORT */}
              {post.author?.avatar ? (
                <img 
                  src={post.author.avatar} 
                  alt={post.author.name} 
                  className="w-12 h-12 rounded-full object-cover border border-purple-500/30" 
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-lg font-bold text-white neon-purple-glow">
                  {post.author?.name?.[0] || 'U'}
                </div>
              )}
              <div>
                <Link to={`/user/${post.authorId}`} className="font-medium hover:text-purple-300 transition-colors">
                  {post.author?.name || 'Unknown'}
                </Link>
                <div className="flex items-center gap-1 text-sm text-white/40">
                  <Clock className="w-3 h-3" />
                  {formatDate(post.createdAt)}
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-bold mb-6">{post.title}</h1>

            <div className="prose prose-invert max-w-none mb-6">
              <p className="text-white/70 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/10">
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
                  <span className="text-sm">{post.commentCount || 0}</span>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Comments */}
          <div className="mt-6">
            <GlassCard>
              <CommentSection postId={post.id} />
            </GlassCard>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PostDetail;