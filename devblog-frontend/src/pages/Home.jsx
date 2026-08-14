import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Search, X, MessageCircle, BookOpen, PenLine, Share2, Check, Flame, Heart, RefreshCw
} from 'lucide-react';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LikeButton from '../components/LikeButton';
import MarkdownRenderer from '../components/MarkdownRenderer';
import FloatingBettyAI from '../components/FloatingBettyAI';
import OnlineDot from '../components/OnlineDot';

const CATEGORIES = [
  { name: 'All', tag: 'tag-blue' },
  { name: 'JavaScript', tag: 'tag-amber' },
  { name: 'React', tag: 'tag-cyan' },
  { name: 'Python', tag: 'tag-emerald' },
  { name: 'AI', tag: 'tag-violet' },
  { name: 'DevOps', tag: 'tag-fuchsia' },
  { name: 'Tutorial', tag: 'tag-pink' },
];

const AVATAR_GRADIENTS = [
  'from-blue-500 to-violet-500',
  'from-violet-500 to-fuchsia-500',
  'from-pink-500 to-rose-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-cyan-500 to-blue-500',
  'from-fuchsia-500 to-pink-500',
  'from-indigo-500 to-purple-500',
];

const avatarGradient = (id = '') => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
};

const tagColorFor = (tag = '') => {
  const t = tag.toLowerCase();
  if (t.includes('ai') || t.includes('ml') || t.includes('data')) return 'tag-violet';
  if (t.includes('react') || t.includes('js') || t.includes('web') || t.includes('frontend')) return 'tag-cyan';
  if (t.includes('python') || t.includes('django') || t.includes('flask')) return 'tag-emerald';
  if (t.includes('devops') || t.includes('docker') || t.includes('kubernetes') || t.includes('cloud')) return 'tag-fuchsia';
  if (t.includes('tutorial') || t.includes('guide') || t.includes('learn')) return 'tag-pink';
  if (t.includes('backend') || t.includes('api') || t.includes('node')) return 'tag-amber';
  return 'tag-blue';
};

const PULL_THRESHOLD = 70;

