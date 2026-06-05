import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Tag, ArrowLeft, PenLine, Heart, MessageCircle, Edit3, Calendar } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';

const UserProfile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    fetchProfileData();
  }, [id, currentUser]);

  const fetchProfileData = async () => {
    try {
      let userData = null;
      
      // Try backend API first
      try {
        const userRes = await api.get(`/users/${id}`);
        userData = userRes.data;
      } catch (err) {
        console.log('User API failed, using fallback');
      }

      // Get all posts
      const postsRes = await api.get('/posts');
      const userPosts = postsRes.data.filter((post) => post.authorId === id);
      
      if (userData) {
        setProfile({
          ...userData,
          postCount: userPosts.length,
        });
      } else if (userPosts.length > 0) {
        const author = userPosts[0].author;
        setProfile({
          id: id,
          name: author.name,
          email: author.email || '',
          avatar: author.avatar || currentUser?.avatar || null,
          bio: currentUser?.id === id ? currentUser?.bio : null,
          postCount: userPosts.length,
          likeCount: 0,
          commentCount: 0,
        });
      } else if (isOwnProfile && currentUser) {
        setProfile({
          ...currentUser,
          postCount: 0,
          likeCount: 0,
          commentCount: 0,
        });
      }

      setPosts(userPosts);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass h-64 loading-shimmer rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <GlassCard className="text-center py-12">
          <p className="text-white/60 text-lg">User not found</p>
          <Link to="/" className="purple-text hover:underline mt-4 inline-block">
            Go back home
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/50 hover:text-purple-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to posts
          </Link>

          {/* Profile Header */}
          <GlassCard className="mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-purple-600/30 to-cyan-600/30" />
            
            <div className="relative pt-16 px-4 pb-6">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
                {/* Avatar */}
                <div className="relative">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-[#0F0A1E] shadow-2xl"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 flex items-center justify-center text-4xl font-bold text-white border-4 border-[#0F0A1E] shadow-2xl ${profile.avatar ? 'hidden' : ''}`}
                  >
                    {profile.name?.[0] || 'U'}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-4 border-[#0F0A1E]" />
                </div>

                {/* Info */}
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{profile.name}</h1>
                    {isOwnProfile && (
                      <Link
                        to="/edit-profile"
                        className="p-2 rounded-xl glass hover:bg-purple-500/20 transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-purple-300" />
                      </Link>
                    )}
                  </div>
                  <p className="text-white/50 mb-3">{profile.email}</p>
                  
                  {profile.bio && (
                    <p className="text-white/70 text-sm max-w-lg mb-4">{profile.bio}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-white/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined recently
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{profile.postCount || 0}</div>
                  <div className="text-xs text-white/50">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{profile.likeCount || 0}</div>
                  <div className="text-xs text-white/50">Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{profile.commentCount || 0}</div>
                  <div className="text-xs text-white/50">Comments</div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* User's Posts */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Posts by {profile.name}</h2>
            {isOwnProfile && (
              <Link to="/create" className="btn-neon text-sm flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                New Post
              </Link>
            )}
          </div>

          {posts.length === 0 ? (
            <GlassCard className="text-center py-12">
              <p className="text-white/60">No posts yet</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post, index) => (
                <GlassCard key={post.id} delay={index * 0.1}>
                  <Link to={`/post/${post.id}`}>
                    <h3 className="text-lg font-semibold mb-2 hover:text-purple-300 transition-colors">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-white/50 text-sm mb-3 line-clamp-2">{post.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {post.tags?.slice(0, 2).map((tag) => (
                        <span key={tag} className="tag text-xs flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-white/40 text-xs">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {post.likeCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {post.commentCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(post.createdAt)}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default UserProfile;