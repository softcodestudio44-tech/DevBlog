import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const usePosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all published posts with author info
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(id, name, avatar, email),
          likes:likes(count),
          comments:comments(count)
        `)
        .eq('is_draft', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the expected format
      const transformed = (data || []).map((post) => ({
        ...post,
        likeCount: post.likes?.[0]?.count || 0,
        commentCount: post.comments?.[0]?.count || 0,
        likes: undefined,
        comments: undefined,
      }));

      setPosts(transformed);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to new posts, likes, and comments
  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: 'is_draft=eq.false',
        },
        async (payload) => {
          const newPost = payload.new;
          // Fetch the full post with author info
          const { data } = await supabase
            .from('posts')
            .select(`
              *,
              author:profiles(id, name, avatar, email),
              likes:likes(count),
              comments:comments(count)
            `)
            .eq('id', newPost.id)
            .single();

          if (data) {
            setPosts((prev) => {
              if (prev.some((p) => p.id === data.id)) return prev;
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
          setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
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
            prev.map((p) =>
              p.id === post_id ? { ...p, likeCount: (p.likeCount || 0) + 1 } : p
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
            prev.map((p) =>
              p.id === post_id
                ? { ...p, likeCount: Math.max(0, (p.likeCount || 0) - 1) }
                : p
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
            prev.map((p) =>
              p.id === post_id
                ? { ...p, commentCount: (p.commentCount || 0) + 1 }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  // Create a post
  const createPost = useCallback(
    async ({ title, content, tags, images }) => {
      if (!user?.id) return { data: null, error: 'Not authenticated' };

      try {
        const { data, error } = await supabase
          .from('posts')
          .insert({
            title,
            content,
            tags: tags || [],
            images: images || [],
            is_draft: false,
            author_id: user.id,
          })
          .select(`
            *,
            author:profiles(id, name, avatar, email)
          `)
          .single();

        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error('Error creating post:', err);
        return { data: null, error: err.message };
      }
    },
    [user?.id]
  );

  // Update a post
  const updatePost = useCallback(
    async (postId, updates) => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .update(updates)
          .eq('id', postId)
          .select(`
            *,
            author:profiles(id, name, avatar, email)
          `)
          .single();

        if (error) throw error;
        return { data, error: null };
      } catch (err) {
        console.error('Error updating post:', err);
        return { data: null, error: err.message };
      }
    },
    []
  );

  // Delete a post
  const deletePost = useCallback(async (postId) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      return { data: true, error: null };
    } catch (err) {
      console.error('Error deleting post:', err);
      return { data: null, error: err.message };
    }
  }, []);

  // Toggle like on a post
  const toggleLike = useCallback(
    async (postId) => {
      if (!user?.id) return { data: null, error: 'Not authenticated' };

      try {
        // Check if already liked
        const { data: existing } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          // Unlike
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
          return { data: { liked: false }, error: null };
        } else {
          // Like
          const { data, error } = await supabase
            .from('likes')
            .insert({ post_id: postId, user_id: user.id })
            .select()
            .single();
          if (error) throw error;
          return { data: { liked: true, like: data }, error: null };
        }
      } catch (err) {
        console.error('Error toggling like:', err);
        return { data: null, error: err.message };
      }
    },
    [user?.id]
  );

  // Check if user liked a post
  const hasLiked = useCallback(
    async (postId) => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    [user?.id]
  );

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    toggleLike,
    hasLiked,
    refresh: fetchPosts,
  };
};

export default usePosts;