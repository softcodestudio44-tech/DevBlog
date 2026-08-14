import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, Users, MessageCircle, Shield
} from 'lucide-react';
import { isAdminUser } from '../lib/admin';
import NotificationBell from './NotificationBell';
import ProfileMenu from './ProfileMenu';
import Logo from './Logo';

const Navbar = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { to: '/', icon: Home, label: 'Feed' },
    { to: '/community', icon: Users, label: 'Community' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
  ];

  const isActive = (path) => location.pathname === path;
  const isAdmin = isAdminUser(user);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-16 bg-[#0d0f16] border-b border-white/[0.06] transition-shadow duration-300 ${scrolled ? 'shadow-lg shadow-black/25' : ''}`}>
      <div className="h-full px-3 sm:px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <Logo size="sm" />
          <div className="hidden sm:block">
            <span className="text-base font-bold brand-gradient-text">DevBlog</span>
            {isAdmin && (
              <div className="flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-primary-400" />
                <span className="text-[9px] text-primary-400 uppercase tracking-wider">Admin</span>
              </div>
            )}
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-pill ${isActive(item.to) ? 'active' : ''}`}
            >
              <item.icon className="w-[18px] h-[18px]" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {isAuthenticated ? (
            <>
              <NotificationBell />
              <ProfileMenu />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-all">
                Login
              </Link>
              <Link to="/register" className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 transition-all">Join</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
