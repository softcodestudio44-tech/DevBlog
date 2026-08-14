import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Code, FileText, Sparkles, Loader2, Copy, Check, Mic, Trash2, GitBranch, Bug, Download, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import MarkdownRenderer from '../components/MarkdownRenderer';

const WELCOME_MESSAGE = {
  id: 'welcome',
  from: 'betty',
  text: "Hi there! 👋 I'm Betty AI. How can I help you today?",
  timestamp: new Date(),
};

const TECH_STACK_KEYWORDS = [
  'react', 'vue', 'angular', 'svelte', 'node', 'next.js', 'nextjs', 'typescript',
  'javascript', 'python', 'django', 'flask', 'fastapi', 'java', 'spring', 'go',
  'golang', 'rust', 'c++', 'c#', '.net', 'php', 'laravel', 'ruby', 'rails',
  'swift', 'kotlin', 'flutter', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
  'postgres', 'postgresql', 'mysql', 'sql', 'mongodb', 'graphql', 'redis',
  'tailwind', 'css', 'html',
];

const QUICK_ACTIONS = [
  { label: 'Review my code', mode: 'review', placeholder: 'Paste your code here...' },
  { label: 'Explain a concept', mode: 'chat', placeholder: 'What concept do you want explained?' },
  { label: 'Generate snippet', mode: 'chat', placeholder: 'Describe the snippet you need...' },
  { label: 'Debug error', mode: 'debug', placeholder: 'Paste your error message or code...' },
];

const detectTechStack = (text = '') => {
  const lower = text.toLowerCase();
  return TECH_STACK_KEYWORDS.filter((kw) => lower.includes(kw));
};

