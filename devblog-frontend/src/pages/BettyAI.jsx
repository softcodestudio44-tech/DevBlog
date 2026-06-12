import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Code, FileText, Sparkles, Loader2, Copy, Check, Mic, Trash2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import MarkdownRenderer from '../components/MarkdownRenderer';

const BettyAI = () => {
  const { user } = useAuth();
  
  // Load messages from localStorage on mount
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('betty-messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert string dates back to Date objects
        return parsed.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      } catch (e) {
        return getDefaultWelcome();
      }
    }
    return getDefaultWelcome();
  });
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('chat');
  const [copiedId, setCopiedId] = useState(null);
  const messagesContainerRef = useRef(null);

  function getDefaultWelcome() {
    return [
      {
        id: 'welcome',
        from: 'betty',
        text: "Hi! I'm Betty AI, your developer assistant. I can help you write posts, explain code, summarize articles, or answer technical questions. What would you like help with?",
        timestamp: new Date(),
      },
    ];
  }

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('betty-messages', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      from: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    requestAnimationFrame(() => scrollToBottom());

    try {
      let endpoint = '/ai/chat';
      let body = { message: input, context: mode };

      if (mode === 'explain') {
        endpoint = '/ai/explain';
        body = { code: input, language: 'javascript' };
      } else if (mode === 'summarize') {
        endpoint = '/ai/summarize';
        body = { content: input };
      } else if (mode === 'write') {
        endpoint = '/ai/write';
        body = { topic: input, type: 'blog post' };
      }

      const response = await api.post(endpoint, body);

      const bettyResponse = {
        id: (Date.now() + 1).toString(),
        from: 'betty',
        text: response.data.response || response.data.explanation || response.data.summary || response.data.suggestions || "I'm not sure how to respond to that. Try asking something else!",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, bettyResponse]);
    } catch (error) {
      console.error('Betty AI frontend error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          from: 'betty',
          text: "Oops! I'm having a moment. Please try again in a few seconds.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollToBottom());
    }
  };

  const clearChat = () => {
    if (window.confirm('Clear all messages?')) {
      setMessages(getDefaultWelcome());
      localStorage.removeItem('betty-messages');
    }
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
    { id: 'summarize', label: 'Summarize', icon: FileText, desc: 'Summarize articles' },
    { id: 'write', label: 'Write Help', icon: Sparkles, desc: 'Help writing posts' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#050608', height: '100vh' }}>
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/[0.025] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 py-4 border-b border-white/[0.04] flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Betty Avatar */}
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-[#050608] rounded-full" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Betty AI</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[11px] text-emerald-400/50">Online</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Clear chat button */}
            <button
              onClick={clearChat}
              className="p-2 rounded-lg hover:bg-white/[0.03] text-white/20 hover:text-red-400/70 transition-all"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            
            {/* Mode pills */}
            <div className="hidden sm:flex gap-1">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                    mode === m.id
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'text-white/20 hover:text-white/40 hover:bg-white/[0.02]'
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
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-4 ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {msg.from === 'betty' ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/15">
                      <span className="text-white font-bold">B</span>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center text-sm font-bold text-white">
                      {user?.name?.[0] || 'U'}
                    </div>
                  )}
                </div>

                {/* Message */}
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

          {/* Typing */}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/15">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div className="message-bot p-4">
                <div className="flex items-center gap-1.5">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 py-4 border-t border-white/[0.04] flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSend} className="flex items-end gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={
                  mode === 'explain' ? 'Paste your code here...' :
                  mode === 'summarize' ? 'Paste article text...' :
                  mode === 'write' ? 'What should I write about?' :
                  'Ask Betty anything...'
                }
                className="input-glass pr-12 py-3.5"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/[0.03] transition-colors text-white/15 hover:text-emerald-400/60"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center hover:from-emerald-400 hover:to-emerald-500 transition-all disabled:opacity-15 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/15"
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