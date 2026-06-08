import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Send, Users, Hash, Circle, Menu, X, ArrowLeft, 
  Trash2, Paperclip, Mic, CheckCheck
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Chat = ({ defaultTab = 'channels' }) => {
  const { user, isAuthenticated } = useAuth();
  const { socket, onlineUsers, typingUsers, joinRoom, leaveRoom, sendMessage, setTyping } = useSocket();
  
  // Channel state
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [channelMessages, setChannelMessages] = useState([]);
  
  // DM state
  const [dmHistory, setDmHistory] = useState([]);
  const [activeDMUser, setActiveDMUser] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const isAdmin = user?.email === 'softcodestudio44@gmail.com' || user?.role === 'admin';
  const isChannelTab = defaultTab === 'channels';

  // ---- Fetch initial data ----
  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchRooms(), fetchDMHistory()]);
      setLoading(false);
    };
    init();
  }, []);

  // ---- Socket listeners ----
  useEffect(() => {
    if (!socket) return;

    // New channel message
    const handleNewChannelMessage = (message) => {
      if (activeRoom && message.roomId === activeRoom.id) {
        setChannelMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    // New DM message
    const handleNewDM = (message) => {
      // Update DM history (add/update conversation)
      setDmHistory(prev => {
        const existingIndex = prev.findIndex(u => u.id === message.authorId);
        const newEntry = {
          id: message.authorId,
          name: message.author?.name,
          avatar: message.author?.avatar,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
        };
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newEntry;
          return updated;
        }
        return [newEntry, ...prev];
      });

      // If this DM is currently open, add message to dmMessages
      if (activeDMUser && message.authorId === activeDMUser.id) {
        setDmMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    socket.on('new-message', handleNewChannelMessage);
    socket.on('new-dm', handleNewDM);
    socket.on('messages-cleared', () => {
      if (activeRoom) setChannelMessages([]);
    });

    return () => {
      socket.off('new-message', handleNewChannelMessage);
      socket.off('new-dm', handleNewDM);
      socket.off('messages-cleared');
    };
  }, [socket, activeRoom, activeDMUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [channelMessages, dmMessages]);

  // ---- Data fetching ----
  const fetchRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      setRooms(res.data);
      if (res.data.length > 0 && isChannelTab) {
        selectRoom(res.data[0]);
      }
    } catch (err) { console.error(err); }
  };

  const fetchDMHistory = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/chat/dm-history');
      setDmHistory(res.data);
    } catch (err) { console.error(err); }
  };

  const selectRoom = async (room) => {
    if (activeRoom) leaveRoom(activeRoom.id);
    setActiveRoom(room);
    setActiveDMUser(null);
    setShowSidebar(false);
    joinRoom(room.id);
    try {
      const res = await api.get(`/chat/rooms/${room.id}/messages`);
      setChannelMessages(res.data);
    } catch (err) { console.error(err); }
  };

  const startDM = async (targetUser) => {
    if (activeRoom) leaveRoom(activeRoom.id);
    setActiveRoom(null);
    setActiveDMUser(targetUser);
    setShowSidebar(false);
    const sorted = [user.id, targetUser.id].sort();
    const roomName = `dm:${sorted[0]}:${sorted[1]}`;
    joinRoom(roomName);
    try {
      const res = await api.get(`/chat/rooms/${roomName}/messages`);
      setDmMessages(res.data);
    } catch (err) { setDmMessages([]); }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (activeDMUser) {
      socket.emit('send-dm', {
        recipientId: activeDMUser.id,
        content: newMessage.trim(),
      });
      // Optimistically add to dmMessages
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: newMessage.trim(),
        authorId: user.id,
        author: { id: user.id, name: user.name, avatar: user.avatar },
        createdAt: new Date().toISOString(),
      };
      setDmMessages(prev => [...prev, optimisticMessage]);
    } else if (activeRoom) {
      sendMessage(activeRoom.id, newMessage.trim());
    } else return;
    setNewMessage('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (activeRoom) {
      setTyping(activeRoom.id, true);
      setTimeout(() => setTyping(activeRoom.id, false), 2000);
    }
  };

  const handleClearChat = async () => {
    if (!activeRoom) return;
    if (!window.confirm('Clear all messages in this channel?')) return;
    try {
      await api.delete(`/chat/rooms/${activeRoom.id}/clear`);
      setChannelMessages([]);
    } catch (err) { console.error(err); }
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isUserOnline = (uid) => onlineUsers.some(u => u.id === uid);
  const goBackToChannels = () => {
    setActiveDMUser(null);
    setDmMessages([]);
    if (rooms.length) selectRoom(rooms[0]);
  };

  const currentTyping = activeRoom
    ? Object.entries(typingUsers)
        .filter(([id, name]) => name && id !== user?.id)
        .map(([_, name]) => name)
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#030405]">
        <div className="w-10 h-10 rounded-full border-2 border-lime-500/20 border-t-lime-400 animate-spin" />
      </div>
    );
  }

  // ---- Sidebar render (different for Community vs Messages) ----
  const renderSidebar = () => {
    if (isChannelTab) {
      // Community sidebar: channels only
      return (
        <div className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">CHANNELS</p>
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => selectRoom(room)}
              className={`w-full text-left p-3 rounded-xl transition-all ${
                activeRoom?.id === room.id && !activeDMUser
                  ? 'bg-lime-500/10 border border-lime-500/20'
                  : 'hover:bg-white/[0.02] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  activeRoom?.id === room.id && !activeDMUser ? 'bg-lime-500/15 text-lime-400' : 'bg-white/5 text-white/20'
                }`}>
                  <Hash className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium block truncate text-white/80">
                    #{room.name}
                  </span>
                  {room.topic && <span className="text-[11px] text-white/30 truncate block">{room.topic}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      );
    } else {
      // Messages sidebar: DM conversations only
      const allConversations = [...dmHistory];
      const otherOnline = onlineUsers.filter(u => u.id !== user?.id && !dmHistory.find(d => d.id === u.id));
      return (
        <div className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">CONVERSATIONS</p>
          {allConversations.map(u => {
            const online = isUserOnline(u.id);
            return (
              <button
                key={u.id}
                onClick={() => startDM(u)}
                className={`w-full text-left p-2 rounded-xl transition-all ${
                  activeDMUser?.id === u.id ? 'bg-lime-500/10 border border-lime-500/20' : 'hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-sm font-bold text-white">
                          {u.name?.[0]}
                        </div>
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1210] ${
                      online ? 'bg-emerald-500' : 'bg-white/20'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-medium truncate text-white/80">{u.name}</span>
                      {u.lastMessageAt && <span className="text-[10px] text-white/30 ml-2">{formatTime(u.lastMessageAt)}</span>}
                    </div>
                    <span className="text-[11px] text-white/40 truncate block">
                      {u.lastMessage ? u.lastMessage.substring(0, 30) : (online ? 'Online' : 'Offline')}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
          {otherOnline.map(u => (
            <button
              key={u.id}
              onClick={() => startDM(u)}
              className="w-full text-left p-2 rounded-xl hover:bg-white/[0.02] border border-transparent transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden">
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-sm font-bold text-white">
                        {u.name?.[0]}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1210] bg-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium truncate text-white/80">{u.name}</span>
                  <span className="text-[11px] text-white/40 truncate block">Online</span>
                </div>
              </div>
            </button>
          ))}
          {allConversations.length === 0 && otherOnline.length === 0 && (
            <p className="text-xs text-white/20 text-center py-8">No conversations yet.</p>
          )}
        </div>
      );
    }
  };

  const renderOnlineWidget = () => (
    <div className="p-4 border-t border-white/5 flex-shrink-0">
      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">ONLINE NOW</p>
      <div className="flex -space-x-2">
        {onlineUsers.filter(u => u.id !== user?.id).slice(0, 5).map(u => (
          <Link
            key={u.id}
            to={`/user/${u.id}`}
            className="relative hover:z-10 transition-transform hover:scale-110"
            title={u.name}
          >
            {u.avatar ? (
              <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-900" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-slate-900">
                {u.name?.[0]}
              </div>
            )}
          </Link>
        ))}
        {onlineUsers.filter(u => u.id !== user?.id).length > 5 && (
          <div className="w-8 h-8 rounded-full bg-white/5 border-2 border-slate-900 flex items-center justify-center text-xs text-slate-400">
            +{onlineUsers.filter(u => u.id !== user?.id).length - 5}
          </div>
        )}
      </div>
    </div>
  );

  // ---- Main chat area (messages) ----
  const currentMessages = activeDMUser ? dmMessages : channelMessages;
  const renderMessages = () => (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-3"
      style={{ scrollBehavior: 'smooth' }}
    >
      {currentMessages.length === 0 && activeDMUser && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-lime-500/5 border border-lime-500/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-7 h-7 text-lime-400/30" />
          </div>
          <p className="text-sm text-white/40">Start a conversation with {activeDMUser.name}</p>
        </div>
      )}
      {currentMessages.map((msg, idx) => {
        const isOwn = msg.authorId === user?.id;
        const showAvatar = idx === 0 || currentMessages[idx-1]?.authorId !== msg.authorId;
        return (
          <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              {showAvatar && !isOwn && (
                <Link to={`/user/${msg.authorId}`} className="flex-shrink-0 self-end mb-1">
                  {msg.author?.avatar ? (
                    <img src={msg.author.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-xs font-bold text-white">
                      {msg.author?.name?.[0] || 'U'}
                    </div>
                  )}
                </Link>
              )}
              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {showAvatar && !isOwn && (
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <Link to={`/user/${msg.authorId}`} className="text-xs font-medium text-white/50 hover:text-lime-300">
                      {msg.author?.name}
                    </Link>
                    <span className="text-[10px] text-white/30">{formatTime(msg.createdAt)}</span>
                  </div>
                )}
                {showAvatar && isOwn && (
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[10px] text-white/30">{formatTime(msg.createdAt)}</span>
                    <span className="text-xs font-medium text-lime-400/60">You</span>
                  </div>
                )}
                <div className={`px-4 py-2.5 rounded-2xl ${
                  isOwn ? 'message-user text-white/90' : 'message-other text-white/80'
                }`}>
                  <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                </div>
                {isOwn && showAvatar && (
                  <div className="mt-1 mr-1">
                    <CheckCheck className="w-3.5 h-3.5 text-white/30" />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {currentTyping.length > 0 && !activeDMUser && (
        <div className="flex justify-start">
          <div className="flex gap-2 max-w-[80%]">
            <div className="flex-shrink-0 self-end">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="glass px-4 py-2.5 rounded-2xl rounded-tl-sm">
              <div className="flex items-center gap-1.5">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHeader = () => {
    if (activeRoom && !activeDMUser) {
      return (
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-[#0d1210]/80 backdrop-blur-sm">
          <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-white/50">
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
            <Hash className="w-4 h-4 text-lime-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm">#{activeRoom.name}</h3>
            <p className="text-xs text-white/30 truncate">{activeRoom.topic}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-lime-500/5 border border-lime-500/10">
              <Users className="w-3.5 h-3.5 text-lime-400/60" />
              <span className="text-xs text-lime-400/60">{onlineUsers.length}</span>
            </div>
            {isAdmin && (
              <button onClick={handleClearChat} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all" title="Clear chat">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      );
    } else if (activeDMUser) {
      return (
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-[#0d1210]/80 backdrop-blur-sm">
          <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-white/50">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={goBackToChannels} className="p-2 rounded-lg hover:bg-white/5 text-white/50">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link to={`/user/${activeDMUser.id}`} className="relative hover:opacity-80">
            {activeDMUser.avatar ? (
              <img src={activeDMUser.avatar} alt={activeDMUser.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-lime-500/20" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-sm font-bold text-white">
                {activeDMUser.name?.[0]}
              </div>
            )}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1210] ${
              isUserOnline(activeDMUser.id) ? 'bg-emerald-500' : 'bg-white/20'
            }`} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/user/${activeDMUser.id}`} className="font-semibold text-white text-sm hover:text-lime-300">
              {activeDMUser.name}
            </Link>
            <p className="text-xs text-lime-400/50">
              {isUserOnline(activeDMUser.id) ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#030405] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-lime-500/[0.02] rounded-full blur-3xl" />
      </div>

      {showSidebar && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />}

      <div className={`
        fixed lg:static z-50 h-full w-80 lg:w-72 bg-[#0d1210]/95 backdrop-blur-xl 
        border-r border-white/5 flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-lime-500 to-lime-700 flex items-center justify-center shadow-lg shadow-lime-500/20">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">
                {isChannelTab ? 'Community' : 'Messages'}
              </h2>
              <p className="text-xs text-lime-400/50">{onlineUsers.length} online</p>
            </div>
          </div>
          <button onClick={() => setShowSidebar(false)} className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/30">
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderSidebar()}
        {renderOnlineWidget()}
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 w-full overflow-hidden">
        {renderHeader()}
        {renderMessages()}
        {isAuthenticated ? (
          <div className="px-4 py-4 border-t border-white/5 flex-shrink-0 bg-[#0d1210]/80">
            <form onSubmit={handleSend} className="flex items-end gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    activeDMUser
                      ? `Message ${activeDMUser.name}...`
                      : activeRoom
                      ? `Message #${activeRoom.name}...`
                      : 'Select a chat...'
                  }
                  className="input-glass pr-12 py-3 rounded-full"
                  value={newMessage}
                  onChange={handleTyping}
                  disabled={!activeRoom && !activeDMUser}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" className="p-1.5 rounded-full hover:bg-white/5 text-white/30">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-1.5 rounded-full hover:bg-white/5 text-white/30">
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || (!activeRoom && !activeDMUser)}
                className="w-11 h-11 rounded-full bg-gradient-to-br from-lime-500 to-lime-600 flex items-center justify-center hover:from-lime-400 hover:to-lime-500 transition-all disabled:opacity-20 shadow-lg shadow-lime-500/20"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </form>
          </div>
        ) : (
          <div className="p-4 border-t border-white/5 text-center text-white/30 text-sm">
            Please <a href="/login" className="text-lime-400 hover:underline">login</a> to join.
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;