const BettyAI = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [placeholder, setPlaceholder] = useState('Ask Betty anything...');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [mode, setMode] = useState('chat');
  const [copiedId, setCopiedId] = useState(null);
  const [techStack, setTechStack] = useState([]);
  const [slowWarning, setSlowWarning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const slowTimerRef = useRef(null);
  const menuRef = useRef(null);

  // Close the header menu when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  // Load history + conversation memory from Supabase on page open
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setMessages([WELCOME_MESSAGE]);
          setHistoryLoading(false);
        }
        return;
      }

      setHistoryLoading(true);
      try {
        const { data: memory } = await supabase
          .from('betty_conversations')
          .select('tech_stack')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!cancelled && memory?.tech_stack?.length) {
          setTechStack(memory.tech_stack);
        }

        const { data, error } = await supabase
          .from('betty_ai_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (cancelled) return;

        const history = (data || []).map((m) => ({
          id: m.id,
          from: m.role === 'ai' ? 'betty' : 'user',
          text: m.content,
          timestamp: new Date(m.created_at),
        }));

        setMessages(history.length ? history : [WELCOME_MESSAGE]);
      } catch (err) {
        console.error('Error loading Betty AI history:', err);
        if (!cancelled) setMessages([WELCOME_MESSAGE]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    };
  }, [user?.id]);

  // Save a message to Supabase
  const saveMessage = useCallback(
    async (role, content) => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('betty_ai_messages')
        .insert({ user_id: user.id, role, content })
        .select()
        .single();
      if (error) {
        console.error('Error saving Betty AI message:', error);
        return null;
      }
      return data;
    },
    [user?.id]
  );

  // Save conversation memory (last 10 messages + tech stack)
  const saveConversationMemory = useCallback(
    async (history, stack) => {
      if (!user?.id) return;
      try {
        await supabase
          .from('betty_conversations')
          .upsert({
            user_id: user.id,
            history: history.slice(-10),
            tech_stack: stack,
            updated_at: new Date().toISOString(),
          });
      } catch (err) {
        console.error('Error saving Betty AI memory:', err);
      }
    },
    [user?.id]
  );

  // Real-time: responses appear as they come in
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`betty-ai:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'betty_ai_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const m = payload.new;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            const next = {
              id: m.id,
              from: m.role === 'ai' ? 'betty' : 'user',
              text: m.content,
              timestamp: new Date(m.created_at),
            };
            if (prev.length === 1 && prev[0].id === 'welcome') return [next];
            return [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, historyLoading, scrollToBottom]);

  const invokeBettyWithRetry = async (payload) => {
    try {
      const { data, error } = await supabase.functions.invoke('betty-ai', { body: payload });
      if (error) throw error;
      return data;
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const { data, error } = await supabase.functions.invoke('betty-ai', { body: payload });
      if (error) throw error;
      return data;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !user?.id) return;

    const content = input.trim();
    setInput('');
    setPlaceholder(mode === 'review' || mode === 'debug' ? 'Paste your code here...' : 'Ask Betty anything...');
    setLoading(true);
    setSlowWarning(false);
    slowTimerRef.current = setTimeout(() => setSlowWarning(true), 9000);

    // Track the user's tech stack from what they mention
    const detected = detectTechStack(content);
    const mergedStack = [...new Set([...techStack, ...detected])].slice(0, 10);

    const savedUserMsg = await saveMessage('user', content);
    const userMessage = savedUserMsg
      ? {
          id: savedUserMsg.id,
          from: 'user',
          text: savedUserMsg.content,
          timestamp: new Date(savedUserMsg.created_at),
        }
      : { id: Date.now().toString(), from: 'user', text: content, timestamp: new Date() };

    setMessages((prev) => (prev.some((m) => m.id === userMessage.id) ? prev : [...prev, userMessage]));

    requestAnimationFrame(() => scrollToBottom());

    try {
      const conversationHistory = [...messages, userMessage]
        .filter((m) => m.id !== 'welcome')
        .slice(-10)
        .map((m) => ({ from: m.from, text: m.text }));

      let payload = { mode, message: content, context: mode, history: conversationHistory, techStack: mergedStack };

      if (mode === 'explain') {
        payload = { mode, code: content, language: 'javascript', history: conversationHistory, techStack: mergedStack };
      } else if (mode === 'summarize') {
        payload = { mode, content, techStack: mergedStack };
      } else if (mode === 'write') {
        payload = { mode, topic: content, type: 'blog post', history: conversationHistory, techStack: mergedStack };
      } else if (mode === 'review') {
        payload = { mode, code: content, language: 'javascript', history: conversationHistory, techStack: mergedStack };
      } else if (mode === 'debug') {
        payload = { mode, error: content, code: content, history: conversationHistory, techStack: mergedStack };
      }

      const data = await invokeBettyWithRetry(payload);

      const bettyText =
        data.response || data.explanation || data.summary || data.suggestions || data.review || data.debug ||
        "I'm not sure how to respond to that. Try asking something else!";

      const savedBettyMsg = await saveMessage('ai', bettyText);
      const bettyMessage = savedBettyMsg
        ? {
            id: savedBettyMsg.id,
            from: 'betty',
            text: savedBettyMsg.content,
            timestamp: new Date(savedBettyMsg.created_at),
          }
        : {
            id: (Date.now() + 1).toString(),
            from: 'betty',
            text: bettyText,
            timestamp: new Date(),
          };

      setMessages((prev) => (prev.some((m) => m.id === bettyMessage.id) ? prev : [...prev, bettyMessage]));
      if (mergedStack.length !== techStack.length) setTechStack(mergedStack);
      saveConversationMemory(conversationHistory, mergedStack);
    } catch (error) {
      console.error('Betty AI frontend error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          from: 'betty',
          text: "I'm having trouble connecting. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      setSlowWarning(false);
      setLoading(false);
      requestAnimationFrame(() => scrollToBottom());
    }
  };

  // Clear chat: UI only — saved history stays in the database
  const clearChat = () => {
    if (!window.confirm('Clear the conversation from this screen? Your saved history will be kept.')) return;
    setTechStack([]);
    setMessages([WELCOME_MESSAGE]);
    setMenuOpen(false);
    toast({ type: 'success', title: 'Chat cleared', body: 'Saved history was kept.' });
  };

  // Delete history: permanently removes everything from the database
  const deleteHistory = async () => {
    if (!user?.id) return;
    if (!window.confirm('Permanently delete ALL Betty AI chat history? This cannot be undone.')) return;
    try {
      await supabase.from('betty_ai_messages').delete().eq('user_id', user.id);
      await supabase.from('betty_conversations').delete().eq('user_id', user.id);
      setTechStack([]);
      setMessages([WELCOME_MESSAGE]);
      toast({ type: 'success', title: 'History deleted', body: 'All Betty AI history was permanently removed.' });
    } catch (err) {
      console.error('Error deleting Betty AI history:', err);
      toast({ type: 'notification', title: 'Delete failed', body: 'Could not delete history. Try again.' });
    }
    setMenuOpen(false);
  };

  // Export chat: download the full conversation as a .txt file
  const exportChat = () => {
    const lines = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => {
        const who = m.from === 'betty' ? 'Betty AI' : user?.name || 'You';
        return `[${formatTime(m.timestamp)}] ${who}:\n${m.text}\n`;
      });
    if (!lines.length) {
      toast({ type: 'notification', title: 'Nothing to export', body: 'Your chat is empty.' });
      return;
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `betty-ai-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMenuOpen(false);
    toast({ type: 'success', title: 'Chat exported', body: 'Saved as a .txt file.' });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const modes = [
    { id: 'chat', label: 'Chat', icon: Sparkles, desc: 'Ask me anything' },
    { id: 'explain', label: 'Explain Code', icon: Code, desc: 'Paste code to explain' },
    { id: 'review', label: 'Code Review', icon: GitBranch, desc: 'Get your code reviewed' },
    { id: 'debug', label: 'Debug', icon: Bug, desc: 'Find and fix errors' },
    { id: 'summarize', label: 'Summarize', icon: FileText, desc: 'Summarize articles' },
    { id: 'write', label: 'Write Help', icon: Sparkles, desc: 'Help writing posts' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="relative z-10 px-4 sm:px-6 py-4 border-b border-white/[0.04] flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#0B1120] rounded-full" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-base brand-gradient-text">Betty AI</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[11px] text-emerald-400/60">Online</p>
              </div>
            </div>
          </div>

          <div ref={menuRef} className="relative flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={clearChat}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.03] text-white/40 hover:text-violet-300/80 transition-all disabled:opacity-40"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">Clear Chat</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-2 rounded-lg hover:bg-white/[0.03] text-white/40 hover:text-white/70 transition-all"
                title="Chat options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-xl glass-strong shadow-xl shadow-black/40 p-1.5 z-50"
                  >
                    <button
                      onClick={exportChat}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/[0.05] transition-all"
                    >
                      <Download className="w-4 h-4 text-violet-300" />
                      Export chat
                    </button>
                    <button
                      onClick={deleteHistory}
                      disabled={loading}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4 text-red-400/80" />
                      Delete history
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden md:flex gap-1">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setMode(m.id); setPlaceholder(
                    m.id === 'explain' || m.id === 'review' ? 'Paste your code here...' :
                    m.id === 'debug' ? 'Paste your error message or code...' :
                    m.id === 'summarize' ? 'Paste article text...' :
                    m.id === 'write' ? 'What should I write about?' :
                    'Ask Betty anything...'
                  ); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                    mode === m.id
                      ? 'bg-[#2b1b40] text-violet-200 border border-violet-500/40'
                      : 'text-white/25 hover:text-white/50 hover:bg-white/[0.05]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 py-6"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-violet-400/60" />
              </div>
              <p className="text-white/70 font-medium">Please login to chat with Betty AI</p>
              <p className="text-xs text-white/40 mt-1">Sign in to save your conversation history</p>
              <a href="/login" className="btn-neon inline-flex items-center gap-2 px-5 py-2.5 mt-5 text-sm">
                Login
              </a>
            </div>
          ) : historyLoading ? (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/15">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div className="message-bot p-4">
                <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-4 ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className="flex-shrink-0">
                    {msg.from === 'betty' ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/15">
                        <span className="text-white font-bold">B</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-sm font-bold text-white">
                        {user?.name?.[0] || 'U'}
                      </div>
                    )}
                  </div>

                  <div className={`max-w-[80%] ${msg.from === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-medium text-white/40">
                        {msg.from === 'betty' ? 'Betty AI' : user?.name || 'You'}
                      </span>
                      <span className="text-[11px] text-white/15">{formatTime(msg.timestamp)}</span>
                    </div>

                    <div className={`relative group p-4 ${
                      msg.from === 'user' ? 'message-user' : 'message-bot'
                    }`}>
                      <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                        {msg.from === 'betty' ? (
                          <MarkdownRenderer content={msg.text} />
                        ) : (
                          msg.text
                        )}
                      </div>

                      {msg.from === 'betty' && (
                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-white/5"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-white/20" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Typing */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/15">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div className="message-bot p-4">
                <div className="flex items-center gap-1.5">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
              {slowWarning && (
                <span className="text-xs text-violet-300/70 animate-pulse">Betty is thinking... (taking longer than usual)</span>
              )}
            </motion.div>
          )}

          {techStack.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-[10px] text-white/25">Betty remembers your stack:</span>
              {techStack.slice(0, 4).map((t) => (
                <span key={t} className="tag tag-violet text-[10px] px-2 py-0.5">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 py-4 border-t border-white/[0.04] flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          {/* Quick actions */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2.5 mb-1">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  setMode(action.mode);
                  setPlaceholder(action.placeholder);
                  inputRef.current?.focus();
                }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border transition-all ${
                  placeholder === action.placeholder && mode === action.mode
                    ? 'border-violet-400/50 text-violet-200 bg-[#2b1b40]'
                    : 'border-white/10 text-white/50 hover:text-white hover:border-violet-400/30 bg-[#12141b]'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={2}
                placeholder={placeholder}
                className="w-full bg-[#12141b] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400/40 transition-all resize-none disabled:opacity-40"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!isAuthenticated}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 transition-colors text-white/15 hover:text-violet-400/60"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading || !isAuthenticated}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center hover:from-blue-500 hover:to-violet-500 transition-all disabled:opacity-15 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </form>

          <p className="text-center text-[10px] text-white/10 mt-2">
            Betty AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BettyAI;
