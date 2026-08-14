import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, PenLine, Heart, MessageCircle, Edit3, Calendar, Github, Twitter, Linkedin, Globe, Music2, Facebook, ExternalLink, UserPlus, UserCheck, X, Shield, MapPin, Camera, Save, Loader2, Activity as ActivityIcon, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import GlassCard from '../components/GlassCard';
import { sendNotification } from '../lib/notify';
import { uploadCover, uploadAvatar } from '../lib/storage';

const UserProfile = () => {
  const { id } = useParams();
  const { user: currentUser, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [showModal, setShowModal] = useState(null); // 'followers' or 'following' or null
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const isOwnProfile = currentUser && currentUser.id === id;

  // Scroll to a section
  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    fetchProfileData();
  }, [id]);

  // Real-time: follower count + list update instantly when someone follows/unfollows
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`profile-follows:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${id}`,
        },
        async (payload) => {
          const followerId = payload.new?.follower_id;
          // Skip own follow action (already handled optimistically)
          if (!followerId || followerId === currentUser?.id) return;
          setProfile((prev) =>
            prev ? { ...prev, followersCount: (prev.followersCount || 0) + 1 } : prev
          );
          try {
            const { data } = await supabase
              .from('profiles')
              .select('id, name, avatar, email')
              .eq('id', followerId)
              .single();
            if (data) {
              setProfile((prev) =>
                prev && !(prev.followersList || []).some((f) => f.id === data.id)
                  ? { ...prev, followersList: [data, ...(prev.followersList || [])] }
                  : prev
              );
            }
          } catch (err) {
            console.error('Error fetching new follower:', err);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${id}`,
        },
        (payload) => {
          const followerId = payload.old?.follower_id;
          if (!followerId || followerId === currentUser?.id) return;
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  followersCount: Math.max(0, (prev.followersCount || 0) - 1),
                  followersList: (prev.followersList || []).filter((f) => f.id !== followerId),
                }
              : prev
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUser?.id]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      if (profileError) throw profileError;

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, name, avatar, email),
          likes:likes(count),
          comments:comments(count)
        `)
        .eq('author_id', id)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });
      if (postsError) throw postsError;

      // Get counts
      const { count: postCount } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', id)
        .eq('is_draft', false);

      const { count: followersCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', id);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', id);

      // Check if current user follows this profile
      let isFollowing = false;
      if (currentUser?.id && currentUser.id !== id) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', id)
          .maybeSingle();
        isFollowing = !!followData;
      }

      // Get followers and following lists
      const { data: followersData } = await supabase
        .from('follows')
        .select('follower:profiles(id, name, avatar, email)')
        .eq('following_id', id)
        .limit(10);

      const { data: followingData } = await supabase
        .from('follows')
        .select('following:profiles(id, name, avatar, email)')
        .eq('follower_id', id)
        .limit(10);

      // Activity feed: recent likes, comments on posts, and new followers
      const [{ data: likesData }, { data: commentsData }, { data: newFollowers }] = await Promise.all([
        supabase
          .from('likes')
          .select('*, user:profiles!likes_user_id_fkey(id, name, avatar), post:posts!likes_post_id_fkey(id, title)')
          .filter('post.author_id', 'eq', id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('comments')
          .select('*, author:profiles!comments_author_id_fkey(id, name, avatar), post:posts!comments_post_id_fkey(id, title)')
          .filter('post.author_id', 'eq', id)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('follows')
          .select('follower:profiles!follows_follower_id_fkey(id, name, avatar), created_at')
          .eq('following_id', id)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

      const items = [
        ...(likesData || []).map((l) => ({
          id: `like-${l.id}`,
          type: 'like',
          actor: l.user,
          target: l.post?.title || 'your post',
          postId: l.post?.id,
          createdAt: l.created_at,
        })),
        ...(commentsData || []).map((c) => ({
          id: `comment-${c.id}`,
          type: 'comment',
          actor: c.author,
          target: c.post?.title || 'your post',
          postId: c.post?.id,
          snippet: c.content,
          createdAt: c.created_at,
        })),
        ...(newFollowers || []).map((f) => ({
          id: `follow-${f.follower?.id}-${f.created_at}`,
          type: 'follow',
          actor: f.follower,
          createdAt: f.created_at,
        })),
      ]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 15);

      const transformedPosts = (postsData || []).map(post => ({
        ...post,
        likeCount: post.likes?.[0]?.count || 0,
        commentCount: post.comments?.[0]?.count || 0,
        likes: undefined,
        comments: undefined,
      }));

      setProfile({
        ...profileData,
        isAdmin: profileData.email === 'sofcodestudio44@gmail.com' || profileData.role === 'admin',
        postCount: postCount || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        isFollowing,
        followersList: (followersData || []).map(f => f.follower),
        followingList: (followingData || []).map(f => f.following),
      });
      setPosts(transformedPosts);
      setActivity(items);
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
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', id);
        if (error) throw error;
        setProfile(prev => ({
          ...prev,
          isFollowing: false,
          followersCount: (prev.followersCount || 0) - 1,
        }));
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUser.id, following_id: id });
        if (error) throw error;
        if (id !== currentUser.id) {
          await sendNotification({
            userId: id,
            type: 'follow',
            message: `${currentUser.name || 'Someone'} started following you`,
            sourceId: id,
            sourceType: 'user',
            actorId: currentUser.id,
          });
        }
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

  const openEditModal = () => {
    if (!profile) return;
    setEditForm({
      name: profile.name || '',
      bio: profile.bio || '',
      location: profile.location || '',
      avatar: profile.avatar || '',
      cover_url: profile.cover_url || '',
      github: profile.github || '',
      twitter: profile.twitter || '',
      linkedin: profile.linkedin || '',
      website: profile.website || '',
      tiktok: profile.tiktok || '',
      facebook: profile.facebook || '',
    });
    setShowEditModal(true);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser?.id) return;
    if (!file.type.startsWith('image/')) {
      toast({ type: 'notification', title: 'Invalid file', body: 'Please choose an image.' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(currentUser.id, file);
      setEditForm((prev) => ({ ...prev, avatar: url }));
      toast({ type: 'success', title: 'Avatar updated', body: 'Remember to save your changes.' });
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast({ type: 'notification', title: 'Upload failed', body: 'Could not upload avatar.' });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser?.id) return;
    if (!file.type.startsWith('image/')) {
      toast({ type: 'notification', title: 'Invalid file', body: 'Please choose an image.' });
      return;
    }
    setUploadingCover(true);
    try {
      const url = await uploadCover(currentUser.id, file);
      setEditForm((prev) => ({ ...prev, cover_url: url }));
      toast({ type: 'success', title: 'Cover updated', body: 'Remember to save your changes.' });
    } catch (err) {
      console.error('Cover upload error:', err);
      toast({ type: 'notification', title: 'Upload failed', body: 'Could not upload cover.' });
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      const { error } = await updateProfile(editForm);
      if (error) throw new Error(error);
      setProfile((prev) => ({ ...prev, ...editForm }));
      setShowEditModal(false);
      toast({ type: 'success', title: 'Profile updated', body: 'Your changes were saved.' });
    } catch (err) {
      console.error('Profile update error:', err);
      toast({ type: 'notification', title: 'Update failed', body: err.message || 'Could not save changes.' });
    } finally {
      setSavingEdit(false);
    }
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
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'hover:text-primary-400' },
    { key: 'tiktok', label: 'TikTok', icon: Music2, color: 'hover:text-pink-400' },
    { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'hover:text-blue-500' },
    { key: 'website', label: 'Website', icon: Globe, color: 'hover:text-primary-400' },
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
          <Link to="/" className="text-primary-400 hover:underline mt-4 inline-block">
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
            className="inline-flex items-center gap-2 text-white/50 hover:text-[#3B82F6] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to posts
          </Link>

          {/* Profile Header */}
          <GlassCard className="glass-strong mb-8 relative overflow-hidden profile-panel">
            <div className="profile-accent-ring" />
            {/* Cover photo */}
            {profile.cover_url ? (
              <div className="absolute top-0 left-0 right-0 h-32 sm:h-40 overflow-hidden">
                <img
                  src={profile.cover_url}
                  alt="Profile cover"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0F0A1E]/60" />
                <div className="hidden absolute inset-0 bg-gradient-to-r from-[#3B82F6]/25 to-transparent items-center justify-center" />
              </div>
            ) : (
              <div className="absolute top-0 left-0 right-0 h-32 sm:h-40 bg-gradient-to-r from-[#3B82F6]/25 to-transparent" />
            )}

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
                    className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-gradient-to-br from-primary to-primary-400 flex items-center justify-center text-4xl font-bold text-white border-4 border-[#0F0A1E] shadow-2xl ${profile.avatar ? 'hidden' : ''}`}
                  >
                    {profile.name && profile.name[0] ? profile.name[0] : 'U'}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary border-4 border-[#0F0A1E]" />
                </div>

                {/* Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-3xl font-bold">{profile.name}</h1>

                    {/* Admin Badge */}
                    {profile.isAdmin && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/20 border border-primary/30 text-primary-400 text-xs font-medium">
                        <Shield className="w-3 h-3" />
                        ADMIN
                      </span>
                    )}

                    {isOwnProfile && (
                      <button
                        onClick={openEditModal}
                        className="p-2 rounded-xl glass hover:bg-primary/20 transition-colors"
                        title="Edit profile"
                      >
                        <Edit3 className="w-4 h-4 text-primary-300" />
                      </button>
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
                            : 'bg-[#3B82F6]/18 border border-[#3B82F6]/30 text-[#DBEAFE] hover:bg-[#3B82F6]/25'
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
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-[#3B82F6]/12 border border-[#3B82F6]/20 text-[#DBEAFE] hover:bg-[#3B82F6]/20 transition-all"
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
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.location}
                      </span>
                    )}
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
                  className="text-center bg-[#3B82F6]/08 border border-[#3B82F6]/15 rounded-3xl py-3 transition-colors hover:bg-[#3B82F6]/12 shadow-inner shadow-black/10"
                >
                  <div className="text-2xl font-bold gradient-text">{profile.followingCount || 0}</div>
                  <div className="text-xs text-white/50">Following</div>
                </button>
                <button 
                  onClick={() => setShowModal('followers')}
                  className="text-center bg-[#3B82F6]/08 border border-[#3B82F6]/15 rounded-3xl py-3 transition-colors hover:bg-[#3B82F6]/12 shadow-inner shadow-black/10"
                >
                  <div className="text-2xl font-bold gradient-text">{profile.followersCount || 0}</div>
                  <div className="text-xs text-white/50">Followers</div>
                </button>
                <button
                  onClick={() => scrollToSection('activity-feed')}
                  className="text-center bg-[#3B82F6]/08 border border-[#3B82F6]/15 rounded-3xl py-3 transition-colors hover:bg-[#3B82F6]/12 shadow-inner shadow-black/10"
                >
                  <div className="text-2xl font-bold gradient-text">{profile.likeCount || 0}</div>
                  <div className="text-xs text-white/50">Likes</div>
                </button>
                <button
                  onClick={() => scrollToSection('user-posts')}
                  className="text-center bg-[#3B82F6]/08 border border-[#3B82F6]/15 rounded-3xl py-3 transition-colors hover:bg-[#3B82F6]/12 shadow-inner shadow-black/10"
                >
                  <div className="text-2xl font-bold gradient-text">{profile.postCount || 0}</div>
                  <div className="text-xs text-white/50">Posts</div>
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Activity Feed */}
          <div id="activity-feed" className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-primary-300" />
              Activity
            </h2>
            {activity.length === 0 ? (
              <GlassCard className="text-center py-8">
                <p className="text-white/40 text-sm">No recent activity</p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <GlassCard key={item.id}>
                    <div className="flex items-start gap-3">
                      {item.actor?.avatar ? (
                        <img
                          src={item.actor.avatar}
                          alt={item.actor.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                          {item.actor?.name?.[0] || 'U'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white/75 leading-relaxed">
                          {item.type === 'like' && (
                            <>
                              <Link to={`/user/${item.actor?.id}`} className="font-semibold text-white hover:text-primary-300">
                                {item.actor?.name || 'Someone'}
                              </Link>{' '}
                              <Heart className="w-3.5 h-3.5 inline-block text-pink-400 -mt-0.5" /> liked{' '}
                              {item.target && (
                                <Link to={`/post/${item.postId || ''}`} className="text-primary-300 hover:underline">
                                  {item.target}
                                </Link>
                              )}
                            </>
                          )}
                          {item.type === 'comment' && (
                            <>
                              <Link to={`/user/${item.actor?.id}`} className="font-semibold text-white hover:text-primary-300">
                                {item.actor?.name || 'Someone'}
                              </Link>{' '}
                              commented on {item.target && <span className="text-primary-300">{item.target}</span>}
                              {item.snippet && (
                                <span className="block text-white/40 text-xs mt-1 line-clamp-2">{item.snippet}</span>
                              )}
                            </>
                          )}
                          {item.type === 'follow' && (
                            <>
                              <Link to={`/user/${item.actor?.id}`} className="font-semibold text-white hover:text-primary-300">
                                {item.actor?.name || 'Someone'}
                              </Link>{' '}
                              started following you
                            </>
                          )}
                        </p>
                        <p className="text-[11px] text-white/30 mt-1">
                          {new Date(item.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>

          {/* User's Posts */}
          <div id="user-posts" className="flex items-center justify-between mb-6">
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
                    <h3 className="text-lg font-semibold mb-2 hover:text-primary-300 transition-colors">
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-sm font-bold text-white">
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
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-sm font-bold text-white">
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

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && editForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          >
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong w-full max-w-md max-h-[85vh] rounded-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleEditSubmit}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold">Edit Profile</h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              <div className="overflow-y-auto p-4 space-y-4">
                {/* Cover preview */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/70">Cover Photo</label>
                  <div className="relative h-24 rounded-xl overflow-hidden bg-gradient-to-r from-[#3B82F6]/25 to-transparent">
                    {editForm.cover_url ? (
                      <img src={editForm.cover_url} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-[#3B82F6]/25 to-transparent" />
                    )}
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-strong text-xs font-medium text-white/80 hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                      {uploadingCover ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                      {editForm.cover_url ? 'Change' : 'Upload'}
                    </button>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Avatar */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-white/70">Avatar</label>
                  <div className="flex items-center gap-4">
                    {editForm.avatar ? (
                      <img
                        src={editForm.avatar}
                        alt="Avatar"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-primary-500/30"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-2xl font-bold text-white">
                        {editForm.name?.[0] || 'U'}
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass text-xs font-medium text-white/80 hover:bg-white/10 transition-all disabled:opacity-50"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" />
                        )}
                        Upload photo
                      </button>
                      {editForm.avatar && (
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, avatar: '' }))}
                          className="text-xs text-white/40 hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white/70">Display Name</label>
                  <input
                    type="text"
                    className="input-glass"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white/70">Bio</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about yourself..."
                    className="input-glass resize-none"
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white/70">Location</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="City, Country"
                      className="input-glass pl-9"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-medium mb-3 text-white/70">Social Links</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'github', label: 'GitHub', placeholder: 'github.com/username' },
                      { key: 'twitter', label: 'Twitter/X', placeholder: 'twitter.com/username' },
                      { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/username' },
                      { key: 'website', label: 'Website', placeholder: 'yourwebsite.com' },
                      { key: 'tiktok', label: 'TikTok', placeholder: 'tiktok.com/@username' },
                      { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/username' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-xs font-medium mb-1.5 text-white/50 block">{label}</label>
                        <input
                          type="text"
                          className="input-glass"
                          placeholder={placeholder}
                          value={editForm[key] || ''}
                          onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-neon w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfile;
