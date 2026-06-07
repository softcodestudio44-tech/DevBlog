import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Users, Hash, Circle, Menu, X, Mic, Mail, ArrowLeft, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Chat = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket, onlineUsers, typingUsers, joinRoom, leaveRoom, sendMessage, setTyping } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState('channels');
  const [dmUser, setDmUser] = useState(null);
  const messagesContainerRef = useRef(null);

  const isAdmin = user?.email === 'softcodestudio44@gmail.com' || user?.role === 'admin';

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new-message', (message) => {
        setMessages((prev) => {
          const exists = prev.find(m => m.id === message.id);
          if (exists) return prev;
          return [...prev, message];
        });
      });
      
      socket.on('new-dm', (message) => {
        if (dmUser && (message.authorId === dmUser.id || message.authorId === user?.id)) {
          setMessages((prev) => {
            const exists = prev.find(m => m.id === message.id);
            if (exists) return prev;
            return [...prev, message];
          });
        }
      });

      socket.on('messages-cleared', () => {
        setMessages([]);
      });
      
      return () => {
        socket.off('new-message');
        socket.off('new-dm');
        socket.off('messages-cleared');
      };
    }
  }, [socket, dmUser, user]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchRooms = async () => {
    try {
      const response = await api.get('/chat/rooms');
      setRooms(response.data);
      if (response.data.length > 0) {
        selectRoom(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRoom = async (room) => {
    if (activeRoom) leaveRoom(activeRoom.id);
    setActiveRoom(room);
    setDmUser(null);
    setShowSidebar(false);
    joinRoom(room.id);
    try {
      const response = await api.get(`/chat/rooms/${room.id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const startDM = async (targetUser) => {
    if (activeRoom) leaveRoom(activeRoom.id);
    setActiveRoom(null);
    setDmUser(targetUser);
    setShowSidebar(false);
    
    const sortedIds = [user.id, targetUser.id].sort();
    const roomName = `dm:${sortedIds[0]}:${sortedIds[1]}`;
    
    joinRoom(roomName);
    
    try {
      const response = await api.get(`/chat/rooms/${roomName}/messages`);
      setMessages(response.data);
    } catch (error) {
      setMessages([]);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (dmUser) {
      socket.emit('send-dm', {
        recipientId: dmUser.id,
        content: newMessage.trim(),
      });
      
      setNewMessage('');
      return;
    }

    if (!activeRoom) return;
    sendMessage(activeRoom.id, newMessage.trim());
    setNewMessage('');
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
    if (!window.confirm('Clear all messages in this room?')) return;
    
    try {
      await api.delete(`/chat/rooms/${activeRoom.id}/clear`);
      setMessages([]);
    } catch (err) {
      console.error('Clear chat failed:', err);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const currentTyping = activeRoom ? Object.entries(typingUsers)
    .filter(([_, name]) => name && _ !== user?.id)
    .map(([_, name]) => name) : [];

  const goBackToChannels = () => {
    setDmUser(null);
    setMessages([]);
    if (rooms.length > 0) {
      selectRoom(rooms[0]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0a0f0d]">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#0a0f0d]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/[0.02] rounded-full blur-3xl" />
      </div>

      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden" 
          onClick={() => setShowSidebar(false)} 
        />
      )}

      <div className={`
        fixed lg:static z-50 h-full w-80 lg:w-72 bg-[#0d1210]/95 backdrop-blur-xl 
        border-r border-emerald-500/10 flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        <div className="p-4 border-b border-emerald-500/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">DevChat</h2>
              <p className="text-xs text-emerald-400/50">{onlineUsers.length} online</p>
            </div>
          </div>
          <button 
            onClick={() => setShowSidebar(false)} 
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-emerald-500/10">
          <button
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-3 text-xs font-medium transition-all ${
              activeTab === 'channels' 
                ? 'text-emerald-400 border-b-2 border-emerald-500/30' 
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => setActiveTab('dms')}
            className={`flex-1 py-3 text-xs font-medium transition-all ${
              activeTab === 'dms' 
                ? 'text-emerald-400 border-b-2 border-emerald-500/30' 
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            Messages
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'channels' ? (
            <div className="p-3 space-y-1">
              <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider px-3 mb-2">Channels</p>
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => selectRoom(room)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    activeRoom?.id === room.id && !dmUser
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'hover:bg-white/[0.02] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      activeRoom?.id === room.id && !dmUser ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/20'
                    }`}>
                      <Hash className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-sm font-medium block truncate ${activeRoom?.id === room.id && !dmUser ? 'text-emerald-300' : 'text-white/60'}`}>
                        {room.name}
                      </span>
                      {room.topic && <span className="text-[11px] text-white/20 truncate block">{room.topic}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-3 space-y-1">
              <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider px-3 mb-2">Online Users</p>
              {onlineUsers.filter(u => u.id !== user?.id).map((u) => (
                <button
                  key={u.id}
                  onClick={() => startDM(u)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    dmUser?.id === u.id
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'hover:bg-white/[0.02] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/15" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center text-[10px] font-bold text-white">
                          {u.name?.[0]}
                        </div>
                      )}
                      <Circle className="w-2 h-2 text-emerald-400 absolute -bottom-0.5 -right-0.5 fill-emerald-400 stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <span className={`text-sm font-medium block truncate ${dmUser?.id === u.id ? 'text-emerald-300' : 'text-white/60'}`}>
                        {u.name}
                      </span>
                      <span className="text-[11px] text-white/20 truncate block">Click to message</span>
                    </div>
                    <Mail className="w-3.5 h-3.5 text-white/10 flex-shrink-0" />
                  </div>
                </button>
              ))}
              {onlineUsers.filter(u => u.id !== user?.id).length === 0 && (
                <p className="text-xs text-white/20 text-center py-8">No users online</p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-emerald-500/10 flex-shrink-0">
          <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-3">Online</p>
          <div className="flex -space-x-2">
            {onlineUsers.filter(u => u.id !== user?.id).slice(0, 5).map((u) => (
              <button
                key={u.id}
                onClick={() => startDM(u)}
                className="relative hover:z-10 transition-transform hover:scale-110"
              >
                {u.avatar ? (
                  <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-900" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-slate-900">
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

      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 w-full">
        
        {activeRoom && !dmUser && (
          <div className="px-4 py-3 border-b border-emerald-500/10 flex items-center gap-3 flex-shrink-0">
            <button 
              onClick={() => setShowSidebar(true)} 
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/30"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Hash className="w-4 h-4 text-emerald-400" />
            </div>
            
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-sm">{activeRoom.name}</h3>
              <p className="text-xs text-white/20 truncate">{activeRoom.topic}</p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                <Users className="w-3.5 h-3.5 text-emerald-400/60" />
                <span className="text-xs text-emerald-400/60">{onlineUsers.length}</span>
              </div>
              
              {isAdmin && (
                <button
                  onClick={handleClearChat}
                  className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                  title="Clear all messages"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {dmUser && (
          <div className="px-4 py-3 border-b border-emerald-500/10 flex items-center gap-3 flex-shrink-0">
            <button 
              onClick={() => setShowSidebar(true)} 
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/30"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <button 
              onClick={goBackToChannels}
              className="p-2 rounded-lg hover:bg-white/5 text-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="relative">
              {dmUser.avatar ? (
                <img src={dmUser.avatar} alt={dmUser.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/20" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center text-sm font-bold text-white">
                  {dmUser.name?.[0]}
                </div>
              )}
              <Circle className="w-2.5 h-2.5 text-emerald-400 absolute -bottom-0.5 -right-0.5 fill-emerald-400 stroke-[3]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-sm">{dmUser.name}</h3>
              <p className="text-xs text-emerald-400/50">Direct Message</p>
            </div>
          </div>
        )}

        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
          style={{ scrollBehavior: 'smooth' }}
        >
          {messages.length === 0 && dmUser ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center mb-4">
                <Mail className="w-7 h-7 text-emerald-400/30" />
              </div>
              <p className="text-sm text-white/30">Start a conversation with {dmUser.name}</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwn = msg.authorId === user?.id;
              const showAvatar = index === 0 || messages[index - 1].authorId !== msg.authorId;

              return (
                <div key={msg.id} className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar - only show on left for others, hide for own messages or use small indicator */}
                    {showAvatar && !isOwn && (
                      <div className="flex-shrink-0 self-end">
                        {msg.author?.avatar ? (
                          <img src={msg.author.avatar} alt={msg.author.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/15" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center text-xs font-bold text-white">
                            {msg.author?.name?.[0] || 'U'}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Spacer for own messages to align with avatar width */}
                    {isOwn && <div className="w-8 flex-shrink-0" />}
                    
                    {/* Message Content */}
                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {/* Name and time - only show for others */}
                      {showAvatar && !isOwn && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-xs font-medium text-white/50">{msg.author?.name}</span>
                          <span className="text-xs text-white/20">{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      {/* Time only for own messages */}
                      {showAvatar && isOwn && (
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-xs text-white/20">{formatTime(msg.createdAt)}</span>
                          <span className="text-xs font-medium text-emerald-400/50">You</span>
                        </div>
                      )}
                      
                      {/* Message Bubble */}
                      <div className={`px-4 py-2.5 rounded-2xl ${
                        isOwn 
                          ? 'bg-emerald-600/20 border border-emerald-500/25 rounded-tr-sm text-white/90' 
                          : 'bg-white/[0.03] border border-white/[0.06] rounded-tl-sm text-white/75'
                      }`}>
                        <p className="text-sm break-words leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {currentTyping.length > 0 && (
            <div className="flex w-full justify-start">
              <div className="flex gap-2 max-w-[80%]">
                <div className="flex-shrink-0 self-end">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.05] px-4 py-2.5 rounded-2xl rounded-tl-sm">
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

        {isAuthenticated ? (
          <div className="px-4 py-4 border-t border-emerald-500/10 flex-shrink-0">
            <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={
                    dmUser 
                      ? `Message ${dmUser.name}...` 
                      : `Message #${activeRoom?.name || 'room'}...`
                  }
                  className="input-glass pr-12 py-3"
                  value={newMessage}
                  onChange={handleTyping}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/5 text-white/20 hover:text-emerald-400">
                  <Mic className="w-4 h-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-20 shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </form>
          </div>
        ) : (
          <div className="p-4 border-t border-emerald-500/10 text-center text-white/20 text-sm">
            Please <a href="/login" className="text-emerald-400 hover:underline">login</a> to join the chat
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;