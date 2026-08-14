import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Send, Users, Hash, Menu, X, 
  Trash2, Paperclip, Search, CornerUpLeft, MoreVertical, Shield, BookOpen, Pencil
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import MarkdownRenderer from '../components/MarkdownRenderer';
import ConfirmDialog from '../components/ConfirmDialog';
import OnlineDot from '../components/OnlineDot';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useMessages } from '../hooks/useMessages';
import { isAdminUser, isAdminEmail } from '../lib/admin';

const CHANNEL_ROOM_KEY = 'devblog-community-active-room';

const DEFAULT_RULES = [
  'Be respectful to all members',
  'No spam or self-promotion',
  'Keep discussions tech-related',
  'No sharing of private information',
  'Admin decisions are final',
];

const ONE_HOUR_MS = 60 * 60 * 1000;

const getChannelRules = (channel) => {
  if (channel?.rules && channel.rules.trim()) {
    return channel.rules.split('\n').map((r) => r.trim()).filter(Boolean);
  }
  return DEFAULT_RULES;
};

const Community = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(() => {
    try {
      const savedId = localStorage.getItem(CHANNEL_ROOM_KEY);
      return savedId ? { id: savedId } : null;
    } catch (err) {
      return null;
    }
  });
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [editRulesOpen, setEditRulesOpen] = useState(false);
  const [rulesDraft, setRulesDraft] = useState('');
  const [busy, setBusy] = useState(false);
  
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);

  const isAdmin = isAdminUser(user);

  // Use the messages hook with the active channel
  const { messages: channelMessages, sendMessage, deleteMessage, loading: messagesLoading } = useMessages(activeChannel?.id);

  // Reset the rules banner + menus whenever the channel changes
  useEffect(() => {
    if (activeChannel?.id) {
      const dismissed = localStorage.getItem(`devblog-rules-dismissed-${activeChannel.id}`);
      setRulesOpen(!dismissed);
    }
    setHeaderMenuOpen(false);
    setMenuMsgId(null);
  }, [activeChannel?.id]);

  // Fetch channels
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChannels(data || []);
      
      if (data?.length > 0) {
        const savedRoomId = localStorage.getItem(CHANNEL_ROOM_KEY);
        const preferredRoom = data.find(r => r.id === savedRoomId) || data[0];
        setActiveChannel(preferredRoom);
        localStorage.setItem(CHANNEL_ROOM_KEY, preferredRoom.id);
      }
      setLoading(false);
    } catch (err) { 
      console.error('Error fetching channels:', err);
      setLoading(false);
    }
  };

  const selectRoom = (channel) => {
    if (!channel) return;
    if (activeChannel?.id === channel.id) return;
    setActiveChannel(channel);
    setReplyTo(null);
    setShowSidebar(false);
    setMenuMsgId(null);
    setHeaderMenuOpen(false);
    localStorage.setItem(CHANNEL_ROOM_KEY, channel.id);
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [channelMessages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;
    
    const content = replyTo
      ? `> ${replyTo.content}\n\n${newMessage.trim()}`
      : newMessage.trim();

    const res = await sendMessage(content);
    if (res?.error) {
      toast({ type: 'notification', title: 'Could not send message', body: res.error });
      return;
    }
    setNewMessage('');
    setReplyTo(null);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleReplyToMessage = (message) => {
    setMenuMsgId(null);
    setReplyTo({ id: message.id, authorName: message.author?.name || 'Message', content: message.content });
    if (inputRef.current) inputRef.current.focus();
  };

  const clearReply = () => setReplyTo(null);

  // ---- Message deletion (issue 4) ----
  const askDeleteMessage = (message, mode) => {
    setMenuMsgId(null);
    if (mode === 'everyone') {
      setConfirm({
        type: 'deleteMessage',
        mode,
        messageId: message.id,
        title: 'Delete message for everyone?',
        message: 'This will remove the message for everyone in the channel.',
        confirmLabel: 'Delete',
      });
    } else if (mode === 'hard') {
      setConfirm({
        type: 'deleteMessage',
        mode,
        messageId: message.id,
        title: 'Delete this message?',
        message: 'This will permanently remove the message from the channel.',
        confirmLabel: 'Delete',
      });
    } else {
      // Delete for me - no confirmation needed, but confirm per spec
      setConfirm({
        type: 'deleteMessage',
        mode,
        messageId: message.id,
        title: 'Delete message for me?',
        message: 'This will only hide the message for you.',
        confirmLabel: 'Delete',
      });
    }
  };

  const confirmDeleteMessage = async () => {
    if (!confirm?.messageId) return;
    setBusy(true);
    const ok = await deleteMessage(confirm.messageId, { mode: confirm.mode || 'everyone' });
    setBusy(false);
    if (ok) {
      toast({ type: 'success', title: 'Message deleted', body: confirm.mode === 'me' ? 'Hidden from your view.' : 'Removed from the channel.' });
    } else {
      toast({ type: 'notification', title: 'Delete failed', body: 'Could not delete the message.' });
    }
    setConfirm(null);
  };

  // ---- Admin: remove user (ban from posting) ----
  const askRemoveUser = (message) => {
    setMenuMsgId(null);
    const name = message.author?.name || 'this user';
    setConfirm({
      type: 'removeUser',
      userId: message.author_id,
      title: `Remove ${name}?`,
      message: `${name} will no longer be able to post in #${activeChannel?.name}.`,
      confirmLabel: 'Remove',
    });
  };

  const confirmRemoveUser = async () => {
    if (!confirm?.userId || !activeChannel) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('channel_bans')
        .insert({
          channel_id: activeChannel.id,
          user_id: confirm.userId,
          banned_by: user?.id,
        });
      if (error) throw error;
      toast({ type: 'success', title: 'User removed', body: `${confirm.title.replace('Remove ', '').replace('?', '')} was removed from #${activeChannel.name}.` });
      setConfirm(null);
    } catch (err) {
      console.error('Failed to remove user:', err);
      toast({ type: 'notification', title: 'Remove failed', body: err.message || 'Could not remove the user.' });
    } finally {
      setBusy(false);
    }
  };

  // ---- Admin: clear channel (delete all messages) ----
  const askClearChannel = () => {
    setHeaderMenuOpen(false);
    setConfirm({
      type: 'clearChannel',
      title: `Clear #${activeChannel?.name}?`,
      message: 'This will permanently delete all messages in this channel.',
      confirmLabel: 'Clear',
    });
  };

  const confirmClearChannel = async () => {
    if (!activeChannel) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('channel_id', activeChannel.id);
      if (error) throw error;
      toast({ type: 'success', title: 'Channel cleared', body: `All messages in #${activeChannel.name} were deleted.` });
      setConfirm(null);
    } catch (err) {
      console.error('Failed to clear channel:', err);
      toast({ type: 'notification', title: 'Clear failed', body: err.message || 'Could not clear the channel.' });
    } finally {
      setBusy(false);
    }
  };

  // ---- Admin: delete entire channel ----
  const askDeleteChannel = () => {
    setHeaderMenuOpen(false);
    setConfirm({
      type: 'deleteChannel',
      title: `Delete #${activeChannel?.name}?`,
      message: 'This will permanently remove the channel and all its messages.',
      confirmLabel: 'Delete',
    });
  };

  const confirmDeleteChannel = async () => {
    if (!activeChannel) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', activeChannel.id);
      if (error) throw error;

      const updated = channels.filter(c => c.id !== activeChannel.id);
      setChannels(updated);

      const generalRoom = updated.find(c => c.name === 'general');
      const nextRoom = generalRoom || updated[0];
      if (nextRoom) {
        setActiveChannel(nextRoom);
        localStorage.setItem(CHANNEL_ROOM_KEY, nextRoom.id);
      } else {
        setActiveChannel(null);
        localStorage.removeItem(CHANNEL_ROOM_KEY);
      }
      toast({ type: 'success', title: 'Channel deleted', body: 'The channel and its messages were removed.' });
      setConfirm(null);
    } catch (err) {
      console.error('Failed to delete channel:', err);
      toast({ type: 'notification', title: 'Delete failed', body: err.message || 'Could not delete the channel.' });
    } finally {
      setBusy(false);
    }
  };

  // ---- Rules (issue 3) ----
  const dismissRules = () => {
    if (activeChannel?.id) {
      localStorage.setItem(`devblog-rules-dismissed-${activeChannel.id}`, '1');
    }
    setRulesOpen(false);
  };

  const canManageRules = isAdmin || activeChannel?.created_by === user?.id;

  const openEditRules = () => {
    setHeaderMenuOpen(false);
    setRulesDraft(getChannelRules(activeChannel).join('\n'));
    setEditRulesOpen(true);
  };

  const saveRules = async (e) => {
    e.preventDefault();
    if (!activeChannel) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('channels')
        .update({ rules: rulesDraft.trim() })
        .eq('id', activeChannel.id);
      if (error) throw error;
      setChannels(prev => prev.map(c => c.id === activeChannel.id ? { ...c, rules: rulesDraft.trim() } : c));
      setActiveChannel(prev => prev ? { ...prev, rules: rulesDraft.trim() } : prev);
      setEditRulesOpen(false);
      toast({ type: 'success', title: 'Rules updated', body: 'Channel rules were saved.' });
    } catch (err) {
      console.error('Failed to save rules:', err);
      toast({ type: 'notification', title: 'Save failed', body: err.message || 'Could not save rules.' });
    } finally {
      setBusy(false);
    }
  };

  const startDM = (targetUser) => {
    navigate(`/messages?user=${targetUser.id}`);
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

      {/* Mobile overlay for sidebar */}
      {showSidebar && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />}

      {/* Sidebar */}
      <div className={`
        fixed lg:static z-50 h-full w-80 lg:w-80 bg-[#0b0d12] 
        border-r border-white/5 flex flex-col flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="lg:hidden p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <h2 className="font-bold text-white text-sm">Channels</h2>
          <button onClick={() => setShowSidebar(false)} className="p-2 rounded-lg hover:bg-white/5 text-white/30">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col h-full">
          <div className="p-4 mb-4 rounded-3xl bg-[#081114]/95 border border-slate-700/30 shadow-inner shadow-black/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-900/20">
                <Users className="w-5 h-5 text-primary-300" />
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
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">CHANNELS</p>
            {channels.filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(channel => (
              <button
                key={channel.id}
                onClick={() => selectRoom(channel)}
                className={`group w-full text-left p-3 rounded-xl transition-all ${
                  activeChannel?.id === channel.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-white/[0.02] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activeChannel?.id === channel.id ? 'bg-primary/15 text-primary-400' : 'bg-white/5 text-white/30'
                  }`}>
                    <Hash className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium block truncate text-white/90">{channel.name}</span>
                    {channel.topic && <span className="text-[11px] text-white/40 truncate block">{channel.topic}</span>}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveChannel(channel); setHeaderMenuOpen(true); }}
                      className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                      title={`Manage #${channel.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 w-full overflow-hidden">
        {messagesLoading && (
          <div className="absolute inset-x-0 top-0 z-30 bg-primary/10 text-primary-200 text-center py-1 text-[11px] border-b border-primary/20">
            Loading messages...
          </div>
        )}
        
        {/* Header */}
        {activeChannel && (
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-[#0d0f16]">
            <button 
              onClick={() => setShowSidebar(true)} 
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-white/50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Hash className="w-5 h-5 text-primary-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                {activeChannel.name}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/15 border border-primary/25 text-[9px] font-bold text-primary-300 uppercase tracking-wider">
                    <Shield className="w-2.5 h-2.5" /> Admin
                  </span>
                )}
              </h3>
              <p className="text-xs text-white/40 truncate">{activeChannel.topic}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => { setHeaderMenuOpen(o => !o); setMenuMsgId(null); }}
                className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                aria-label="Channel options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {headerMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setHeaderMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-xl glass-strong shadow-xl shadow-black/40 p-1.5">
                    {canManageRules && (
                      <button
                        onClick={openEditRules}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.05] transition-all"
                      >
                        <BookOpen className="w-4 h-4 text-primary-400" />
                        Edit rules
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={askClearChannel}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.05] transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-amber-400" />
                        Clear channel
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={askDeleteChannel}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                        Delete channel
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollBehavior: 'smooth' }}>
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {activeChannel && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-slate-100 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Community chat</p>
                    <h2 className="text-lg font-semibold text-white">#{activeChannel.name}</h2>
                  </div>
                </div>
              </div>
            )}

            {/* Rules banner (issue 3) */}
            {activeChannel && rulesOpen && (
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-4 shadow-lg shadow-black/10">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <BookOpen className="w-4 h-4 text-violet-300" />
                    Channel rules
                  </div>
                  <button
                    onClick={dismissRules}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    aria-label="Dismiss rules"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ul className="space-y-1">
                  {getChannelRules(activeChannel).map((rule, i) => (
                    <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                      <span className="text-violet-300/70 mt-0.5">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
                {canManageRules && (
                  <button
                    onClick={openEditRules}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit rules
                  </button>
                )}
              </div>
            )}
            
            {channelMessages.length === 0 && activeChannel && !messagesLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-4">
                  <Hash className="w-10 h-10 text-primary-400/20" />
                </div>
                <p className="text-sm text-white/40 font-medium">Welcome to #{activeChannel.name}</p>
                <p className="text-xs text-white/25 mt-1">This is the start of the channel.</p>
              </div>
            )}
            
            {channelMessages.map((msg, idx) => {
              const prevMsg = channelMessages[idx - 1];
              const showHeader = !prevMsg || prevMsg.author_id !== msg.author_id ||
                (new Date(msg.created_at) - new Date(prevMsg.created_at)) > 300000;
              const isOwn = msg.author_id === user?.id;
              const isDeleted = !!msg.deleted_at;
              const withinHour = (Date.now() - new Date(msg.created_at).getTime()) <= ONE_HOUR_MS;

              const menuOptions = [];
              if (isOwn) {
                if (withinHour) menuOptions.push({ label: 'Delete for everyone', type: 'everyone' });
                menuOptions.push({ label: 'Delete for me', type: 'me' });
              }
              if (isAdmin) {
                if (msg.author_id !== user?.id) menuOptions.push({ label: 'Remove user', type: 'removeUser' });
                menuOptions.push({ label: 'Delete message', type: 'hard' });
              }

              return (
                <div key={msg.id} className={`group ${showHeader ? 'mt-4' : 'mt-0.5'} flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[75%]">
                    {showHeader && (
                      <div className="flex gap-3 mb-2 items-center">
                        <Link to={`/user/${msg.author_id}`} className="relative flex-shrink-0 self-start mt-0.5">
                          {msg.author?.avatar ? (
                            <img src={msg.author.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-xs font-bold text-white">
                              {msg.author?.name?.[0] || 'U'}
                            </div>
                          )}
                          <OnlineDot userId={msg.author_id} />
                        </Link>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                            <Link to={`/user/${msg.author_id}`} className="text-sm font-semibold text-primary-300/80 hover:text-primary-300 hover:underline truncate">
                              {msg.author?.name}
                            </Link>
                            {isAdminEmail(msg.author?.email) && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-primary/15 border border-primary/25 text-[9px] font-bold text-primary-300 uppercase tracking-wider">
                                <Shield className="w-2.5 h-2.5" /> Admin
                              </span>
                            )}
                            <span className="text-[10px] text-white/25">{formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      {isDeleted ? (
                        <div className="px-4 py-3 rounded-3xl bg-white/[0.04] text-white/30 italic text-sm">
                          This message was deleted
                        </div>
                      ) : (
                        <>
                          <div className={`px-4 py-3 rounded-3xl ${isOwn ? 'bg-[#3d2460] text-white rounded-br-sm' : 'bg-[#1a1d27] text-white/90 rounded-bl-sm border border-white/10 shadow-sm shadow-black/10'}`}>
                            <MarkdownRenderer content={msg.content} />
                          </div>
                          <div className="mt-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleReplyToMessage(msg)} type="button" className="p-1 rounded-full hover:bg-white/10 text-white/50">
                              <CornerUpLeft className="w-4 h-4" />
                            </button>
                            {menuOptions.length > 0 && (
                              <div className="relative">
                                <button
                                  onClick={() => setMenuMsgId(menuMsgId === msg.id ? null : msg.id)}
                                  type="button"
                                  className="p-1 rounded-full hover:bg-white/10 text-white/50"
                                  aria-label="Message options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {menuMsgId === msg.id && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setMenuMsgId(null)} />
                                    <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-xl glass-strong shadow-xl shadow-black/40 p-1.5">
                                      {menuOptions.map((opt) => (
                                        <button
                                          key={opt.type}
                                          type="button"
                                          onClick={() => {
                                            if (opt.type === 'removeUser') askRemoveUser(msg);
                                            else if (opt.type === 'everyone') askDeleteMessage(msg, 'everyone');
                                            else if (opt.type === 'me') askDeleteMessage(msg, 'me');
                                            else askDeleteMessage(msg, 'hard');
                                          }}
                                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                            opt.type === 'removeUser'
                                              ? 'text-white/70 hover:text-red-400 hover:bg-red-500/10'
                                              : 'text-white/70 hover:text-white hover:bg-white/[0.05]'
                                          }`}
                                        >
                                          <Trash2 className={`w-3.5 h-3.5 ${opt.type === 'removeUser' ? 'text-red-400/80' : 'text-white/40'}`} />
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </>
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
          <div className="px-4 py-3 border-t border-white/5 flex-shrink-0 bg-[#0d0f16]">
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
                  placeholder={activeChannel ? `Message #${activeChannel.name}...` : 'Select a channel...'}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-full px-5 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/30 focus:bg-white/[0.06] transition-all"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!activeChannel}
                />
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || !activeChannel}
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

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel || 'Delete'}
        loading={busy}
        onCancel={() => { if (!busy) setConfirm(null); }}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === 'deleteMessage') confirmDeleteMessage();
          else if (confirm.type === 'removeUser') confirmRemoveUser();
          else if (confirm.type === 'clearChannel') confirmClearChannel();
          else if (confirm.type === 'deleteChannel') confirmDeleteChannel();
        }}
      />

      {/* Edit rules modal (issue 3) */}
      {editRulesOpen && activeChannel && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { if (!busy) setEditRulesOpen(false); }}>
          <form
            onSubmit={saveRules}
            className="glass-strong w-full max-w-md rounded-2xl p-6 shadow-2xl shadow-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-300" />
                Edit rules for #{activeChannel.name}
              </h3>
              <button type="button" onClick={() => setEditRulesOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/60 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              rows={6}
              value={rulesDraft}
              onChange={(e) => setRulesDraft(e.target.value)}
              placeholder={DEFAULT_RULES.join('\n')}
              className="input-glass resize-none"
            />
            <p className="text-[11px] text-white/30 mt-2">One rule per line.</p>
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setEditRulesOpen(false)} disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl glass text-sm font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-sm font-semibold text-white transition-all disabled:opacity-50">
                Save rules
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Community;
