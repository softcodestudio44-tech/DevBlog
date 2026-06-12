import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Send, Users, Hash, Menu, X, ArrowLeft, 
  Trash2, Paperclip, Mic, CheckCheck, MoreVertical, Phone, Video,
  Search, UserX, CornerUpLeft
} from 'lucide-react';
import api from '../api/axios';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Messages = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket, onlineUsers, typingUsers, joinRoom, leaveRoom, setTyping, connected } = useSocket();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [dmHistory, setDmHistory] = useState([]);
  const [activeDMUser, setActiveDMUser] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const processedDMessagesRef = useRef(new Set());

  const isAdmin = user?.email === 'softcodestudio44@gmail.com' || user?.role === 'admin';
  const otherOnlineUsers = onlineUsers.filter(u => u.id !== user?.id);

  // Fetch DM history on mount
  useEffect(() => {
    fetchDMHistory();
  }, []);

  // Handle URL param for starting DM
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const dmUserId = searchParams.get('user') || searchParams.get('dm');
    if (!dmUserId) return;
    openDMUserById(dmUserId);
    const params = new URLSearchParams(searchParams);
    params.delete('user');
    params.delete('dm');
    const query = params.toString();
    navigate(`${window.location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  }, [searchParams, isAuthenticated, user, navigate]);

  // Socket listeners for DMs
  useEffect(() => {
    if (!socket) return;

    const handleNewDM = (message) => {
      if (processedDMessagesRef.current.has(message.id)) return;
      processedDMessagesRef.current.add(message.id);

      const isFromMe = message.authorId === user?.id;
      
      // Update DM history sidebar
      if (!isFromMe) {
        setDmHistory(prev => {
          const fromId = message.authorId;
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
            const [item] = updated.splice(existingIndex, 1);
            return [item, ...updated];
          }
          return [newEntry, ...prev];
        });
      }

      // Add to active chat if relevant
      setDmMessages(prev => {
        if (!activeDMUserRef.current) return prev;
        const isFromActiveUser = message.authorId === activeDMUserRef.current.id;
        const isToActiveUser = message.authorId === user?.id;
        if (!isFromActiveUser && !isToActiveUser) return prev;
        
        const tempIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.authorId === message.authorId && m.content === message.content);
        if (tempIndex >= 0) {
          const updated = [...prev];
          updated[tempIndex] = message;
          return updated;
        }
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    const handleMessageDeleted = ({ messageId }) => {
      if (!messageId) return;
      setDmMessages(prev => prev.filter(msg => msg.id !== messageId));
    };

    socket.on('new-dm', handleNewDM);
    socket.on('message-deleted', handleMessageDeleted);

    return () => {
      socket.off('new-dm', handleNewDM);
      socket.off('message-deleted', handleMessageDeleted);
    };
  }, [socket, user]);

  // Ref for active DM user in socket callbacks
  const activeDMUserRef = useRef(activeDMUser);
  useEffect(() => { activeDMUserRef.current = activeDMUser; }, [activeDMUser]);

  // Refresh messages on reconnect
  useEffect(() => {
    if (!socket || !connected || !activeDMUser) return;
    
    const refreshMessages = async () => {
      try {
        const sorted = [user.id, activeDMUser.id].sort();
        const roomName = `dm:${sorted[0]}:${sorted[1]}`;
        const res = await api.get(`/chat/rooms/${roomName}/messages`);
        setDmMessages(res.data || []);
        processedDMessagesRef.current.clear();
        res.data?.forEach(m => processedDMessagesRef.current.add(m.id));
      } catch (err) {
        console.error('Failed to refresh DM messages:', err);
      }
    };
    
    refreshMessages();
  }, [connected, activeDMUser, user]);

  // Auto-scroll
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [dmMessages]);

  const fetchDMHistory = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/chat/dm-history');
      const filtered = (res.data || []).filter(u => u.id !== user?.id);
      setDmHistory(filtered);
      setLoading(false);
    } catch (err) { 
      console.error(err);
      setLoading(false);
    }
  };

  const startDM = async (targetUser) => {
    if (!targetUser || targetUser.id === user?.id) return;
    
    setActiveDMUser(targetUser);
    setReplyTo(null);
    setShowSidebar(false);
    
    const sorted = [user.id, targetUser.id].sort();
    const roomName = `dm:${sorted[0]}:${sorted[1]}`;
    joinRoom(roomName);
    
    try {
      const res = await api.get(`/chat/rooms/${roomName}/messages`);
      setDmMessages(res.data || []);
      processedDMessagesRef.current.clear();
      res.data?.forEach(m => processedDMessagesRef.current.add(m.id));
    } catch (err) { 
      setDmMessages([]);
    }
  };

  const openDMUserById = useCallback(async (targetUserId) => {
    if (!targetUserId || !user?.id || targetUserId === user.id) return;
    try {
      const res = await api.get(`/users/${targetUserId}`);
      const targetUser = {
        id: res.data.id,
        name: res.data.name,
        avatar: res.data.avatar,
      };
      await startDM(targetUser);
    } catch (err) {
      console.error('Failed to open DM from query params:', err);
    }
  }, [user?.id]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeDMUser) return;
    
    if (activeDMUser.id === user?.id) {
      alert("You can't message yourself!");
      return;
    }

    const content = replyTo
      ? `> ${replyTo.content}\n\n${newMessage.trim()}`
      : newMessage.trim();
    const tempId = `temp-${Date.now()}`;

    socket?.emit('send-dm', {
      recipientId: activeDMUser.id,
      content: content,
    });
    
    const optimisticMessage = {
      id: tempId,
      content: content,
      authorId: user.id,
      author: { id: user.id, name: user.name, avatar: user.avatar },
      createdAt: new Date().toISOString(),
    };
    setDmMessages(prev => [...prev, optimisticMessage]);
    
    setDmHistory(prev => {
      const existingIndex = prev.findIndex(u => u.id === activeDMUser.id);
      const newEntry = {
        id: activeDMUser.id,
        name: activeDMUser.name,
        avatar: activeDMUser.avatar,
        lastMessage: content,
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
    
    setNewMessage('');
    setReplyTo(null);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (activeDMUser) {
      const sorted = [user.id, activeDMUser.id].sort();
      const roomName = `dm:${sorted[0]}:${sorted[1]}`;
      setTyping(roomName, true);
      typingTimerRef.current = setTimeout(() => setTyping(roomName, false), 1200);
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
      setDmMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Delete message failed:', err);
    }
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isUserOnline = (uid) => onlineUsers.some(u => u.id === uid);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-[#030405]">
        <div className="w-10 h-10 rounded-full border-2 border-lime-500/20 border-t-lime-400 animate-spin" />
      </div>
    );
  }

  // Filter out self from online users for "Start new conversation"
  const newConversations = otherOnlineUsers.filter(u => !dmHistory.find(d => d.id === u.id));

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
          <h2 className="font-bold text-white text-sm">Messages</h2>
          <button onClick={() => setShowSidebar(false)} className="p-2 rounded-lg hover:bg-white/5 text-white/30">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col h-full">
          <div className="glass p-4 mb-4 rounded-3xl shadow-inner shadow-black/20 border border-lime-500/20 bg-slate-900/80">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-lime-500/20">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">Recent conversations</h2>
                <p className="text-xs text-lime-300/70">{dmHistory.length} chats</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search messages..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-lime-500/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Conversations */}
            <div className="p-3 space-y-1">
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">RECENT</p>
              {dmHistory.filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => {
                const online = isUserOnline(u.id);
                const isActive = activeDMUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => startDM(u)}
                    className={`w-full text-left p-4 rounded-3xl transition-all ${
                      isActive ? 'bg-lime-500/15 border border-lime-500/20 shadow-sm shadow-lime-500/10' : 'bg-white/5 border border-white/10 hover:bg-white/10'
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
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0f0d] ${
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

            {/* Start new conversations */}
            {newConversations.length > 0 && (
              <div className="p-3 space-y-1 border-t border-white/10">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">START NEW CHAT</p>
                {newConversations.filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                  <button
                    key={u.id}
                    onClick={() => startDM(u)}
                    className="w-full text-left p-3 rounded-3xl glass hover:bg-white/10 transition-all"
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
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0f0d] bg-emerald-500" />
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

            {dmHistory.length === 0 && newConversations.length === 0 && (
              <div className="glass p-8 text-center">
                <MessageCircle className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/40">No conversations yet.</p>
                <p className="text-xs text-white/25 mt-1">No one is online right now.</p>
              </div>
            )}
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
        {!activeDMUser ? (
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
        ) : (
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
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollBehavior: 'smooth' }}>
          <div className="mx-auto w-full max-w-4xl space-y-4">
            {activeDMUser && (
              <div className="rounded-3xl border border-lime-500/10 bg-slate-950/75 p-4 text-white shadow-lg shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-lime-300/70">Direct message</p>
                    <h2 className="text-lg font-semibold text-white">{activeDMUser.name}</h2>
                  </div>
                  <div className="text-xs text-white/50">DM history</div>
                </div>
              </div>
            )}
            
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
              const canDelete = isOwn || isAdmin;

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

                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative group`}>
                      <div className={`px-4 py-2 rounded-3xl backdrop-blur-xl ${
                        isOwn
                          ? 'bg-lime-500/25 text-white rounded-tr-sm'
                          : 'bg-white/10 text-white/90 rounded-tl-sm border border-white/10 shadow-sm shadow-black/10'
                      }`}>
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
                      {showTime && (
                        <span className={`text-[10px] text-white/30 mt-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                          {formatTime(msg.createdAt)}
                          {/* CHECK MARKS - SAME AS YOUR SCREENSHOT */}
                          {isOwn && <CheckCheck className="w-3 h-3 inline ml-1 text-white/20" />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
                  placeholder={activeDMUser ? `Message ${activeDMUser.name}...` : 'Select a conversation...'}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-full px-5 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-lime-500/30 focus:bg-white/[0.06] transition-all"
                  value={newMessage}
                  onChange={handleTyping}
                  disabled={!activeDMUser}
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || !activeDMUser}
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

export default Messages;