const Home = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { posts, loading, loadingMore, hasMore, refresh, loadMore } = usePosts();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);
  const [burst, setBurst] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const lastTapRef = useRef(0);
  const navTimerRef = useRef(null);
  const touchStartYRef = useRef(0);
  const pullingRef = useRef(false);
  const sentinelRef = useRef(null);
  const scrollYRef = useRef(0);

  // Track scroll position for pull-to-refresh
  useEffect(() => {
    const onScroll = () => { scrollYRef.current = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMore]);

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      activeCategory === 'All' ||
      post.tags?.some((tag) => tag.toLowerCase().includes(activeCategory.toLowerCase()));

    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleShare = async (post) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const triggerLike = useCallback((post) => {
    if (!isAuthenticated) return;
    setBurst({ postId: post.id, key: Date.now() });
    window.dispatchEvent(new CustomEvent('devblog:like', { detail: { postId: post.id } }));
  }, [isAuthenticated]);

  // Double-tap like (touch) with delayed navigation so the first tap can be cancelled
  const handleArticleTouchEnd = (e, post) => {
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
      e.preventDefault();
      e.stopPropagation();
      triggerLike(post);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => navigate(`/post/${post.id}`), 380);
    e.preventDefault();
    e.stopPropagation();
  };

  // Double-click like (desktop); single click on the card body navigates
  const handleArticleClick = (e, post) => {
    if (e.detail === 2) {
      triggerLike(post);
      return;
    }
    if (e.target.closest('a, button')) return;
    navigate(`/post/${post.id}`);
  };

  // Pull to refresh
  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
    pullingRef.current = false;
    setPullDistance(0);
  };

  const handleTouchMove = (e) => {
    if (scrollYRef.current > 0) return;
    const deltaY = e.touches[0].clientY - touchStartYRef.current;
    if (deltaY > 0) {
      pullingRef.current = true;
      setPullDistance(Math.min(deltaY * 0.5, 110));
    }
  };

  const handleTouchEnd = async () => {
    if (pullingRef.current && pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(64);
      await refresh();
      setRefreshing(false);
      toast({ type: 'success', title: 'Feed updated', body: 'Showing the latest posts.' });
    } else {
      setPullDistance(0);
    }
    pullingRef.current = false;
  };

  const isFiltering = searchQuery || activeCategory !== 'All';

  return (
    <div
      className="app-column px-4 pb-10"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <motion.div
        animate={{ height: pullDistance > 0 ? pullDistance : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="overflow-hidden flex items-center justify-center text-white/40"
      >
        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
      </motion.div>

      {/* App header */}
      <header className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold brand-gradient-text flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-violet-400" />
              Feed
            </h1>
            <p className="text-xs text-white/40 mt-0.5">Latest from the community</p>
          </div>
          {isAuthenticated && (
            <Link
              to="/create"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition-all shadow-lg shadow-violet-500/20"
            >
              <PenLine className="w-4 h-4" />
              Write
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#0d0f16] border border-white/[0.06] rounded-xl px-3.5 py-2.5 focus-within:border-violet-400/40 transition-colors">
          <Search className="w-4 h-4 text-white/30 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search posts, topics, tags..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none min-w-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-md hover:bg-white/5 text-white/40"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Trending topics */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar">
          <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat.name
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md shadow-violet-500/20'
                  : `border border-white/[0.08] text-white/50 hover:text-white hover:border-white/20`
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="panel p-4 loading-shimmer">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-white/[0.04]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 rounded bg-white/[0.05]" />
                  <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
                </div>
              </div>
              <div className="h-4 w-3/4 rounded bg-white/[0.05] mb-2" />
              <div className="h-3 w-full rounded bg-white/[0.04] mb-1.5" />
              <div className="h-3 w-5/6 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="panel p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-violet-400/60" />
          </div>
          {isFiltering ? (
            <>
              <p className="text-white/70 text-sm font-medium">No posts found</p>
              <p className="text-xs text-white/40 mt-1">Try a different search or category.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition-all"
              >
                Reset filters
              </button>
            </>
          ) : (
            <>
              <p className="text-white/70 text-sm font-medium">No posts yet</p>
              <p className="text-xs text-white/40 mt-1">Be the first to share something.</p>
              {isAuthenticated && (
                <Link
                  to="/create"
                  className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition-all"
                >
                  <PenLine className="w-4 h-4" />
                  Write a post
                </Link>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post, index) => {
            const isFeatured = !isFiltering && index === 0;
            const gradient = avatarGradient(post.author_id);
            return (
              <article
                key={post.id}
                className={`relative ${isFeatured ? 'p-[1.5px] rounded-[20px] bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/10' : ''}`}
                onTouchEnd={(e) => handleArticleTouchEnd(e, post)}
                onClick={(e) => handleArticleClick(e, post)}
              >
                {/* Double-tap heart burst */}
                <AnimatePresence>
                  {burst?.postId === post.id && (
                    <motion.div
                      key={burst.key}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.4, 1, 1.3], y: [0, -20, -50] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7 }}
                      className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                    >
                      <Heart className="w-20 h-20 text-pink-400 fill-pink-400 drop-shadow-[0_0_20px_rgba(244,114,182,0.8)]" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`panel p-4 h-full transition-colors ${isFeatured ? 'rounded-[19px] bg-[#0b0d14]' : 'hover:border-white/[0.12]'}`}>
                  {/* Author */}
                  <div className="flex items-center gap-3 mb-3">
                    <Link
                      to={`/user/${post.author_id}`}
                      className="hover:opacity-80 transition-opacity flex-shrink-0 relative"
                      onTouchEnd={(e) => e.stopPropagation()}
                    >
                      {post.author?.avatar ? (
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/10`}>
                          {post.author?.name?.[0] || 'U'}
                        </div>
                      )}
                      <OnlineDot userId={post.author_id} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/user/${post.author_id}`}
                          className="text-sm font-semibold text-white hover:text-violet-300 transition-colors truncate"
                          onTouchEnd={(e) => e.stopPropagation()}
                        >
                          {post.author?.name || 'Unknown'}
                        </Link>
                        {isFeatured && (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-white bg-gradient-to-r from-blue-600 to-fuchsia-600">
                            <Flame className="w-3 h-3" />
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/40">
                        <Clock className="w-3 h-3" />
                        {formatDate(post.created_at)}
                      </div>
                    </div>
                    {post.tags?.[0] && (
                      <span className={`tag ${tagColorFor(post.tags[0])} flex-shrink-0`}>
                        {post.tags[0]}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <h2 className="text-base font-semibold text-white leading-snug mb-1.5 group-hover:text-violet-300 transition-colors">
                    <MarkdownRenderer content={post.title} />
                  </h2>
                  <p className="text-sm text-white/50 leading-relaxed line-clamp-3">
                    {post.content}
                  </p>

                  {post.images && post.images.length > 0 && (
                    <div className="mt-3">
                      <div className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
                        <img
                          src={post.images[0]}
                          alt={post.title}
                          className="w-full h-44 object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
                      <LikeButton postId={post.id} authorId={post.author_id} initialCount={post.likeCount || 0} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/post/${post.id}`}
                        className="flex items-center gap-1.5 text-white/40 hover:text-violet-300 transition-colors text-sm"
                        onTouchEnd={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-[18px] h-[18px]" />
                        <span>{post.commentCount || 0}</span>
                      </Link>
                      <button
                        onClick={() => handleShare(post)}
                        className="flex items-center gap-1.5 text-white/40 hover:text-violet-300 transition-colors text-sm"
                        title="Copy link"
                        onTouchEnd={(e) => e.stopPropagation()}
                      >
                        {copiedId === post.id ? (
                          <Check className="w-[18px] h-[18px] text-emerald-400" />
                        ) : (
                          <Share2 className="w-[18px] h-[18px]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex items-center justify-center py-6">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  Loading more...
                </div>
              ) : (
                <p className="text-xs text-white/25">Scroll for more</p>
              )}
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-center text-xs text-white/25 py-6">You're all caught up</p>
          )}
        </div>
      )}

      <FloatingBettyAI />
    </div>
  );
};

export default Home;
