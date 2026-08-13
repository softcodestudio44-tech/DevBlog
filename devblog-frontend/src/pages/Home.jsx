import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, Search, X, MessageCircle, BookOpen, PenLine, Share2, Check, Flame
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import LikeButton from '../components/LikeButton';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useAuth } from '../context/AuthContext';

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

const Home = () => {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  // Subscribe to real-time post updates
  useEffect(() => {
    const channel = supabase
      .channel('home-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: 'is_draft=eq.false',
        },
        async (payload) => {
          const { data } = await supabase
            .from('posts')
            .select(`
              *,
              author:profiles!posts_author_id_fkey(id, name, avatar, email),
              likes:likes(count),
              comments:comments(count)
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            setPosts((prev) => {
              if (prev.find((p) => p.id === data.id)) return prev;
              return [{
                ...data,
                likeCount: data.likes?.[0]?.count || 0,
                commentCount: data.comments?.[0]?.count || 0,
                likes: undefined,
                comments: undefined,
              }, ...prev];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          setPosts((prev) => prev.filter((post) => post.id !== payload.old.id));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'likes',
        },
        (payload) => {
          const { post_id } = payload.new;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === post_id
                ? { ...post, likeCount: (post.likeCount || 0) + 1 }
                : post
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'likes',
        },
        (payload) => {
          const { post_id } = payload.old;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === post_id
                ? { ...post, likeCount: Math.max(0, (post.likeCount || 0) - 1) }
                : post
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
        },
        (payload) => {
          const { post_id } = payload.new;
          setPosts((prev) =>
            prev.map((post) =>
              post.id === post_id
                ? { ...post, commentCount: (post.commentCount || 0) + 1 }
                : post
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, name, avatar, email),
          likes:likes(count),
          comments:comments(count)
        `)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformed = (data || []).map((post) => ({
        ...post,
        likeCount: post.likes?.[0]?.count || 0,
        commentCount: post.comments?.[0]?.count || 0,
        likes: undefined,
        comments: undefined,
      }));

      setPosts(transformed);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const isFiltering = searchQuery || activeCategory !== 'All';

  return (
    <div className="app-column px-4 pb-10">
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
              <article key={post.id} className={isFeatured ? 'p-[1.5px] rounded-[20px] bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/10' : ''}>
                <div className={`panel p-4 h-full transition-colors ${isFeatured ? 'rounded-[19px] bg-[#0b0d14]' : 'hover:border-white/[0.12]'}`}>
                  {/* Author */}
                  <div className="flex items-center gap-3 mb-3">
                    <Link to={`/user/${post.author_id}`} className="hover:opacity-80 transition-opacity flex-shrink-0">
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
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Link
                          to={`/user/${post.author_id}`}
                          className="text-sm font-semibold text-white hover:text-violet-300 transition-colors truncate"
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
                  <Link to={`/post/${post.id}`} className="block group">
                    <h2 className="text-base font-semibold text-white leading-snug mb-1.5 group-hover:text-violet-300 transition-colors">
                      <MarkdownRenderer content={post.title} />
                    </h2>
                    <p className="text-sm text-white/50 leading-relaxed line-clamp-3">
                      {post.content}
                    </p>
                  </Link>

                  {post.images && post.images.length > 0 && (
                    <Link to={`/post/${post.id}`} className="mt-3 block">
                      <div className="rounded-xl overflow-hidden bg-white/5 border border-white/5">
                        <img
                          src={post.images[0]}
                          alt={post.title}
                          className="w-full h-44 object-cover"
                          loading="lazy"
                        />
                      </div>
                    </Link>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <LikeButton postId={post.id} authorId={post.author_id} initialCount={post.likeCount || 0} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/post/${post.id}`}
                        className="flex items-center gap-1.5 text-white/40 hover:text-violet-300 transition-colors text-sm"
                      >
                        <MessageCircle className="w-[18px] h-[18px]" />
                        <span>{post.commentCount || 0}</span>
                      </Link>
                      <button
                        onClick={() => handleShare(post)}
                        className="flex items-center gap-1.5 text-white/40 hover:text-violet-300 transition-colors text-sm"
                        title="Copy link"
                      >
                        {copiedId === post.id ? (
                          <Check className="w-[18px] h-[18px] text-emerald-400" />
                        ) : (
                          <Share2 className="w-[18px] h-[18px]" />
                        )}
                      </button>
                      <Link
                        to={`/post/${post.id}`}
                        className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Read
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Home;
