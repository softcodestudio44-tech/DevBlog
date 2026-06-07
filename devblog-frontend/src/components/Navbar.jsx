import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, MessageSquare, LogOut, User, PenLine, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoKey, setLogoKey] = useState(0);

  // Force logo refresh when user changes
  useEffect(() => {
    setLogoKey(prev => prev + 1);
  }, [user?.avatar, user?.name]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: null },
    { to: '/explore', label: 'Explore', icon: Search },
    { to: '/chat', label: 'Chat', icon: MessageSquare },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-[#0a0f0d]/90 backdrop-blur-xl border-b border-emerald-500/10 shadow-lg shadow-black/20' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent hidden sm:block">
                DevBlog
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.to)
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {link.icon && <link.icon className="w-4 h-4" />}
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <NotificationBell />

                  <Link
                    to="/create"
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm font-medium"
                  >
                    <PenLine className="w-4 h-4" />
                    Write
                  </Link>

                  {/* User Avatar / Profile */}
                  <div className="relative group">
                    <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-all">
                      {user?.avatar ? (
                        <img
                          key={logoKey}
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/20"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-sm font-bold text-white ring-2 ring-emerald-500/20">
                          {user?.name?.[0] || 'U'}
                        </div>
                      )}
                    </button>

                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-56 glass-strong opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="p-3 space-y-1">
                        <div className="px-3 py-2 border-b border-white/10 mb-2">
                          <p className="text-sm font-medium text-white">{user?.name}</p>
                          <p className="text-xs text-white/40">{user?.email}</p>
                        </div>

                        <Link
                          to={`/user/${user?.id}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </Link>

                        <Link
                          to="/edit-profile"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <PenLine className="w-4 h-4" />
                          Edit Profile
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-white/5 text-white/60 transition-all"
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
            <div className="absolute top-16 left-0 right-0 bg-[#0d1210]/95 backdrop-blur-xl border-b border-emerald-500/10 p-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive(link.to)
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.icon && <link.icon className="w-4 h-4" />}
                  {link.label}
                </Link>
              ))}

              {isAuthenticated && (
                <>
                  <Link
                    to="/create"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-emerald-400 bg-emerald-500/10"
                  >
                    <PenLine className="w-4 h-4" />
                    Write Post
                  </Link>
                  <Link
                    to={`/user/${user?.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;