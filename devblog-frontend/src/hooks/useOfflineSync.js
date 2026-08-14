import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { readQueue, writeQueue, isOnline } from '../lib/offline';

export const useOfflineSync = (user, toast) => {
  const flush = useCallback(async () => {
    if (!user?.id || !isOnline()) return;
    const queue = readQueue();
    if (!queue.length) return;

    let synced = 0;
    const remaining = [];

    for (const action of queue) {
      try {
        if (action.type === 'create-post') {
          const { error } = await supabase
            .from('posts')
            .insert({ ...action.payload, author_id: user.id, is_draft: false });
          if (error) throw error;
          synced += 1;
        } else if (action.type === 'like') {
          const { error } = await supabase.from('likes').insert(action.payload);
          if (error) {
            if (error.code === '23505') {
              synced += 1;
            } else {
              throw error;
            }
          } else {
            synced += 1;
          }
        } else if (action.type === 'unlike') {
          const { error } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', action.payload.post_id)
            .eq('user_id', action.payload.user_id);
          if (error) throw error;
          synced += 1;
        } else if (action.type === 'dm') {
          const { error } = await supabase.from('direct_messages').insert(action.payload);
          if (error) throw error;
          synced += 1;
        } else if (action.type === 'channel-message') {
          const { error } = await supabase.from('messages').insert(action.payload);
          if (error) throw error;
          synced += 1;
        } else {
          remaining.push(action);
        }
      } catch {
        remaining.push(action);
      }
    }

    writeQueue(remaining);
    if (synced > 0) {
      toast({
        type: 'success',
        title: `Synced ${synced} action${synced > 1 ? 's' : ''}`,
        body: 'Your offline changes are now live',
      });
    }
  }, [user?.id, toast]);

  useEffect(() => {
    const onOnline = () => flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  return flush;
};
