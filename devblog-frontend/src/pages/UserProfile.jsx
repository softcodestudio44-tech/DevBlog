import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, PenLine, Heart, MessageCircle, Edit3, Calendar, Github, Twitter, Linkedin, Globe, Music2, Facebook, ExternalLink, UserPlus, UserCheck, X, Shield } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import GlassCard from '../components/GlassCard';

const UserProfile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showModal, setShowModal] = useState(null); // 'followers' or 'following' or null

  const isOwnProfile = currentUser && currentUser.id === id;

  useEffect(() => {
    fetchProfileData();
  }, [id]);

  // Listen for real-time follow updates
  useEffect(() => {
    if (!socket) return;

    const handleFollowUpdate = (data) => {
      if (data.followingId === id || data.followerId === id) {
        // Refresh profile data when follow/unfollow happens
        fetchProfileData();
      }
    };

    socket.on('follow-update', handleFollowUpdate);

    return () => {
      socket.off('follow-update', handleFollowUpdate);
    };
  }, [socket, id]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const userRes = await api.get(`/users/${id}`);
      const postsRes = await api.get(`/users/${id}/posts`);
      setProfile(userRes.data);
      setPosts(postsRes.data || []);
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
          followersCount: (prev.followersCount || 0) - 1,
        }));
      } else {
        await api.post(`/users/${id}/follow`);
        setProfile(prev => ({
          ...prev,
          isFollowing: true,
          followersCount: (prev.followersCount || 0) + 1,
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
                <div className="relative flex-shrink-0">
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
                    {profile.name && profile.name[0] ? profile.name[0] : 'U'}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-green-500 border-4 border-[#0F0A1E]" />
                </div>

                {/* Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-3xl font-bold">{profile.name}</h1>

                    {/* Admin Badge */}
                    {profile.isAdmin && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                        <Shield className="w-3 h-3" />
                        ADMIN
                      </span>
                    )}

                    {isOwnProfile && (
                      <Link
                        to="/edit-profile"
                        className="p-2 rounded-xl glass hover:bg-emerald-500/20 transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-emerald-300" />
                      </Link>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="text-white/70 text-sm max-w-lg mb-4">{profile.bio}</p>
                  )}

                  {/* Follow Button + DM action */}
                  {!isOwnProfile && currentUser && (
                    <div className="flex flex-wrap items-center gap-3 mb-4 bg-white/5 border border-white/10 rounded-3xl p-3 shadow-inner shadow-black/10">
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-medium transition-all ${
                          profile.isFollowing
                            ? 'bg-white/10 border border-white/10 text-white/60 hover:bg-white/15 hover:text-red-400 hover:border-red-400/30'
                            : 'bg-lime-500/20 border border-lime-500/30 text-emerald-400 hover:bg-lime-500/30'
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
                      <button
                        onClick={() => navigate(`/messages?user=${profile.id}`)}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </button>
                    </div>
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

              {/* TikTok-Style Stats - Clickable to open modal */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                <button 
                  onClick={() => setShowModal('following')}
                  className="text-center bg-white/5 border border-white/10 rounded-3xl py-3 transition-colors hover:bg-white/10 shadow-inner shadow-black/10"
                >
                  <div className="text-2xl font-bold gradient-text">{profile.followingCount || 0}</div>
                  <div className="text-xs text-white/50">Following</div>
                </button>
                <button 
                  onClick={() => setShowModal('followers')}
                  className="text-center bg-white/5 border border-white/10 rounded-3xl py-3 transition-colors hover:bg-white/10 shadow-inner shadow-black/10"
                >
                  <div className="text-2xl font-bold gradient-text">{profile.followersCount || 0}</div>
                  <div className="text-xs text-white/50">Followers</div>
                </button>
                <div className="text-center bg-white/5 border border-white/10 rounded-3xl py-4 shadow-inner shadow-black/10">
                  <div className="text-2xl font-bold gradient-text">{profile.likeCount || 0}</div>
                  <div className="text-xs text-white/50">Likes</div>
                </div>
                <div className="text-center bg-white/5 border border-white/10 rounded-3xl py-4 shadow-inner shadow-black/10">
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
                      {post.tags && post.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="tag text-xs flex items-center gap-1">
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
                        {formatDate(post.createdAt)}
                      </span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal for Followers/Following List */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass w-full max-w-md max-h-[70vh] rounded-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold">
                  {showModal === 'followers' ? 'Followers' : 'Following'}
                  <span className="text-white/40 text-sm ml-2">
                    ({showModal === 'followers' ? (profile.followersCount || 0) : (profile.followingCount || 0)})
                  </span>
                </h3>
                <button
                  onClick={() => setShowModal(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto p-4 space-y-3">
                {showModal === 'followers' && profile.followersList && profile.followersList.length > 0 ? (
                  profile.followersList.map((follower) => (
                    <div
                      key={follower.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors min-w-0"
                    >
                      <Link
                        to={`/user/${follower.id}`}
                        onClick={() => setShowModal(null)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        {follower.avatar ? (
                          <img
                            src={follower.avatar}
                            alt={follower.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white">
                            {follower.name && follower.name[0] ? follower.name[0] : 'U'}
                          </div>
                        )}
                        <span className="text-white/80 font-medium truncate">{follower.name}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(null);
                          navigate(`/messages?user=${follower.id}`);
                        }}
                        className="p-2 rounded-full bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                        title={`Message ${follower.name}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : showModal === 'following' && profile.followingList && profile.followingList.length > 0 ? (
                  profile.followingList.map((following) => (
                    <div
                      key={following.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors min-w-0"
                    >
                      <Link
                        to={`/user/${following.id}`}
                        onClick={() => setShowModal(null)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        {following.avatar ? (
                          <img
                            src={following.avatar}
                            alt={following.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white">
                            {following.name && following.name[0] ? following.name[0] : 'U'}
                          </div>
                        )}
                        <span className="text-white/80 font-medium truncate">{following.name}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(null);
                          navigate(`/messages?user=${following.id}`);
                        }}
                        className="p-2 rounded-full bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                        title={`Message ${following.name}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-white/40 py-8">
                    No {showModal} yet
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfile;