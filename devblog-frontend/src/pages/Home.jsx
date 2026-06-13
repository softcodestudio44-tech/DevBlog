import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, Tag, ArrowRight, Sparkles, Code2, Terminal, Braces, 
  Database, Globe, Heart, MessageCircle, Search, Cpu, Zap, 
  Layers, Monitor, Wifi, ChevronRight, TrendingUp, BookOpen,
  X, Users, Play
} from 'lucide-react';
import api from '../api/axios';
import GlassCard from '../components/GlassCard';
import LikeButton from '../components/LikeButton';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Home = () => {
  const { isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const postsRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [stats, setStats] = useState({ posts: 0, users: 0, likes: 0 });

  useEffect(() => {
    fetchPosts();
    fetchStats();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewPost = (data) => {
      setPosts((prev) => {
        if (prev.find((p) => p.id === data.post.id)) return prev;
        return [data.post, ...prev];
      });
    };

    const handlePostUpdated = (data) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === data.post.id ? { ...data.post } : post
        )
      );
    };

    const handlePostDeleted = (data) => {
      setPosts((prev) => prev.filter((post) => post.id !== data.postId));
    };

    const handlePostLiked = (data) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === data.postId) {
            return {
              ...post,
              likeCount: data.action === 'like'
                ? (post.likeCount || 0) + 1
                : Math.max(0, (post.likeCount || 0) - 1),
            };
          }
          return post;
        })
      );
    };

    const handleNewComment = (data) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === data.postId) {
            return {
              ...post,
              commentCount: (post.commentCount || 0) + 1,
            };
          }
          return post;
        })
      );
    };

    socket.on('new-post', handleNewPost);
    socket.on('post-updated', handlePostUpdated);
    socket.on('post-deleted', handlePostDeleted);
    socket.on('post-liked', handlePostLiked);
    socket.on('new-comment', handleNewComment);

    return () => {
      socket.off('new-post', handleNewPost);
      socket.off('post-updated', handlePostUpdated);
      socket.off('post-deleted', handlePostDeleted);
      socket.off('post-liked', handlePostLiked);
      socket.off('new-comment', handleNewComment);
    };
  }, [socket]);

  const fetchPosts = async () => {
    try {
      const response = await api.get('/posts');
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      setStats(res.data);
    } catch (err) {
      setStats({ posts: posts.length, users: 1, likes: 0 });
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleStartWriting = () => {
    if (isAuthenticated) {
      navigate('/create');
    } else {
      navigate('/register');
    }
  };

  const handleExplorePosts = () => {
    postsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const floatingIcons = [
    { Icon: Code2, delay: 0, x: '8%', y: '15%', size: 24 },
    { Icon: Terminal, delay: 1.5, x: '90%', y: '12%', size: 20 },
    { Icon: Braces, delay: 3, x: '85%', y: '55%', size: 28 },
    { Icon: Database, delay: 0.8, x: '5%', y: '65%', size: 22 },
    { Icon: Globe, delay: 2.2, x: '50%', y: '80%', size: 18 },
    { Icon: Cpu, delay: 1.2, x: '15%', y: '40%', size: 26 },
    { Icon: Zap, delay: 2.8, x: '75%', y: '30%', size: 20 },
    { Icon: Layers, delay: 0.4, x: '60%', y: '70%', size: 22 },
  ];

  return (
    <div className="min-h-screen pb-12 relative overflow-hidden">
      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Enhanced orbital rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] md:w-[700px] md:h-[700px] rounded-full border border-[#d6e86d]/15 animate-spin-slow" style={{ animationDuration: '30s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#d6e86d]/60 shadow-[0_0_30px_rgba(214,232,109,0.6)]" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[500px] md:h-[500px] rounded-full border border-[#d6e86d]/20 animate-spin-slow" style={{ animationDuration: '20s', animationDirection: 'reverse' }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-[#d6e86d]/70 shadow-[0_0_25px_rgba(214,232,109,0.5)]" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] md:w-[320px] md:h-[320px] rounded-full border border-[#d6e86d]/25 animate-spin-slow" style={{ animationDuration: '15s' }}>
            <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#d6e86d]/80 shadow-[0_0_25px_rgba(214,232,109,0.5)]" />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full bg-[#d6e86d]/8 blur-3xl" />
        </div>

        {/* Floating icons */}
        {floatingIcons.map(({ Icon, delay, x, y, size }, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none z-10"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: [0.15, 0.35, 0.15],
              y: [0, -15, 0],
              rotate: [0, 5, -5, 0],
            }}
            transition={{ duration: 5, delay, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon className="text-[#d6e86d]/30" style={{ width: size, height: size }} />
          </motion.div>
        ))}

        {/* Main content */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d6e86d]/10 border border-[#d6e86d]/20 text-[#d6e86d] text-sm font-medium mb-6"
              >
                <Sparkles className="w-4 h-4" />
                <span>Built for Developers</span>
              </motion.div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Build the{' '}
                <span className="gradient-text">Future</span>
                <br />
                Through Code
              </h1>

              <p className="text-lg text-white/60 max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
                A developer-first platform to share knowledge, write tutorials, 
                and connect with the global coding community.
              </p>

              <div className="flex justify-center lg:justify-start gap-4 md:gap-6 mb-8">
                {[
                  { label: 'Posts', value: stats.posts || posts.length, icon: BookOpen },
                  { label: 'Devs', value: stats.users || '1K+', icon: Users },
                  { label: 'Likes', value: stats.likes || '10K+', icon: Heart },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#d6e86d]/10 border border-[#d6e86d]/15 flex items-center justify-center">
                      <stat.icon className="w-4 h-4 text-[#d6e86d]" />
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-white">{stat.value}</div>
                      <div className="text-[10px] text-white/40">{stat.label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartWriting}
                  className="btn-neon flex items-center gap-2 px-8 py-4 text-base"
                >
                  Start Writing
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExplorePosts}
                  className="px-8 py-4 rounded-2xl border border-white/10 text-white/70 hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
                >
                  Explore Posts
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>

            {/* Right: REAL LAPTOP IMAGE */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative mt-8 lg:mt-0"
            >
              <div className="relative max-w-lg mx-auto">
                {/* Glow behind image */}
                <div className="absolute -inset-8 bg-[#d6e86d]/10 rounded-full blur-3xl pointer-events-none" />

                {/* Main laptop image */}
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60">
                  <img 
                    src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80" 
                    alt="Developer laptop with glowing code"
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                      // Fallback to another image if this fails
                      e.target.src = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop";
                    }}
                  />

                  {/* Overlay gradient for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030405]/60 via-transparent to-transparent" />

                  {/* Floating code snippet overlay */}
                  <motion.div 
                    className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-[10px] text-white/40 ml-2 font-mono">devblog.js</span>
                    </div>
                    <div className="font-mono text-[11px] text-[#d6e86d]/80 space-y-0.5">
                      <p>const devBlog = new Platform();</p>
                      <p>devBlog.connect(developers);</p>
                      <p className="text-white/40">{'>'} Ready on localhost:3000</p>
                    </div>
                  </motion.div>
                </div>

                {/* Floating accent elements */}
                <motion.div
                  className="absolute -top-4 -right-4 md:-right-6 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#d6e86d]/10 border border-[#d6e86d]/20 flex items-center justify-center backdrop-blur-sm"
                  animate={{ y: [0, -10, 0], rotate: [0, 8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-[#d6e86d]/70" />
                </motion.div>

                <motion.div
                  className="absolute -bottom-3 -left-3 md:-left-6 px-3 py-2 md:px-4 md:py-2 rounded-xl bg-[#0a0f0d]/95 border border-white/10 text-white/50 backdrop-blur-sm"
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium">2.4k online now</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-[#d6e86d]/60"
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* ===== SEARCH BAR ===== */}
      <section className="max-w-4xl mx-auto px-4 -mt-4 relative z-30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-strong rounded-2xl p-2 flex items-center gap-3"
        >
          <Search className="w-5 h-5 text-white/30 ml-3" />
          <input
            type="text"
            placeholder="Search posts, tutorials, topics..."
            className="flex-1 bg-transparent text-white placeholder-white/30 outline-none py-3"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchActive(true)}
            onBlur={() => setSearchActive(false)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-2 rounded-lg hover:bg-white/5 text-white/40"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/30 text-xs">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50">/</kbd>
            <span>to search</span>
          </div>
        </motion.div>
      </section>

      {/* ===== POSTS SECTION ===== */}
      <div ref={postsRef} className="max-w-7xl mx-auto px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#d6e86d]/10 border border-[#d6e86d]/20 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#d6e86d]" />
              </div>
              <h2 className="text-2xl font-bold text-white">Latest Posts</h2>
            </div>
            <p className="text-white/40 text-sm">Fresh knowledge from the community</p>
          </div>
          <div className="text-white/30 text-sm">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass h-72 loading-shimmer rounded-3xl" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-3xl p-16 text-center"
          >
            <Code2 className="w-12 h-12 text-[#d6e86d]/20 mx-auto mb-4" />
            <p className="text-white/40 text-lg">No posts found matching your search</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-[#d6e86d] hover:underline text-sm"
            >
              Clear search
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="h-full hover:border-[#d6e86d]/20 transition-all duration-300 group">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <Link to={`/user/${post.authorId}`} className="hover:opacity-80 transition-opacity">
                        {post.author?.avatar ? (
                          <img
                            src={post.author.avatar}
                            alt={post.author.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-[#d6e86d]/20"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d6e86d]/30 to-[#14B8A6]/30 flex items-center justify-center text-xs font-bold text-white">
                            {post.author?.name?.[0] || 'U'}
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0">
                        <Link
                          to={`/user/${post.authorId}`}
                          className="text-sm font-medium text-white hover:text-[#d6e86d] transition-colors truncate block"
                        >
                          {post.author?.name || 'Unknown'}
                        </Link>
                        <div className="flex items-center gap-1 text-xs text-white/40">
                          <Clock className="w-3 h-3" />
                          {formatDate(post.createdAt)}
                        </div>
                      </div>
                    </div>

                    <Link to={`/post/${post.id}`} className="flex-grow group/link">
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover/link:text-[#d6e86d] transition-colors">
                        <MarkdownRenderer content={post.title} />
                      </h3>
                      <p className="text-sm text-white/50 mb-4 line-clamp-3 leading-relaxed">
                        {post.content}
                      </p>
                    </Link>

                    {post.images && post.images.length > 0 && (
                      <Link to={`/post/${post.id}`} className="mb-4 block">
                        <div className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {post.images.length > 1 && (
                            <div className="px-3 py-1.5 text-xs text-white/40 bg-black/40">
                              +{post.images.length - 1} more
                            </div>
                          )}
                        </div>
                      </Link>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                      <div className="flex gap-2 flex-wrap">
                        {post.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="tag text-xs flex items-center gap-1 bg-[#d6e86d]/5 border-[#d6e86d]/10 text-[#d6e86d]/70"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <div onClick={(e) => e.stopPropagation()}>
                          <LikeButton postId={post.id} initialCount={post.likeCount || 0} />
                        </div>
                        <Link
                          to={`/post/${post.id}`}
                          className="flex items-center gap-1 text-white/40 hover:text-[#d6e86d] transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs">{post.commentCount || 0}</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ===== FEATURES SECTION ===== */}
      <section className="max-w-7xl mx-auto px-4 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d6e86d]/10 border border-[#d6e86d]/20 text-[#d6e86d] text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            <span>Why DevBlog?</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Everything a Developer Needs</h2>
          <p className="text-white/40 max-w-lg mx-auto">Built from the ground up for the modern developer workflow</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Terminal,
              title: 'Code-First Writing',
              desc: 'Markdown support with syntax highlighting for every language. Write tutorials that actually look good.',
            },
            {
              icon: Users,
              title: 'Live Community',
              desc: 'Real-time chat, DMs, and community channels. Connect with developers worldwide instantly.',
            },
            {
              icon: Sparkles,
              title: 'AI Assistant',
              desc: 'Betty AI helps you write, review code, and answer questions 24/7 inside the platform.',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="glass p-8 rounded-3xl h-full hover:border-[#d6e86d]/20 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-[#d6e86d]/10 border border-[#d6e86d]/20 flex items-center justify-center mb-5 group-hover:bg-[#d6e86d]/15 transition-colors">
                  <feature.icon className="w-7 h-7 text-[#d6e86d]" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/50 leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-strong rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#d6e86d]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to share your knowledge?
            </h2>
            <p className="text-white/50 max-w-lg mx-auto mb-8">
              Join thousands of developers who use DevBlog to document, teach, and grow together.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartWriting}
              className="btn-neon px-10 py-4 text-base inline-flex items-center gap-2"
            >
              {isAuthenticated ? 'Write Your First Post' : 'Join DevBlog'}
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default Home;