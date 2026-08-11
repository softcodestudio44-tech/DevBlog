import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  PenLine, LogOut, Home, Users, MessageCircle, Sparkles, Shield
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Feed' },
    { to: '/community', icon: Users, label: 'Community' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
    { to: '/betty-ai', icon: Sparkles, label: 'Betty AI' },
  ];

  const isActive = (path) => location.pathname === path;
  const isAdmin = user?.email === 'sofcodestudio44@gmail.com' || user?.role === 'admin';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16">
      <div className="h-full px-3 sm:px-4 flex items-center justify-between bg-[#090a0f]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <img 
            src="/logo.png?v=3" 
            alt="DevBlog" 
            className="w-8 h-8 rounded-lg object-cover"
          />
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

        <div className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
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
              <Link
                to="/create"
                className="hidden sm:flex nav-pill"
              >
                <PenLine className="w-[18px] h-[18px]" />
                <span>Write</span>
              </Link>
              <NotificationBell />
              <Link to={`/user/${user?.id}`} className="flex items-center gap-2 ml-1">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 hover:ring-primary/40 transition-all" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-xs font-bold text-white ring-2 ring-primary/20">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}
              </Link>
              <button
                onClick={handleLogout}
                className="hidden sm:flex p-2 rounded-xl hover:bg-white/[0.03] text-white/60 hover:text-red-400 transition-all ml-1"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-3 py-2 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-all">
                Login
              </Link>
              <Link to="/register" className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 transition-all">
                Join
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
