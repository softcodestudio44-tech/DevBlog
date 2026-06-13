import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Send, Users, Hash, Menu, X, 
  Trash2, Paperclip, Search, CornerUpLeft
} from 'lucide-react';
import api from '../api/axios';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const CHANNEL_ROOM_KEY = 'devblog-community-active-room';
const CHANNEL_MESSAGES_KEY = 'devblog-community-messages';

const Community = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket, onlineUsers, typingUsers, joinRoom, leaveRoom, sendMessage, setTyping, connected } = useSocket();
  const navigate = useNavigate();
  
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(() => {
    try {
      const savedId = localStorage.getItem(CHANNEL_ROOM_KEY);
      return savedId ? { id: savedId } : null;
    } catch (err) {
      return null;
    }
  });
  const [channelMessages, setChannelMessages] = useState(() => {
    try {
      const savedRoomId = localStorage.getItem(CHANNEL_ROOM_KEY);
      if (savedRoomId) {
        const cached = localStorage.getItem(`${CHANNEL_MESSAGES_KEY}:${savedRoomId}`);
        return cached ? JSON.parse(cached) : [];
      }
      return [];
    } catch (err) {
      return [];
    }
  });
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const processedChannelMessagesRef = useRef(new Set());

  const isAdmin = user?.email === 'softcodestudio44@gmail.com' || user?.role === 'admin';
  const otherOnlineUsers = onlineUsers.filter(u => u.id !== user?.id);

  // Fetch rooms on mount and restore last active room
  useEffect(() => {
    fetchRooms();
  }, []);

  // Socket listeners for community
  useEffect(() => {
    if (!socket) return;

    const handleNewChannelMessage = (message) => {
      if (processedChannelMessagesRef.current.has(message.id)) return;
      processedChannelMessagesRef.current.add(message.id);
      
      if (activeRoom && message.roomId === activeRoom.id) {
        setChannelMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      if (!messageId) return;
      setChannelMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    const handleMessagesCleared = ({ roomId }) => {
      if (activeRoom?.id === roomId) {
        setChannelMessages([]);
        processedChannelMessagesRef.current.clear();
      }
    };

    socket.on('new-message', handleNewChannelMessage);
    socket.on('message-deleted', handleMessageDeleted);
    socket.on('messages-cleared', handleMessagesCleared);

    return () => {
      socket.off('new-message', handleNewChannelMessage);
      socket.off('message-deleted', handleMessageDeleted);
      socket.off('messages-cleared', handleMessagesCleared);
    };
  }, [socket, activeRoom]);

  // Refresh messages on reconnect
  useEffect(() => {
    if (!socket || !connected || !activeRoom) return;
    
    const refreshMessages = async () => {
      try {
        const res = await api.get(`/chat/rooms/${activeRoom.id}/messages`);
        setChannelMessages(res.data || []);
        processedChannelMessagesRef.current.clear();
        res.data?.forEach(m => processedChannelMessagesRef.current.add(m.id));
      } catch (err) {
        console.error('Failed to refresh channel messages:', err);
      }
    };
    
    refreshMessages();
  }, [connected, activeRoom]);

  // Auto-scroll
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [channelMessages]);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/chat/rooms');
      setRooms(res.data);
      if (res.data.length > 0) {
        const savedRoomId = localStorage.getItem(CHANNEL_ROOM_KEY);
        const preferredRoom = res.data.find(r => r.id === savedRoomId) || res.data[0];
        selectRoom(preferredRoom);
      }
      setLoading(false);
    } catch (err) { 
      console.error(err);
      setLoading(false);
    }
  };

  const selectRoom = async (room) => {
    if (!room) return;
    if (activeRoom && activeRoom.id !== room.id) {
      try {
        localStorage.setItem(`${CHANNEL_MESSAGES_KEY}:${activeRoom.id}`, JSON.stringify(channelMessages));
      } catch (err) {
        console.error('Failed to cache previous room messages:', err);
      }
      leaveRoom(activeRoom.id);
    }
    setActiveRoom(room);
    setReplyTo(null);
    setShowSidebar(false);
    localStorage.setItem(CHANNEL_ROOM_KEY, room.id);
    joinRoom(room.id);
    try {
      const cached = localStorage.getItem(`${CHANNEL_MESSAGES_KEY}:${room.id}`);
      if (cached) {
        setChannelMessages(JSON.parse(cached));
      }
      const res = await api.get(`/chat/rooms/${room.id}/messages`);
      setChannelMessages(res.data || []);
      processedChannelMessagesRef.current.clear();
      res.data?.forEach(m => processedChannelMessagesRef.current.add(m.id));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!activeRoom?.id) return;
    try {
      localStorage.setItem(`${CHANNEL_MESSAGES_KEY}:${activeRoom.id}`, JSON.stringify(channelMessages));
    } catch (err) {
      console.error('Failed to save community channel messages:', err);
    }
  }, [activeRoom?.id, channelMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom) return;
    
    const content = replyTo
      ? `> ${replyTo.content}\n\n${newMessage.trim()}`
      : newMessage.trim();
    
    sendMessage(activeRoom.id, content);
    setNewMessage('');
    setReplyTo(null);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (activeRoom) {
      setTyping(activeRoom.id, true);
      typingTimerRef.current = setTimeout(() => setTyping(activeRoom.id, false), 1200);
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyTo({ id: message.id, authorName: message.author?.name || 'Message', content: message.content });
    if (inputRef.current) inputRef.current.focus();
  };

  const clearReply = () => setReplyTo(null);

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setChannelMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Delete message failed:', err);
    }
  };

  const handleClearChat = async () => {
    if (!activeRoom) return;
    if (!window.confirm('Clear all messages in this channel?')) return;
    try {
      await api.delete(`/chat/rooms/${activeRoom.id}/clear`);
      setChannelMessages([]);
      processedChannelMessagesRef.current.clear();
      localStorage.removeItem(`${CHANNEL_MESSAGES_KEY}:${activeRoom.id}`);
    } catch (err) { console.error(err); }
  };

  const startDM = (targetUser) => {
    navigate(`/messages?user=${targetUser.id}`);
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isUserOnline = (uid) => onlineUsers.some(u => u.id === uid);

  const currentTyping = Object.entries(typingUsers)
    .filter(([id, name]) => name && id !== user?.id)
    .map(([, name]) => name);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#030405]">
        <div className="w-10 h-10 rounded-full border-2 border-lime-500/20 border-t-lime-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#030405] overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] right-[10%] w-[400px] h-[400px] rounded-full bg-lime-500/[0.03] blur-3xl animate-pulse" style={{animationDuration: '8s'}} />
        <div className="absolute bottom-[15%] left-[5%] w-[350px] h-[350px] rounded-full bg-teal-500/[0.02] blur-3xl animate-pulse" style={{animationDuration: '12s'}} />
        <div className="absolute top-[35%] left-[25%] w-[180px] h-[180px] rounded-full bg-lime-400/[0.02] blur-2xl animate-pulse" style={{animationDuration: '6s'}} />
        <div className="absolute top-[60%] right-[30%] w-[250px] h-[250px] rounded-full bg-purple-500/[0.015] blur-3xl animate-pulse" style={{animationDuration: '10s'}} />
        
        <div className="code-particle" style={{left: '8%', animationDelay: '0s', animationDuration: '18s'}}>{'{ }'}</div>
        <div className="code-particle" style={{left: '22%', animationDelay: '3s', animationDuration: '22s'}}>{'</>'}</div>
        <div className="code-particle" style={{left: '38%', animationDelay: '7s', animationDuration: '20s'}}>{'=>;'}</div>
        <div className="code-particle" style={{left: '55%', animationDelay: '2s', animationDuration: '25s'}}>{'[]'}</div>
        <div className="code-particle" style={{left: '70%', animationDelay: '5s', animationDuration: '19s'}}>{'()'}</div>
        <div className="code-particle" style={{left: '85%', animationDelay: '9s', animationDuration: '21s'}}>{'&&'}</div>
        <div className="code-particle" style={{left: '15%', animationDelay: '12s', animationDuration: '23s'}}>{'++'}</div>
        <div className="code-particle" style={{left: '45%', animationDelay: '15s', animationDuration: '17s'}}>{'==='}</div>
        <div className="code-particle" style={{left: '65%', animationDelay: '4s', animationDuration: '24s'}}>{'!!'}</div>
        <div className="code-particle" style={{left: '92%', animationDelay: '11s', animationDuration: '20s'}}>{'??'}</div>
        
        <div className="absolute top-[10%] left-[15%] w-1 h-1 rounded-full bg-white/20 animate-pulse" />
        <div className="absolute top-[25%] left-[60%] w-0.5 h-0.5 rounded-full bg-white/30 animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-[45%] left-[80%] w-1 h-1 rounded-full bg-lime-400/20 animate-pulse" style={{animationDelay: '2s'}} />
        <div className="absolute top-[70%] left-[20%] w-0.5 h-0.5 rounded-full bg-white/25 animate-pulse" style={{animationDelay: '3s'}} />
        <div className="absolute top-[85%] left-[50%] w-1 h-1 rounded-full bg-teal-400/20 animate-pulse" style={{animationDelay: '1.5s'}} />
      </div>

      {showSidebar && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />}

      {/* Sidebar */}
      <div className={`
        fixed lg:static z-50 h-full w-80 lg:w-80 bg-[#0a0f0d]/98 backdrop-blur-xl 
        border-r border-white/5 flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="lg:hidden p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-white text-sm">Community</h2>
          <button onClick={() => setShowSidebar(false)} className="p-2 rounded-lg hover:bg-white/5 text-white/30">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col h-full">
          <div className="p-4 mb-4 rounded-3xl bg-[#081114]/95 border border-slate-700/30 shadow-inner shadow-black/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-900/20">
                <Users className="w-5 h-5 text-lime-300" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">Channel list</h2>
                <p className="text-xs text-slate-300/70">Public rooms and active members</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search channels..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-lime-500/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">CHANNELS</p>
            {rooms.filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(room => (
              <button
                key={room.id}
                onClick={() => selectRoom(room)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  activeRoom?.id === room.id
                    ? 'bg-lime-500/10 border border-lime-500/20'
                    : 'hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activeRoom?.id === room.id ? 'bg-lime-500/15 text-lime-400' : 'bg-white/5 text-white/30'
                  }`}>
                    <Hash className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium block truncate text-white/90">{room.name}</span>
                    {room.topic && <span className="text-[11px] text-white/40 truncate block">{room.topic}</span>}
                    <span className="text-[10px] text-white/25">{room.memberCount > 0 ? room.memberCount : (onlineUsers.length || 1)} members</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-4 mt-4 bg-white/5 border border-white/10 rounded-3xl shadow-inner shadow-black/10 flex-shrink-0">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">ONLINE NOW</p>
            <div className="flex -space-x-2">
              {otherOnlineUsers.slice(0, 5).map(u => (
                <button
                  key={u.id}
                  onClick={() => startDM(u)}
                  className="relative hover:z-10 transition-transform hover:scale-110"
                  title={`Message ${u.name}`}
                >
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-900" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-slate-900">
                      {u.name?.[0]}
                    </div>
                  )}
                </button>
              ))}
              {otherOnlineUsers.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-white/5 border-2 border-slate-900 flex items-center justify-center text-xs text-slate-400">
                  +{otherOnlineUsers.length - 5}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 w-full overflow-hidden">
        {!connected && (
          <div className="absolute inset-x-0 top-0 z-30 bg-amber-500/10 text-amber-200 text-center py-1 text-[11px] border-b border-amber-500/20">
            Reconnecting chat... updates will arrive shortly.
          </div>
        )}
        
        {/* Header */}
        {activeRoom && (
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-[#0a0f0d]/90 backdrop-blur-sm">
            <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-white/50">
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-lime-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-sm">{activeRoom.name}</h3>
              <p className="text-xs text-white/40 truncate">{activeRoom.topic}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-500/5 border border-lime-500/10">
                <Users className="w-3.5 h-3.5 text-lime-400/60" />
                <span className="text-xs text-lime-400/60">{onlineUsers.length} online</span>
              </div>
              {isAdmin && (
                <button onClick={handleClearChat} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all" title="Clear chat">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollBehavior: 'smooth' }}>
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {activeRoom && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-slate-100 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Community chat</p>
                    <h2 className="text-lg font-semibold text-white">#{activeRoom.name}</h2>
                  </div>
                  <div className="text-xs text-white/50">{onlineUsers.length} online</div>
                </div>
              </div>
            )}
            
            {channelMessages.length === 0 && activeRoom && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-2xl bg-lime-500/5 border border-lime-500/10 flex items-center justify-center mb-4">
                  <Hash className="w-10 h-10 text-lime-400/20" />
                </div>
                <p className="text-sm text-white/40 font-medium">Welcome to #{activeRoom.name}</p>
                <p className="text-xs text-white/25 mt-1">This is the start of the channel.</p>
              </div>
            )}
            
            {channelMessages.map((msg, idx) => {
              const prevMsg = channelMessages[idx - 1];
              const showHeader = !prevMsg || prevMsg.authorId !== msg.authorId ||
                (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) > 300000;
              const isOwn = msg.authorId === user?.id;
              const canDelete = isOwn || isAdmin;

              return (
                <div key={msg.id} className={`group ${showHeader ? 'mt-4' : 'mt-0.5'} flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[75%]">
                    {showHeader && (
                      <div className="flex gap-3 mb-2 items-center">
                        <Link to={`/user/${msg.authorId}`} className="flex-shrink-0 self-start mt-0.5">
                          {msg.author?.avatar ? (
                            <img src={msg.author.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-xs font-bold text-white">
                              {msg.author?.name?.[0] || 'U'}
                            </div>
                          )}
                        </Link>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5">
                            <Link to={`/user/${msg.authorId}`} className="text-sm font-semibold text-lime-300/80 hover:text-lime-300 hover:underline truncate">
                              {msg.author?.name}
                            </Link>
                            <span className="text-[10px] text-white/25">{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <div className={`px-4 py-3 rounded-3xl backdrop-blur-xl ${isOwn ? 'bg-lime-500/25 text-white rounded-br-sm' : 'bg-white/10 text-white/90 rounded-bl-sm border border-white/10 shadow-sm shadow-black/10'}`}>
                        <MarkdownRenderer content={msg.content} />
                      </div>
                      {/* HOVER ACTION BUTTONS - SAME AS YOUR SCREENSHOT */}
                      <div className="mt-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleReplyToMessage(msg)} type="button" className="p-1 rounded-full hover:bg-white/10 text-white/50">
                          <CornerUpLeft className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDeleteMessage(msg.id)} type="button" className="p-1 rounded-full hover:bg-white/10 text-white/50">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {currentTyping.length > 0 && (
              <div className="flex gap-3 mt-4 pl-1">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div className="glass px-4 py-2.5 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        {isAuthenticated ? (
          <div className="px-4 py-3 border-t border-white/5 flex-shrink-0 bg-[#0a0f0d]/90 backdrop-blur-sm">
            {/* REPLY PREVIEW - SAME AS YOUR SCREENSHOT */}
            {replyTo && (
              <div className="mb-2 px-4 py-2 rounded-2xl border border-white/10 bg-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-white/70">
                    Replying to <span className="text-white/90 font-medium">{replyTo.authorName}</span>
                  </div>
                  <button type="button" onClick={clearReply} className="text-white/50 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-white/40 mt-2 line-clamp-2">{replyTo.content}</p>
              </div>
            )}
            <form onSubmit={handleSend} className="flex items-end gap-2">
              <button type="button" className="p-2.5 rounded-full hover:bg-white/5 text-white/30 transition-colors flex-shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={activeRoom ? `Message #${activeRoom.name}...` : 'Select a channel...'}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-full px-5 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-lime-500/30 focus:bg-white/[0.06] transition-all"
                  value={newMessage}
                  onChange={handleTyping}
                  disabled={!activeRoom}
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || !activeRoom}
                className="w-11 h-11 rounded-full bg-lime-500 flex items-center justify-center hover:bg-lime-400 transition-all disabled:opacity-20 disabled:hover:bg-lime-500 shadow-lg shadow-lime-500/20 flex-shrink-0"
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

export default Community;