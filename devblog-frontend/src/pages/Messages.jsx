import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Send, Users, Menu, X, 
  Trash2, Paperclip, MoreVertical, Search, CornerUpLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useAuth } from '../context/AuthContext';
import { useDirectMessages } from '../hooks/useDirectMessages';

const Messages = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [dmHistory, setDmHistory] = useState([]);
  const [activeDMUser, setActiveDMUser] = useState(null);
  const [pendingDMUserId, setPendingDMUserId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const isAdmin = user?.email === 'sofcodestudio44@gmail.com' || user?.role === 'admin';

  // Use the DMs hook with the active other user
  const { 
    messages: dmMessages, 
    sendMessage: sendDM, 
    deleteMessage: deleteDM, 
    markAsRead,
    loading: dmLoading 
  } = useDirectMessages(activeDMUser?.id);

  // Fetch only connected people (mutual followers or prior DM partners)
  useEffect(() => {
    fetchDMHistory();
  }, [isAuthenticated, user?.id]);

  const fetchDMHistory = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setDmHistory([]);
      setLoading(false);
      return;
    }
    try {
      const myId = user.id;

      // Users who follow me
      const { data: followers, error: followersError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', myId);
      if (followersError) throw followersError;

      // Users I follow
      const { data: following, error: followingError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', myId);
      if (followingError) throw followingError;

      // People I've exchanged direct messages with
      const { data: dmPartners, error: dmError } = await supabase
        .from('direct_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`);
      if (dmError) throw dmError;

      const followerIds = new Set((followers || []).map(f => f.follower_id));
      const followingIds = new Set((following || []).map(f => f.following_id));
      const mutualIds = [...followingIds].filter(id => followerIds.has(id));

      const dmPartnerIds = new Set();
      (dmPartners || []).forEach(m => {
        if (m.sender_id === myId) dmPartnerIds.add(m.recipient_id);
        else if (m.recipient_id === myId) dmPartnerIds.add(m.sender_id);
      });

      const partnerIds = [...new Set([...mutualIds, ...dmPartnerIds])].filter(id => id !== myId);

      if (partnerIds.length === 0) {
        setDmHistory([]);
        setActiveDMUser(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar, email')
        .in('id', partnerIds)
        .order('name', { ascending: true });

      if (error) throw error;

      setDmHistory(data || []);

      // Reconcile the active conversation against the connected list:
      // never show a user who isn't a mutual friend/DM partner.
      setActiveDMUser((current) => {
        const list = data || [];
        if (current && list.some(u => u.id === current.id)) return current;
        return list[0] || null;
      });

      setLoading(false);
    } catch (err) { 
      console.error('Error fetching DM history:', err);
      setDmHistory([]);
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Keep the partner list fresh in real-time (new mutual follow or first DM)
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const channel = supabase
      .channel(`dm-partners:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `or(follower_id=eq.${user.id},following_id=eq.${user.id})`,
        },
        () => fetchDMHistory()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `or(sender_id=eq.${user.id},recipient_id=eq.${user.id})`,
        },
        () => fetchDMHistory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, fetchDMHistory]);

  // Handle URL param for starting DM (only opened once the connection list is loaded,
  // and only if the target is actually a connected friend/DM partner)
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const dmUserId = searchParams.get('user') || searchParams.get('dm');
    if (!dmUserId) return;
    setPendingDMUserId(dmUserId);
    const params = new URLSearchParams(searchParams);
    params.delete('user');
    params.delete('dm');
    const query = params.toString();
    navigate(`${window.location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  }, [searchParams, isAuthenticated, user, navigate]);

  // Resolve the pending DM target against the connected people list
  useEffect(() => {
    if (!pendingDMUserId || loading) return;
    if (dmHistory.length === 0) {
      setPendingDMUserId(null);
      return;
    }
    const target = dmHistory.find(u => u.id === pendingDMUserId);
    if (target) {
      setActiveDMUser(target);
      setReplyTo(null);
      setShowSidebar(false);
      setTimeout(() => markAsRead(), 300);
    }
    setPendingDMUserId(null);
  }, [pendingDMUserId, dmHistory, loading]);

  const startDM = async (targetUser) => {
    if (!targetUser || targetUser.id === user?.id) return;
    setActiveDMUser(targetUser);
    setReplyTo(null);
    setShowSidebar(false);
    
    // Mark messages as read when opening a conversation
    setTimeout(() => markAsRead(), 300);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [dmMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeDMUser || !user?.id) return;
    
    if (activeDMUser.id === user.id) {
      alert("You can't message yourself!");
      return;
    }

    const content = replyTo
      ? `> ${replyTo.content}\n\n${newMessage.trim()}`
      : newMessage.trim();

    await sendDM(content);
    setNewMessage('');
    setReplyTo(null);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleReplyToMessage = (message) => {
    setReplyTo({ id: message.id, authorName: message.sender?.name || 'Message', content: message.content });
    if (inputRef.current) inputRef.current.focus();
  };

  const clearReply = () => setReplyTo(null);

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    if (!window.confirm('Delete this message?')) return;
    try {
      await deleteDM(messageId);
    } catch (err) {
      console.error('Delete message failed:', err);
    }
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-64px-60px)] lg:h-[calc(100dvh-64px)]">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-64px-60px)] lg:h-[calc(100dvh-64px)] overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[5%] right-[10%] w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-3xl animate-pulse" style={{animationDuration: '8s'}} />
        <div className="absolute bottom-[15%] left-[5%] w-[350px] h-[350px] rounded-full bg-primary/[0.02] blur-3xl animate-pulse" style={{animationDuration: '12s'}} />
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
          <div className="glass p-4 mb-4 rounded-3xl shadow-inner shadow-black/20 border border-primary/20 bg-slate-900/80">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary flex items-center justify-center shadow-lg shadow-blue-500/20">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white text-sm">People</h2>
                <p className="text-xs text-primary-300/70">{dmHistory.length} connected</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search people..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {dmHistory.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-primary-400/40" />
                </div>
                <p className="text-sm font-medium text-white/70">No conversations yet</p>
                <p className="text-xs text-white/40 mt-1">Follow someone or send a message to start chatting</p>
                <Link to="/community" className="btn-neon inline-flex items-center justify-center gap-2 px-4 py-2 mt-5 text-sm w-full">
                  <Users className="w-4 h-4" />
                  Explore Community
                </Link>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">FRIENDS &amp; MESSAGES</p>
                {dmHistory.filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(u => {
                  const isActive = activeDMUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => startDM(u)}
                      className={`w-full text-left p-4 rounded-3xl transition-all ${
                        isActive ? 'bg-primary/15 border border-primary/20 shadow-sm shadow-blue-500/10' : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-11 h-11 rounded-full overflow-hidden">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary-700 to-primary-800 flex items-center justify-center text-sm font-bold text-white">
                                {u.name?.[0]}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium truncate text-white/90">{u.name}</span>
                          <span className="text-[12px] text-white/50 truncate block">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {dmHistory.filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="p-4 text-center text-xs text-white/40">No matching people</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 w-full overflow-hidden">
        {dmLoading && (
          <div className="absolute inset-x-0 top-0 z-30 bg-primary/10 text-primary-200 text-center py-1 text-[11px] border-b border-primary/20">
            Loading messages...
          </div>
        )}
        
        {/* Header */}
        {!activeDMUser ? (
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-[#0a0f0d]/90 backdrop-blur-sm">
            <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-white/50">
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Messages</h3>
              <p className="text-xs text-white/40">Select a person to chat with</p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-[#0a0f0d]/90 backdrop-blur-sm">
            <button onClick={() => setShowSidebar(true)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-white/50">
              <Menu className="w-5 h-5" />
            </button>
            <Link to={`/user/${activeDMUser.id}`} className="relative hover:opacity-80">
              {activeDMUser.avatar ? (
                <img src={activeDMUser.avatar} alt={activeDMUser.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20/20" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-700 to-primary-800 flex items-center justify-center text-sm font-bold text-white">
                  {activeDMUser.name?.[0]}
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/user/${activeDMUser.id}`} className="font-semibold text-white text-sm hover:text-primary-300 block truncate">
                {activeDMUser.name}
              </Link>
              <p className="text-xs text-primary-400/50">Direct message</p>
            </div>
            <div className="flex items-center gap-1">
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
              <div className="rounded-3xl border border-primary/10 bg-slate-950/75 p-4 text-white shadow-lg shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-primary-300/70">Direct message</p>
                    <h2 className="text-lg font-semibold text-white">{activeDMUser.name}</h2>
                  </div>
                </div>
              </div>
            )}
            
            {!activeDMUser && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="w-20 h-20 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-white/20" />
                </div>
                <p className="text-sm font-medium text-white/60">Select a conversation</p>
                <p className="text-xs text-white/30 mt-1">
                  {dmHistory.length === 0
                    ? 'No connections yet. Follow someone to start chatting.'
                    : 'Choose someone from your connections to start chatting'}
                </p>
              </div>
            )}

            {dmMessages.length === 0 && activeDMUser && !dmLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center mb-4">
                  <MessageCircle className="w-10 h-10 text-primary-400/20" />
                </div>
                <p className="text-sm text-white/40 font-medium">{activeDMUser.name}</p>
                <p className="text-xs text-white/25 mt-1">Start a conversation</p>
              </div>
            )}
            
            {dmMessages.map((msg, idx) => {
              const isOwn = msg.sender_id === user?.id;
              const prevMsg = dmMessages[idx - 1];
              const nextMsg = dmMessages[idx + 1];
              const showTime = !nextMsg || nextMsg.sender_id !== msg.sender_id ||
                (new Date(nextMsg.created_at) - new Date(msg.created_at)) > 300000;
              const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
              const canDelete = isOwn || isAdmin;
              const author = msg.sender || (msg.sender_id === user?.id ? { name: user.name, avatar: user.avatar } : { name: activeDMUser?.name, avatar: activeDMUser?.avatar });

              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}>
                  <div className={`flex gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                    {isFirstInGroup && !isOwn && (
                      <Link to={`/user/${msg.sender_id}`} className="flex-shrink-0 self-end mb-1">
                        {author?.avatar ? (
                          <img src={author.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-700 to-primary-800 flex items-center justify-center text-[10px] font-bold text-white">
                            {author?.name?.[0] || 'U'}
                          </div>
                        )}
                      </Link>
                    )}
                    {!isFirstInGroup && !isOwn && <div className="w-7 flex-shrink-0" />}

                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} relative group`}>
                      <div className={`px-4 py-2 rounded-3xl backdrop-blur-xl ${
                        isOwn
                          ? 'bg-primary/25 text-white rounded-tr-sm'
                          : 'bg-white/10 text-white/90 rounded-tl-sm border border-white/10 shadow-sm shadow-black/10'
                      }`}>
                        <MarkdownRenderer content={msg.content} />
                      </div>
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
                          {formatTime(msg.created_at)}
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
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-full px-5 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/30 focus:bg-white/[0.06] transition-all"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!activeDMUser}
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || !activeDMUser}
                className="w-11 h-11 rounded-full bg-primary flex items-center justify-center hover:bg-primary-400 transition-all disabled:opacity-20 disabled:hover:bg-primary shadow-lg shadow-blue-500/20 flex-shrink-0"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </form>
          </div>
        ) : (
          <div className="p-4 border-t border-white/5 text-center text-white/30 text-sm">
            Please <a href="/login" className="text-primary-400 hover:underline">login</a> to join.
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;