import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { sendNotification } from '../lib/notify';
import { isOnline, enqueueAction } from '../lib/offline';

export const useDirectMessages = (otherUserId) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const otherUserRef = useRef(otherUserId);

  useEffect(() => {
    otherUserRef.current = otherUserId;
  }, [otherUserId]);

  // Fetch DMs between current user and other user
  const fetchMessages = useCallback(async () => {
    if (!otherUserId || !user?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!direct_messages_sender_id_fkey(id, name, avatar, email),
          recipient:profiles!direct_messages_recipient_id_fkey(id, name, avatar, email)
        `)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching DMs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [otherUserId, user?.id]);

  // Subscribe to new DMs
  useEffect(() => {
    if (!otherUserId || !user?.id) return;

    fetchMessages();

    const channel = supabase
      .channel(`dm:${user.id}:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `and(sender_id=eq.${user.id},recipient_id=eq.${otherUserId})`,
        },
        (payload) => {
          const newMessage = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `and(sender_id=eq.${otherUserId},recipient_id=eq.${user.id})`,
        },
        (payload) => {
          const newMessage = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUserId, user?.id, fetchMessages]);

  // Send a DM
  const sendMessage = useCallback(
    async (content) => {
      if (!content?.trim() || !otherUserId || !user?.id) return null;

      // Offline: queue the DM for sync and echo it locally
      if (!isOnline()) {
        const queuedAt = new Date().toISOString();
        enqueueAction({
          type: 'dm',
          payload: {
            content: content.trim(),
            sender_id: user.id,
            recipient_id: otherUserId,
            created_at: queuedAt,
          },
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `offline-${queuedAt}`,
            content: content.trim(),
            sender_id: user.id,
            recipient_id: otherUserId,
            created_at: queuedAt,
            queued: true,
            sender: { id: user.id, name: user.name, avatar: user.avatar },
          },
        ]);
        return { id: `offline-${queuedAt}`, queued: true };
      }

      try {
        const { data, error } = await supabase
          .from('direct_messages')
          .insert({
            content: content.trim(),
            sender_id: user.id,
            recipient_id: otherUserId,
          })
          .select(`
            *,
            sender:profiles!direct_messages_sender_id_fkey(id, name, avatar, email),
            recipient:profiles!direct_messages_recipient_id_fkey(id, name, avatar, email)
          `)
          .single();

        if (error) throw error;
        if (otherUserId !== user.id) {
          await sendNotification({
            userId: otherUserId,
            type: 'message',
            message: `${user.name || 'Someone'} sent you a message`,
            sourceId: otherUserId,
            sourceType: 'user',
            actorId: user.id,
          });
        }
        return data;
      } catch (err) {
        console.error('Error sending DM:', err);
        setError(err.message);
        return null;
      }
    },
    [otherUserId, user?.id]
  );

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!otherUserId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', otherUserId)
        .eq('recipient_id', user.id)
        .is('read_at', null);

      if (error) throw error;
    } catch (err) {
      console.error('Error marking DMs as read:', err);
    }
  }, [otherUserId, user?.id]);

  // Delete a DM
  const deleteMessage = useCallback(
    async (messageId) => {
      try {
        const { error } = await supabase
          .from('direct_messages')
          .delete()
          .eq('id', messageId);
        if (error) throw error;
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        return true;
      } catch (err) {
        console.error('Error deleting DM:', err);
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
    markAsRead,
    refresh: fetchMessages,
  };
};

export default useDirectMessages;