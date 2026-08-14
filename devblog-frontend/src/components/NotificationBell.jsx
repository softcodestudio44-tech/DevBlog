import React, { useState, useRef, useEffect } from 'react';
import { Bell, MessageCircle, Heart, UserPlus, AtSign, Hash, X, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const previousUnreadRef = useRef(0);

  useEffect(() => {
    if (unreadCount > previousUnreadRef.current && !showDropdown) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New notification on DevBlog');
      }
    }
    previousUnreadRef.current = unreadCount;
  }, [unreadCount, showDropdown]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.read) markAsRead(notification.id);
    setShowDropdown(false);

    let path = null;
    const type = notification.type;
    if (type === 'like' || type === 'comment' || type === 'reply' || type === 'mention') {
      path = notification.source_id ? `/post/${notification.source_id}` : null;
    } else if (type === 'follow') {
      const target = notification.actor_id || notification.source_id;
      path = target ? `/user/${target}` : null;
    } else if (type === 'message' || type === 'dm') {
      const target = notification.actor_id || notification.source_id;
      path = target ? `/messages?user=${target}` : '/messages';
    } else if (type === 'channel') {
      path = '/community';
    }

    if (path) navigate(path);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-400" />;
      case 'comment':
      case 'reply': return <MessageCircle className="w-4 h-4 text-primary-400" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-purple-400" />;
      case 'mention': return <AtSign className="w-4 h-4 text-yellow-400" />;
      case 'message': return <MessageCircle className="w-4 h-4 text-primary-400" />;
      case 'channel': return <Hash className="w-4 h-4 text-primary-400" />;
      default: return <Bell className="w-4 h-4 text-primary-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-xl hover:bg-white/[0.03] text-white/70 hover:text-white transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 z-40"
            >
              <div className="glass-strong rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-8 h-8 text-white/20 mx-auto mb-3" />
                      <p className="text-sm text-white/40">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`block p-4 border-b border-white/[0.02] cursor-pointer transition-all hover:bg-white/[0.02] ${
                          !notification.read ? 'bg-primary/[0.02]' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3">
                          {notification.actor?.avatar ? (
                            <img src={notification.actor.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {notification.actor?.name?.[0] || 'N'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-white/80 leading-relaxed">
                              {notification.message}
                            </p>
                            <span className="text-[10px] text-white/30 mt-1 block">
                              {new Date(notification.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {!notification.read && <div className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0 mt-1.5" />}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;