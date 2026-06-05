import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenLine, LogOut, Home, MessageSquare, Sparkles, 
  Menu, X, User, Shield
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Feed' },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/betty-ai', icon: Sparkles, label: 'Betty AI' },
  ];

  const isActive = (path) => location.pathname === path;
  const isAdmin = user?.email === 'softcodestudio44@gmail.com' || user?.role === 'admin';

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16">
        <div className="h-full glass-strong px-4 flex items-center justify-between">
          
          {/* Left: Logo + Hamburger */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/40 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <Link to="/" className="flex items-center gap-2.5">
              <img 
                src="/logo.png" 
                alt="DevBlog" 
                className="w-8 h-8 rounded-lg object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center hidden">
                <span className="text-white font-bold text-xs">DB</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-bold gradient-text">DevBlog</span>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-400" />
                    <span className="text-[9px] text-emerald-400/60 uppercase tracking-wider">Admin</span>
                  </div>
                )}
              </div>
            </Link>
          </div>

          {/* Center: Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
                  isActive(item.to)
                    ? 'bg-emerald-500/[0.08] text-emerald-300 border border-emerald-500/15'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            {isAuthenticated && (
              <Link
                to="/create"
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all ${
                  isActive('/create')
                    ? 'bg-emerald-500/[0.08] text-emerald-300 border border-emerald-500/15'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/[0.02]'
                }`}
              >
                <PenLine className="w-4 h-4" />
                <span>Write</span>
              </Link>
            )}
          </div>

          {/* Right: User Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                
                <Link to={`/user/${user?.id}`} className="flex items-center gap-2 group ml-2">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/20 group-hover:ring-emerald-500/40 transition-all" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center text-xs font-bold text-white ring-2 ring-emerald-500/20">
                      {user?.name?.[0] || 'U'}
                    </div>
                  )}
                </Link>

                <button
                  onClick={handleLogout}
                  className="hidden sm:flex p-2 rounded-xl hover:bg-white/[0.03] text-white/20 hover:text-red-400/80 transition-all ml-1"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-3 py-2 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.02] transition-all">
                  Login
                </Link>
                <Link to="/register" className="px-3 py-2 rounded-xl text-sm bg-emerald-500/[0.06] border border-emerald-500/15 text-emerald-300/80 hover:bg-emerald-500/[0.1] transition-all">
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-[280px] z-50 bg-[#0a0f0d]/98 backdrop-blur-xl border-r border-emerald-500/10 flex flex-col"
            >
              {/* Mobile Menu Header */}
              <div className="p-5 border-b border-emerald-500/10 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3" onClick={() => setMobileMenuOpen(false)}>
                  <img 
                    src="/logo.png" 
                    alt="DevBlog" 
                    className="w-10 h-10 rounded-xl object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center hidden">
                    <span className="text-white font-bold text-sm">DB</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold gradient-text">DevBlog</span>
                    {isAdmin && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400/60 uppercase">Admin</span>
                      </div>
                    )}
                  </div>
                </Link>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/30"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Nav Items */}
              <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider px-3 mb-3">Navigation</p>
                
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                      isActive(item.to)
                        ? 'bg-emerald-500/[0.08] text-emerald-300 border border-emerald-500/15'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                ))}
                
                {isAuthenticated && (
                  <Link
                    to="/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all mt-2 ${
                      isActive('/create')
                        ? 'bg-emerald-500/[0.08] text-emerald-300 border border-emerald-500/15'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                    }`}
                  >
                    <PenLine className="w-5 h-5" />
                    <span className="text-sm font-medium">Write Post</span>
                  </Link>
                )}

                <div className="border-t border-white/[0.04] my-4" />
                
                <p className="text-[10px] font-semibold text-white/20 uppercase tracking-wider px-3 mb-3">Account</p>
                
                {isAuthenticated ? (
                  <>
                    <Link
                      to={`/user/${user?.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/[0.02] transition-all"
                    >
                      <User className="w-5 h-5" />
                      <span className="text-sm font-medium">Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400/60 hover:text-red-400 hover:bg-white/[0.02] transition-all text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </>
                ) : (
                  <div className="space-y-2 px-3">
                    <Link 
                      to="/login" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center py-3 rounded-xl text-white/60 border border-white/[0.05]"
                    >
                      Login
                    </Link>
                    <Link 
                      to="/register" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center py-3 rounded-xl bg-emerald-500/[0.08] text-emerald-300 border border-emerald-500/15"
                    >
                      Join DevBlog
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;