import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Send, Users, Hash, Menu, X, ArrowLeft, 
  Trash2, Paperclip, Mic, CheckCheck, MoreVertical, Phone, Video
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
      if (isChannelTab) {
        await fetchRooms();
      } else {
        await fetchDMHistory();
      }
      setLoading(false);
    };
    init();
  }, [isChannelTab]);

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
      // Update DM history with last message
      setDmHistory(prev => {
        const fromId = message.authorId === user?.id ? message.recipientId || message.authorId : message.authorId;
        const existingIndex = prev.findIndex(u => u.id === fromId);
        const newEntry = {
          id: fromId,
          name: message.author?.name,
          avatar: message.author?.avatar,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
        };
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newEntry;
          // Move to top
          const [item] = updated.splice(existingIndex, 1);
          return [item, ...updated];
        }
        return [newEntry, ...prev];
      });

      // If this DM is currently open, add message to dmMessages
      if (activeDMUser) {
        const isFromActiveUser = message.authorId === activeDMUser.id;
        const isToActiveUser = message.authorId === user?.id;
        if (isFromActiveUser || isToActiveUser) {
          setDmMessages(prev => {
            if (prev.some(m => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
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
  }, [socket, activeRoom, activeDMUser, user]);

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
      if (res.data.length > 0) {
        selectRoom(res.data[0]);
      }
    } catch (err) { console.error(err); }
  };

  const fetchDMHistory = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/chat/dm-history');
      setDmHistory(res.data);
      // If no DM history, show online users to start conversations
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
      // Update DM history
      setDmHistory(prev => {
        const existingIndex = prev.findIndex(u => u.id === activeDMUser.id);
        const newEntry = {
          id: activeDMUser.id,
          name: activeDMUser.name,
          avatar: activeDMUser.avatar,
          lastMessage: newMessage.trim(),
          lastMessageAt: new Date().toISOString(),
        };
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newEntry;
          const [item] = updated.splice(existingIndex, 1);
          return [item, ...updated];
        }
        return [newEntry, ...prev];
      });
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
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const isUserOnline = (uid) => onlineUsers.some(u => u.id === uid);

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

  // ========== COMMUNITY SIDEBAR (Channels only) ==========
  const renderCommunitySidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-500 to-lime-700 flex items-center justify-center shadow-lg shadow-lime-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm">Community</h2>
            <p className="text-xs text-lime-400/50">{onlineUsers.length} online</p>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Search channels..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-lime-500/30"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">CHANNELS</p>
        {rooms.map(room => (
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
                <span className="text-sm font-medium block truncate text-white/90">
                  {room.name}
                </span>
                {room.topic && <span className="text-[11px] text-white/40 truncate block">{room.topic}</span>}
                <span className="text-[10px] text-white/25">{room.memberCount || 0} members</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Online users widget */}
      <div className="p-4 border-t border-white/5 flex-shrink-0">
        <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">ONLINE NOW</p>
        <div className="flex -space-x-2">
          {onlineUsers.filter(u => u.id !== user?.id).slice(0, 5).map(u => (
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
          {onlineUsers.filter(u => u.id !== user?.id).length > 5 && (
            <div className="w-8 h-8 rounded-full bg-white/5 border-2 border-slate-900 flex items-center justify-center text-xs text-slate-400">
              +{onlineUsers.filter(u => u.id !== user?.id).length - 5}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ========== MESSAGES SIDEBAR (DMs only) ==========
  const renderMessagesSidebar = () => {
    const otherOnline = onlineUsers.filter(u => u.id !== user?.id && !dmHistory.find(d => d.id === u.id));
    
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-500 to-lime-700 flex items-center justify-center shadow-lg shadow-lime-500/20">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Messages</h2>
              <p className="text-xs text-lime-400/50">{dmHistory.length} conversations</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-lime-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Conversations */}
          <div className="p-3 space-y-1">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">RECENT</p>
            {dmHistory.map(u => {
              const online = isUserOnline(u.id);
              const isActive = activeDMUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => startDM(u)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    isActive ? 'bg-lime-500/10 border border-lime-500/20' : 'hover:bg-white/[0.02] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-sm font-bold text-white">
                            {u.name?.[0]}
                          </div>
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d1210] ${
                        online ? 'bg-emerald-500' : 'bg-white/20'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium truncate text-white/90">{u.name}</span>
                        {u.lastMessageAt && <span className="text-[10px] text-white/30 ml-2">{formatTime(u.lastMessageAt)}</span>}
                      </div>
                      <span className="text-[12px] text-white/50 truncate block">
                        {u.lastMessage ? u.lastMessage.substring(0, 35) : (online ? 'Online' : 'Offline')}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Online users to start new conversations */}
          {otherOnline.length > 0 && (
            <div className="p-3 space-y-1 border-t border-white/5">
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">ONLINE</p>
              {otherOnline.map(u => (
                <button
                  key={u.id}
                  onClick={() => startDM(u)}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/[0.02] border border-transparent transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full overflow-hidden">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-sm font-bold text-white">
                            {u.name?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d1210] bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium truncate text-white/90">{u.name}</span>
                      <span className="text-[12px] text-lime-400/60 truncate block">Tap to start chatting</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {dmHistory.length === 0 && otherOnline.length === 0 && (
            <div className="p-8 text-center">
              <MessageCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">No conversations yet.</p>
              <p className="text-xs text-white/25 mt-1">Start chatting with someone online!</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ========== COMMUNITY HEADER ==========
  const renderCommunityHeader = () => {
    if (!activeRoom) return null;
    return (
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
  };

  // ========== MESSAGES HEADER ==========
  const renderMessagesHeader = () => {
    if (!activeDMUser) return (
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-[#0a0f0d]/90 backdrop-blur-sm">
        <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-white/50">
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-lime-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">Messages</h3>
          <p className="text-xs text-white/40">Select a conversation</p>
        </div>
      </div>
    );
    
    return (
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-[#0a0f0d]/90 backdrop-blur-sm">
        <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-white/50">
          <Menu className="w-5 h-5" />
        </button>
        <Link to={`/user/${activeDMUser.id}`} className="relative hover:opacity-80">
          {activeDMUser.avatar ? (
            <img src={activeDMUser.avatar} alt={activeDMUser.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-lime-500/20" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-sm font-bold text-white">
              {activeDMUser.name?.[0]}
            </div>
          )}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0f0d] ${
            isUserOnline(activeDMUser.id) ? 'bg-emerald-500' : 'bg-white/20'
          }`} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/user/${activeDMUser.id}`} className="font-semibold text-white text-sm hover:text-lime-300 block truncate">
            {activeDMUser.name}
          </Link>
          <p className="text-xs text-lime-400/50">
            {isUserOnline(activeDMUser.id) ? 'Online' : 'Offline'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <Phone className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <Video className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // ========== COMMUNITY MESSAGES (Discord style) ==========
  const renderCommunityMessages = () => (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
      style={{ scrollBehavior: 'smooth' }}
    >
      {channelMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-lime-500/5 border border-lime-500/10 flex items-center justify-center mb-4">
            <Hash className="w-10 h-10 text-lime-400/20" />
          </div>
          <p className="text-sm text-white/40 font-medium">Welcome to #{activeRoom?.name}</p>
          <p className="text-xs text-white/25 mt-1">This is the start of the channel.</p>
        </div>
      )}
      
      {channelMessages.map((msg, idx) => {
        const prevMsg = channelMessages[idx - 1];
        const showHeader = !prevMsg || prevMsg.authorId !== msg.authorId || 
          (new Date(msg.createdAt) - new Date(prevMsg.createdAt)) > 300000; // 5 min gap
        
        return (
          <div key={msg.id} className={`group ${showHeader ? 'mt-4' : 'mt-0.5'}`}>
            {showHeader ? (
              <div className="flex gap-3">
                <Link to={`/user/${msg.authorId}`} className="flex-shrink-0 self-start mt-0.5">
                  {msg.author?.avatar ? (
                    <img src={msg.author.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-xs font-bold text-white">
                      {msg.author?.name?.[0] || 'U'}
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <Link to={`/user/${msg.authorId}`} className="text-sm font-semibold text-lime-300/80 hover:text-lime-300 hover:underline">
                      {msg.author?.name}
                    </Link>
                    <span className="text-[10px] text-white/25">{formatTime(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed break-words">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 pl-12">
                <span className="text-[10px] text-white/0 group-hover:text-white/20 w-10 text-right flex-shrink-0 pt-1">
                  {formatTime(msg.createdAt)}
                </span>
                <p className="text-sm text-white/80 leading-relaxed break-words flex-1">{msg.content}</p>
              </div>
            )}
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
  );

  // ========== DM MESSAGES (WhatsApp style) ==========
  const renderDMMessages = () => (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-1"
      style={{ scrollBehavior: 'smooth' }}
    >
      {dmMessages.length === 0 && activeDMUser && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-20 h-20 rounded-full bg-lime-500/5 border border-lime-500/10 flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-lime-400/20" />
          </div>
          <p className="text-sm text-white/40 font-medium">{activeDMUser.name}</p>
          <p className="text-xs text-white/25 mt-1">Start a conversation</p>
        </div>
      )}
      
      {dmMessages.map((msg, idx) => {
        const isOwn = msg.authorId === user?.id;
        const prevMsg = dmMessages[idx - 1];
        const nextMsg = dmMessages[idx + 1];
        const showTime = !nextMsg || nextMsg.authorId !== msg.authorId || 
          (new Date(nextMsg.createdAt) - new Date(msg.createdAt)) > 300000;
        const isFirstInGroup = !prevMsg || prevMsg.authorId !== msg.authorId;
        
        return (
          <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}>
            <div className={`flex gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              {isFirstInGroup && !isOwn && (
                <Link to={`/user/${msg.authorId}`} className="flex-shrink-0 self-end mb-1">
                  {msg.author?.avatar ? (
                    <img src={msg.author.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-lime-700 to-teal-800 flex items-center justify-center text-[10px] font-bold text-white">
                      {msg.author?.name?.[0] || 'U'}
                    </div>
                  )}
                </Link>
              )}
              {!isFirstInGroup && !isOwn && <div className="w-7 flex-shrink-0" />}
              
              <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2 rounded-2xl ${
                  isOwn 
                    ? 'bg-lime-600 text-white rounded-tr-sm' 
                    : 'bg-white/[0.06] text-white/90 rounded-tl-sm border border-white/[0.05]'
                }`}>
                  <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                </div>
                {showTime && (
                  <span className={`text-[10px] text-white/30 mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                    {formatTime(msg.createdAt)}
                    {isOwn && <CheckCheck className="w-3 h-3 inline ml-1 text-white/20" />}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // ========== INPUT AREA ==========
  const renderInput = () => (
    <div className="px-4 py-3 border-t border-white/5 flex-shrink-0 bg-[#0a0f0d]/90 backdrop-blur-sm">
      <form onSubmit={handleSend} className="flex items-end gap-2">
        <button type="button" className="p-2.5 rounded-full hover:bg-white/5 text-white/30 transition-colors flex-shrink-0">
          <Paperclip className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder={
              activeDMUser
                ? `Message ${activeDMUser.name}...`
                : activeRoom
                ? `Message #${activeRoom.name}...`
                : isChannelTab
                ? 'Select a channel...'
                : 'Select a conversation...'
            }
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-full px-5 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-lime-500/30 focus:bg-white/[0.06] transition-all"
            value={newMessage}
            onChange={handleTyping}
            disabled={!activeRoom && !activeDMUser}
          />
        </div>
        <button
          type="submit"
          disabled={!newMessage.trim() || (!activeRoom && !activeDMUser)}
          className="w-11 h-11 rounded-full bg-lime-500 flex items-center justify-center hover:bg-lime-400 transition-all disabled:opacity-20 disabled:hover:bg-lime-500 shadow-lg shadow-lime-500/20 flex-shrink-0"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#030405] overflow-hidden relative">
      {/* Planetary background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] right-[5%] w-[300px] h-[300px] rounded-full bg-lime-500/[0.015] blur-3xl" />
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] rounded-full bg-teal-500/[0.01] blur-3xl" />
        <div className="absolute top-[40%] left-[30%] w-[200px] h-[200px] rounded-full bg-lime-400/[0.01] blur-2xl" />
        {/* Floating code symbols */}
        <div className="code-particle" style={{left: '10%', animationDelay: '0s'}}>{'{ }'}</div>
        <div className="code-particle" style={{left: '25%', animationDelay: '5s'}}>{'</>'}</div>
        <div className="code-particle" style={{left: '40%', animationDelay: '10s'}}>{'=>;'}</div>
        <div className="code-particle" style={{left: '60%', animationDelay: '3s'}}>{'[]'}</div>
        <div className="code-particle" style={{left: '75%', animationDelay: '8s'}}>{'()'}</div>
        <div className="code-particle" style={{left: '90%', animationDelay: '15s'}}>{'&&'}</div>
      </div>

      {showSidebar && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />}

      <div className={`
        fixed lg:static z-50 h-full w-80 lg:w-80 bg-[#0a0f0d]/98 backdrop-blur-xl 
        border-r border-white/5 flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="lg:hidden p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-white text-sm">{isChannelTab ? 'Community' : 'Messages'}</h2>
          <button onClick={() => setShowSidebar(false)} className="p-2 rounded-lg hover:bg-white/5 text-white/30">
            <X className="w-5 h-5" />
          </button>
        </div>
        {isChannelTab ? renderCommunitySidebar() : renderMessagesSidebar()}
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 w-full overflow-hidden">
        {isChannelTab ? renderCommunityHeader() : renderMessagesHeader()}
        {isChannelTab ? renderCommunityMessages() : renderDMMessages()}
        {isAuthenticated ? renderInput() : (
          <div className="p-4 border-t border-white/5 text-center text-white/30 text-sm">
            Please <a href="/login" className="text-lime-400 hover:underline">login</a> to join.
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;