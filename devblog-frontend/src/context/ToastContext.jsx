import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, UserPlus, Bell, MessageSquare, CheckCircle2, WifiOff } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const ToastContext = createContext();

const TOAST_ICONS = {
  like: { icon: Heart, color: 'text-pink-400' },
  comment: { icon: MessageSquare, color: 'text-violet-300' },
  follow: { icon: UserPlus, color: 'text-blue-300' },
  message: { icon: MessageCircle, color: 'text-emerald-300' },
  notification: { icon: Bell, color: 'text-primary-300' },
  success: { icon: CheckCircle2, color: 'text-emerald-300' },
  offline: { icon: WifiOff, color: 'text-amber-300' },
};

const ToastItem = ({ toast, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, []);

  const meta = TOAST_ICONS[toast.type] || TOAST_ICONS.notification;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={onDone}
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl glass-strong shadow-xl shadow-black/40 max-w-sm cursor-pointer"
    >
      <div className={`w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 ${meta.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{toast.title}</p>
        {toast.body && <p className="text-xs text-white/50 truncate">{toast.body}</p>}
      </div>
    </motion.div>
  );
};

export const ToastProvider = ({ children }) => {
  const { user } = useAuth();
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback(({ type = 'notification', title, body, duration }) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, body, duration }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Global realtime listener: surface social events as toasts
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`toasts:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new;
          if (!n || n.actor_id === user.id) return;
          const type = ['like', 'comment', 'follow', 'message'].includes(n.type) ? n.type : 'notification';
          toast({
            type,
            title: n.message || 'New notification',
            body: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none w-full max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDone={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
