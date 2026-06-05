import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Facebook, Mail, Heart, MessageSquare, Sparkles, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative border-t border-white/[0.04] mt-auto" style={{ background: 'rgba(5, 6, 8, 0.9)', backdropFilter: 'blur(40px)' }}>
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/logo.png" 
                alt="DevBlog" 
                className="w-10 h-10 rounded-xl object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/15 hidden">
                <span className="text-white font-bold text-sm">DB</span>
              </div>
              <span className="text-lg font-bold gradient-text">DevBlog</span>
            </div>
            <p className="text-sm text-white/25 leading-relaxed">
              A global platform for developers to share knowledge, collaborate, and grow together.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2.5">
              <li><Link to="/" className="text-sm text-white/30 hover:text-emerald-400/70 transition-colors">Blog Feed</Link></li>
              <li><Link to="/chat" className="text-sm text-white/30 hover:text-emerald-400/70 transition-colors">Developer Chat</Link></li>
              <li><Link to="/create" className="text-sm text-white/30 hover:text-emerald-400/70 transition-colors">Write Article</Link></li>
              <li><Link to="/betty-ai" className="text-sm text-white/30 hover:text-emerald-400/70 transition-colors">AI Assistant</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-4">Community</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-white/30 hover:text-emerald-400/70 transition-colors">Code of Conduct</a></li>
              <li><a href="#" className="text-sm text-white/30 hover:text-emerald-400/70 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-white/30 hover:text-emerald-400/70 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-white/30 hover:text-emerald-400/70 transition-colors">Contributors</a></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider mb-4">Connect</h4>
            <div className="flex gap-3 mb-4">
              <a 
                href="https://github.com/softcodestudio44-tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-emerald-500/[0.08] hover:border-emerald-500/20 transition-all group"
              >
                <Github className="w-4 h-4 text-white/30 group-hover:text-emerald-400/70" />
              </a>
              <a 
                href="https://www.facebook.com/softcodewebstudio" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-emerald-500/[0.08] hover:border-emerald-500/20 transition-all group"
              >
                <Facebook className="w-4 h-4 text-white/30 group-hover:text-emerald-400/70" />
              </a>
              <a 
                href="https://www.tiktok.com/@softcodestudio" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-emerald-500/[0.08] hover:border-emerald-500/20 transition-all group"
              >
                <svg className="w-4 h-4 text-white/30 group-hover:text-emerald-400/70" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
              <a 
                href="mailto:softcodestudio44@gmail.com" 
                className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-emerald-500/[0.08] hover:border-emerald-500/20 transition-all group"
              >
                <Mail className="w-4 h-4 text-white/30 group-hover:text-emerald-400/70" />
              </a>
            </div>
            <p className="text-xs text-white/15">softcodestudio44@gmail.com</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/15">
            Built with <Heart className="w-3 h-3 inline text-red-400/50" /> by{' '}
            <a 
              href="https://github.com/softcodestudio44-tech" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-emerald-400/60 hover:text-emerald-400 transition-colors"
            >
              Softcode Web Studio
            </a>
          </p>
          <p className="text-xs text-white/10">
            © 2026 DevBlog. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;