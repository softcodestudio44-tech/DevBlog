import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Tag, ArrowLeft, PenLine, Heart, MessageCircle, Edit3, Calendar, Github, Twitter, Linkedin, Globe, Music2, Facebook, ExternalLink, UserPlus, UserCheck } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';

const UserProfile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    fetchProfileData();
  }, [id]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const userRes = await api.get(`/users/${id}`);
      const userData = userRes.data;

      // Fetch user's posts
      const postsRes = await api.get(`/users/${id}/posts`);

      setProfile(userData);
      setPosts(postsRes.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || isOwnProfile) return;

    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await api.post(`/users/${id}/unfollow`);
        setProfile(prev => ({
          ...prev,
          isFollowing: false,
          followersCount: prev.followersCount - 1,
        }));
      } else {
        await api.post(`/users/${id}/follow`);
        setProfile(prev => ({
          ...prev,
          isFollowing: true,
          followersCount: prev.followersCount + 1,
        }));
      }
    } catch (error) {
      console.error('Follow error:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const getSocialLink = (url, type) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (type === 'github') return `https://github.com/${url.replace('github.com/', '')}`;
    if (type === 'twitter') return `https://twitter.com/${url.replace('twitter.com/', '')}`;
    if (type === 'linkedin') return `https://linkedin.com/in/${url.replace('linkedin.com/in/', '')}`;
    if (type === 'tiktok') return `https://tiktok.com/@${url.replace('tiktok.com/@', '')}`;
    if (type === 'facebook') return `https://facebook.com/${url.replace('facebook.com/', '')}`;
    if (type === 'website') return `https://${url}`;
    return url;
  };

  const socialLinks = [
    { key: 'github', label: 'GitHub', icon: Github, color: 'hover:text-white' },
    { key: 'twitter', label: 'Twitter', icon: Twitter, color: 'hover:text-sky-400' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'hover:text-blue-400' },
    { key: 'tiktok', label: 'TikTok', icon: Music2, color: 'hover:text-pink-400' },
    { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'hover:text-blue-500' },
    { key: 'website', label: 'Website', icon: Globe, color: 'hover:text-emerald-400' },
  ];

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
          <Link to="/" className="text-emerald-400 hover:underline mt-4 inline-block">
            Go back home
          </Link>
        </GlassCard>
      </div>
    );
  }

  const hasSocialLinks = profile.github || profile.twitter || profile.linkedin || profile.website || profile.tiktok || profile.facebook;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/50 hover:text-emerald-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to posts
          </Link>

          {/* Profile Header */}
          <GlassCard className="mb-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-emerald-600/30 to-teal-600/30" />

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
                    className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-4xl font-bold text-white border-4 border-[#0F0A1E] shadow-2xl ${profile.avatar ? 'hidden' : ''}`}
                  >
                    {profile.name?.[0] || 'U'}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-4 border-[#0F0A1E]" />
                </div>

                {/* Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-3xl font-bold">{profile.name}</h1>
                    {isOwnProfile && (
                      <Link
                        to="/edit-profile"
                        className="p-2 rounded-xl glass hover:bg-emerald-500/20 transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-emerald-300" />
                      </Link>
                    )}
                  </div>
                  <p className="text-white/50 mb-3">{profile.email}</p>

                  {profile.bio && (
                    <p className="text-white/70 text-sm max-w-lg mb-4">{profile.bio}</p>
                  )}

                  {/* Follow Button */}
                  {!isOwnProfile && currentUser && (
                    <button
                      onClick={handleFollow}
                      disabled={followLoading}
                      className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all mb-4 ${
                        profile.isFollowing
                          ? 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                          : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                      } disabled:opacity-50`}
                    >
                      {profile.isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          Follow
                        </>
                      )}
                    </button>
                  )}

                  {/* Social Links */}
                  {hasSocialLinks && (
                    <div className="flex flex-wrap gap-3 mb-4">
                      {socialLinks.map(({ key, label, icon: Icon, color }) => {
                        const url = profile[key];
                        if (!url) return null;
                        const fullUrl = getSocialLink(url, key);
                        return (
                          <a
                            key={key}
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-sm text-white/60 ${color} hover:bg-white/5 transition-all`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-white/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Joined {formatDate(profile.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* TikTok-Style Stats */}
              <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{profile.followingCount || 0}</div>
                  <div className="text-xs text-white/50">Following</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{profile.followersCount || 0}</div>
                  <div className="text-xs text-white/50">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{profile.likeCount || 0}</div>
                  <div className="text-xs text-white/50">Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold gradient-text">{profile.postCount || 0}</div>
                  <div className="text-xs text-white/50">Posts</div>
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
                    <h3 className="text-lg font-semibold mb-2 hover:text-emerald-300 transition-colors">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-white/50 text-sm mb-3 line-clamp-2">{post.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap">
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