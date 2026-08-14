import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { isOnline, enqueueAction } from '../lib/offline';

const MESSAGE_SELECT = `*, author:profiles(id, name, avatar, email)`;

export const useMessages = (channelId) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(channelId);

  useEffect(() => {
    channelRef.current = channelId;
  }, [channelId]);

  // Fetch messages for the channel
  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!channelId) return;

    fetchMessages();

    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const { data, error } = await supabase
            .from('messages')
            .select(MESSAGE_SELECT)
            .eq('id', payload.new.id)
            .single();
          if (error || !data) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [...prev, data];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updated = payload.new;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, fetchMessages]);

  // Send a message
  const sendMessage = useCallback(
    async (content) => {
      if (!content?.trim() || !channelId || !user?.id) return null;

      // Offline: queue the message and echo it locally
      if (!isOnline()) {
        const queuedAt = new Date().toISOString();
        enqueueAction({
          type: 'channel-message',
          payload: {
            content: content.trim(),
            channel_id: channelId,
            author_id: user.id,
            created_at: queuedAt,
          },
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `offline-${queuedAt}`,
            content: content.trim(),
            channel_id: channelId,
            author_id: user.id,
            created_at: queuedAt,
            queued: true,
            author: { id: user.id, name: user.name, avatar: user.avatar },
          },
        ]);
        return { id: `offline-${queuedAt}`, queued: true };
      }

      try {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            content: content.trim(),
            channel_id: channelId,
            author_id: user.id,
          })
          .select(MESSAGE_SELECT)
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Error sending message:', err);
        setError(err.message);
        return { error: err.message };
      }
    },
    [channelId, user?.id]
  );

  // Delete a message.
  // mode 'everyone' -> soft delete (deleted_at) visible to everyone.
  // mode 'me'       -> hide it locally only.
  // mode 'hard'     -> permanently remove the row (admin).
  const deleteMessage = useCallback(
    async (messageId, { mode = 'everyone' } = {}) => {
      try {
        if (mode === 'hard') {
          const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);
          if (error) throw error;
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
          return true;
        }

        if (mode === 'everyone') {
          const { error } = await supabase
            .from('messages')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', messageId);
          if (error) throw error;
          return true;
        }

        // mode 'me'
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        return true;
      } catch (err) {
        console.error('Error deleting message:', err);
        setError(err.message);
        return false;
      }
    },
    []
  );

  return {
    messages,
    loading,
    error,
    sendMessage,
    deleteMessage,
    refresh: fetchMessages,
  };
};

export default useMessages;
