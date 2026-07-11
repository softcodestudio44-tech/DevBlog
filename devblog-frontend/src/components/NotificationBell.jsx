import React, { useState, useEffect, useRef } from 'react';
import { Bell, MessageCircle, Heart, UserPlus, AtSign, Hash, X, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const NotificationBell = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const previousUnreadRef = useRef(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleFollowUpdate = () => {
      fetchNotifications();
    };

    socket.on('new-notification', handleNewNotification);
    socket.on('follow-update', handleFollowUpdate);

    return () => {
      socket.off('new-notification', handleNewNotification);
      socket.off('follow-update', handleFollowUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (unreadCount > previousUnreadRef.current && !showDropdown) {
      // Play a subtle sound or trigger browser notification
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

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
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
                        onClick={() => {
                          markAsRead(notification.id);
                          setShowDropdown(false);
                        }}
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
                              {new Date(notification.createdAt).toLocaleDateString('en-US', {
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
