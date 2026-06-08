import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, MessageCircle, AtSign, UserPlus, Check } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const NotificationBell = () => {
  const { isAuthenticated, user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (data) => {
      setNotifications((prev) => {
        if (prev.find((n) => n.id === data.id)) return prev;
        return [data, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('new-notification', handleNewNotification);

    return () => {
      socket.off('new-notification', handleNewNotification);
    };
  }, [socket, user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Fetch notifications error:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Mark all as read error:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'like': return <Heart className="w-4 h-4 text-red-400" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case 'reply': return <MessageCircle className="w-4 h-4 text-lime-400" />;
      case 'follow': return <UserPlus className="w-4 h-4 text-purple-400" />;
      case 'mention': return <AtSign className="w-4 h-4 text-yellow-400" />;
      default: return <Bell className="w-4 h-4 text-white" />;
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-white/[0.03] transition-all"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="sm:hidden fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="relative w-full max-w-sm glass-strong rounded-2xl overflow-hidden shadow-2xl max-h-[70vh] flex flex-col">
              <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
                <h3 className="font-semibold text-sm text-white">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-xs text-lime-400 hover:text-lime-300 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                      Mark all
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/5 text-white">
                    <span className="text-lg leading-none">&times;</span>
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-8 h-8 text-white/30 mx-auto mb-2" />
                    <p className="text-sm text-white/50">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                      className={`p-4 border-b border-white/[0.02] cursor-pointer transition-all hover:bg-white/[0.02] ${
                        !notification.read ? 'bg-lime-500/[0.02]' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white leading-relaxed">{notification.message}</p>
                          <p className="text-[11px] text-white/50 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {!notification.read && <div className="w-2 h-2 rounded-full bg-lime-400 flex-shrink-0 mt-1.5" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:block absolute right-0 top-full mt-2 w-80 glass-strong rounded-2xl overflow-hidden shadow-2xl z-50">
            <div className="absolute -top-1.5 right-3 w-3 h-3 bg-[rgba(15,18,22,0.85)] rotate-45 border-l border-t border-white/[0.06]" />
            <div className="p-4 border-b border-white/[0.04] flex items-center justify-between relative z-10">
              <h3 className="font-semibold text-sm text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-lime-400 hover:text-lime-300 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto relative z-10">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-sm text-white/50">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                    className={`p-4 border-b border-white/[0.02] cursor-pointer transition-all hover:bg-white/[0.02] ${
                      !notification.read ? 'bg-lime-500/[0.02]' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white leading-relaxed">{notification.message}</p>
                        <p className="text-[11px] text-white/50 mt-1">
                          {new Date(notification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {!notification.read && <div className="w-2 h-2 rounded-full bg-lime-400 flex-shrink-0 mt-1.5" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;