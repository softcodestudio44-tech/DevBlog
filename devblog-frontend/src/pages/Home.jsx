import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Tag, ArrowRight, Sparkles, Code2, Terminal, Braces, Database, Globe, Heart, MessageCircle, Search } from 'lucide-react';
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

  useEffect(() => {
    fetchPosts();
  }, []);

  // Real-time socket listeners
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
    { Icon: Code2, delay: 0, x: '10%', y: '20%' },
    { Icon: Terminal, delay: 2, x: '85%', y: '15%' },
    { Icon: Braces, delay: 4, x: '75%', y: '60%' },
    { Icon: Database, delay: 1, x: '15%', y: '70%' },
    { Icon: Globe, delay: 3, x: '50%', y: '85%' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Floating tech icons */}
      {floatingIcons.map(({ Icon, delay, x, y }, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none opacity-20"
          style={{ left: x, top: y }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 6,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Icon className="w-12 h-12 text-emerald-400" />
        </motion.div>
      ))}

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16 max-w-4xl mx-auto relative"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 border-emerald-500/30"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-300 font-medium">Developer Community</span>
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="text-white">Code.</span>
          <span className="gradient-text"> Write.</span>
          <span className="text-white"> Share.</span>
        </h1>

        <p className="text-lg text-white max-w-2xl mx-auto mb-8 leading-relaxed">
          Join thousands of developers sharing knowledge, tutorials, and insights. 
          Your code journey starts here.
        </p>

        {/* Search Bar - Fixed */}
        <div className="max-w-lg mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search posts by title, content, or tags..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 pl-12 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.05] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchActive(true)}
              onBlur={() => setSearchActive(false)}
            />
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${searchActive ? 'text-emerald-400' : 'text-white/50'}`} />
          </div>
          {searchQuery && (
            <p className="text-sm text-emerald-400 mt-2">
              {filteredPosts.length} result{filteredPosts.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Code preview card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-strong max-w-lg mx-auto p-4 mb-8 text-left"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-white/50 ml-2 font-mono">devblog.js</span>
          </div>
          <pre className="font-mono text-sm text-emerald-300 overflow-x-auto">
            <code>{`const developer = {
  name: "You",
  passion: "Building things",
  community: "DevBlog",
  status: "Ready to learn 🚀"
};

// Start your journey today`}</code>
          </pre>
        </motion.div>

        <div className="flex gap-4 justify-center">
          <button 
            onClick={handleStartWriting}
            className="btn-neon flex items-center gap-2"
          >
            Start Writing
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={handleExplorePosts}
            className="px-6 py-3 rounded-xl border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition-colors"
          >
            Explore Posts
          </button>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="glass max-w-4xl mx-auto mb-16 p-6 flex justify-around flex-wrap gap-6"
      >
        <div className="text-center">
          <div className="text-3xl font-bold gradient-text">1K+</div>
          <div className="text-sm text-white">Developers</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold gradient-text">500+</div>
          <div className="text-sm text-white">Articles</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold gradient-text">50+</div>
          <div className="text-sm text-white">Topics</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold gradient-text">24/7</div>
          <div className="text-sm text-white">Community</div>
        </div>
      </motion.div>

      {/* Posts Section */}
      <div ref={postsRef} className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-white">Latest Posts</h2>
            <p className="text-white text-sm mt-1">Fresh from the community</p>
          </div>
          <div className="text-white text-sm">{filteredPosts.length} posts</div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass h-64 loading-shimmer rounded-3xl" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <GlassCard className="text-center py-16">
            <Code2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-white text-lg">No posts found. Try a different search!</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, index) => (
              <GlassCard key={post.id} delay={index * 0.1}>
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <Link to={`/user/${post.authorId}`} className="hover:opacity-80 transition-opacity">
                      {post.author?.avatar ? (
                        <img 
                          src={post.author.avatar} 
                          alt={post.author.name} 
                          className="w-8 h-8 rounded-full object-cover border border-emerald-500/30" 
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                          {post.author?.name?.[0] || 'U'}
                        </div>
                      )}
                    </Link>
                    <div>
                      <Link to={`/user/${post.authorId}`} className="text-sm font-medium text-white hover:text-emerald-300 transition-colors">
                        {post.author?.name || 'Unknown'}
                      </Link>
                      <div className="flex items-center gap-1 text-xs text-white/60">
                        <Clock className="w-3 h-3" />
                        {formatDate(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  <Link to={`/post/${post.id}`} className="flex-grow">
                    <h3 className="text-xl font-semibold mb-3 text-white line-clamp-2 hover:text-emerald-300 transition-colors">
                      <MarkdownRenderer content={post.title} />
                    </h3>
                    <p className="text-white text-sm mb-4 line-clamp-3">{post.content}</p>
                  </Link>

                  {/* Post Images Preview */}
                  {post.images && post.images.length > 0 && (
                    <Link to={`/post/${post.id}`} className="mb-4 block">
                      <div className="rounded-lg overflow-hidden bg-white/5">
                        <img 
                          src={post.images[0]} 
                          alt={post.title}
                          className="w-full h-48 object-contain"
                        />
                        {post.images.length > 1 && (
                          <p className="text-xs text-white/50 mt-1 text-center">+{post.images.length - 1} more</p>
                        )}
                      </div>
                    </Link>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                    <div className="flex gap-2 flex-wrap">
                      {post.tags?.slice(0, 2).map((tag) => (
                        <span key={tag} className="tag flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Like button clickable from feed */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <LikeButton postId={post.id} initialCount={post.likeCount || 0} />
                      </div>
                      <Link to={`/post/${post.id}`} className="flex items-center gap-1 text-white hover:text-emerald-300 transition-colors">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{post.commentCount || 0}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;