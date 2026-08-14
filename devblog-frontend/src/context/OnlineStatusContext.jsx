import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const OnlineStatusContext = createContext();

const ONLINE_WINDOW_MS = 5 * 60 * 1000; // consider online if last_seen within 5 min
const POLL_INTERVAL_MS = 60 * 1000; // refresh the online list every minute
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // write last_seen every minute

export const OnlineStatusProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [onlineIds, setOnlineIds] = useState(new Set());
  const heartbeatRef = useRef(null);
  const pollRef = useRef(null);

  // Heartbeat: keep the current user's last_seen fresh while the app is open
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const beat = () => {
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error('Heartbeat error:', error);
        })
        .catch(() => {});
    };

    beat();
    heartbeatRef.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (!document.hidden) beat();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [isAuthenticated, user?.id]);

  // Poll the list of recently-active users
  const fetchOnline = useCallback(async () => {
    try {
      const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .gte('last_seen', cutoff);
      if (error) throw error;
      setOnlineIds(new Set((data || []).map((p) => p.id)));
    } catch (err) {
      console.error('Error fetching online users:', err);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setOnlineIds(new Set());
      return;
    }

    fetchOnline();
    pollRef.current = setInterval(fetchOnline, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isAuthenticated, fetchOnline]);

  const isOnline = useCallback((userId) => (userId ? onlineIds.has(userId) : false), [onlineIds]);

  return (
    <OnlineStatusContext.Provider value={{ onlineIds, isOnline }}>
      {children}
    </OnlineStatusContext.Provider>
  );
};

export const useOnlineStatus = () => useContext(OnlineStatusContext);

export default OnlineStatusProvider;
