import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ChevronDown, Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import MarkdownRenderer from './MarkdownRenderer';

const WELCOME_MESSAGE = {
  id: 'floating-welcome',
  from: 'betty',
  text: "Hi there! 👋 I'm Betty AI. Ask me anything about code.",
  timestamp: new Date(),
};

const FloatingBettyAI = () => {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, []);

  // Load history when opened
  useEffect(() => {
    if (!open || !user?.id) return;
    let cancelled = false;

    const load = async () => {
      setHistoryLoading(true);
      try {
        const { data, error } = await supabase
          .from('betty_ai_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (!cancelled) {
          const history = (data || []).map((m) => ({
            id: m.id,
            from: m.role === 'ai' ? 'betty' : 'user',
            text: m.content,
            timestamp: new Date(m.created_at),
          }));
          setMessages(history.length ? history : [WELCOME_MESSAGE]);
        }
      } catch (err) {
        console.error('Error loading Betty AI history:', err);
        if (!cancelled) setMessages([WELCOME_MESSAGE]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);

  // Real-time responses
  useEffect(() => {
    if (!user?.id || !open) return;

    const channel = supabase
      .channel(`floating-betty:${user.id}`)
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
            if (prev.length === 1 && prev[0].id === 'floating-welcome') return [next];
            return [...prev, next];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, open, scrollToBottom]);

  const saveMessage = async (role, content) => {
    if (!user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('betty_ai_messages')
        .insert({ user_id: user.id, role, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error saving Betty AI message:', err);
      return null;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !user?.id) return;

    const content = input.trim();
    setInput('');
    setLoading(true);

    const savedUserMsg = await saveMessage('user', content);
    const userMessage = savedUserMsg
      ? {
          id: savedUserMsg.id,
          from: 'user',
          text: savedUserMsg.content,
          timestamp: new Date(savedUserMsg.created_at),
        }
      : { id: `temp-${Date.now()}`, from: 'user', text: content, timestamp: new Date() };

    setMessages((prev) => (prev.some((m) => m.id === userMessage.id) ? prev : [...prev, userMessage]));

    try {
      const history = [...messages, userMessage]
        .filter((m) => m.id !== 'floating-welcome')
        .slice(-8)
        .map((m) => ({ from: m.from, text: m.text }));

      const { data, error } = await supabase.functions.invoke('betty-ai', {
        body: { mode: 'chat', message: content, context: 'chat', history },
      });
      if (error) throw error;

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
        : { id: `temp-ai-${Date.now()}`, from: 'betty', text: bettyText, timestamp: new Date() };

      setMessages((prev) => (prev.some((m) => m.id === bettyMessage.id) ? prev : [...prev, bettyMessage]));
    } catch (err) {
      console.error('Betty AI error:', err);
      setMessages((prev) => [
        ...prev,
        { id: `temp-ai-${Date.now()}`, from: 'betty', text: "I'm having trouble connecting. Try again in a moment.", timestamp: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          setOpen((o) => !o);
          setMinimized(false);
        }}
        aria-label="Chat with Betty AI"
        className="fixed z-[60] right-4 lg:right-6 bottom-[84px] lg:bottom-6 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-[0_8px_28px_rgba(168,85,247,0.45)] hover:shadow-[0_10px_40px_rgba(168,85,247,0.65)] hover:scale-110 active:scale-95 transition-all pulse-ring"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={isDesktop ? { x: 60, opacity: 0 } : { y: '100%', opacity: 0.9 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={isDesktop ? { x: 60, opacity: 0 } : { y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className={`fixed z-[70] inset-x-0 bottom-0 rounded-t-3xl lg:inset-x-auto lg:bottom-24 lg:right-6 lg:w-[400px] lg:h-[600px] lg:max-h-[calc(100vh-120px)] lg:rounded-2xl bg-[#0d0f16] border border-white/10 shadow-2xl shadow-black/60 flex flex-col overflow-hidden ${
              minimized ? 'lg:h-auto' : 'h-[82dvh] lg:h-[600px]'
            }`}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center gap-3 bg-[#0d0f16]">
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#0d0f16] rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white text-sm brand-gradient-text">Betty AI</h3>
                <p className="text-[11px] text-emerald-400/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </p>
              </div>
              <button
                onClick={() => setMinimized((m) => !m)}
                className="p-2 rounded-lg hover:bg-white/[0.04] text-white/50 hover:text-white transition-colors"
                aria-label={minimized ? 'Expand' : 'Minimize'}
              >
                <ChevronDown className={`w-5 h-5 transition-transform ${minimized ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-white/[0.04] text-white/50 hover:text-white transition-colors"
                aria-label="Close Betty AI"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollBehavior: 'smooth' }}>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className={`flex gap-2 ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className="flex-shrink-0">
                          {msg.from === 'betty' ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/15">
                              <span className="text-white font-bold text-xs">B</span>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white">
                              {user?.name?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <div className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.from === 'user'
                            ? 'message-user rounded-2xl rounded-tr-sm text-white/90'
                            : 'message-bot rounded-2xl rounded-tl-sm'
                        }`}>
                          <div className="text-white/80 whitespace-pre-wrap break-words">
                            {msg.from === 'betty' ? (
                              <MarkdownRenderer content={msg.text} />
                            ) : (
                              msg.text
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {loading && (
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/15">
                        <span className="text-white font-bold text-xs">B</span>
                      </div>
                      <div className="message-bot p-3.5 rounded-2xl rounded-tl-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                          <div className="typing-dot" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06] bg-[#0d0f16] flex items-end gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Betty anything..."
                    className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-full px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-400/40 transition-all min-w-0"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center hover:from-blue-500 hover:to-violet-500 transition-all disabled:opacity-20 shadow-lg shadow-violet-500/20 flex-shrink-0"
                    aria-label="Send"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingBettyAI;
