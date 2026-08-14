import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const ProfileMenu = () => {
  const { user, logout } = useAuth();
  const { theme, changeTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative ml-1" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center focus:outline-none"
        aria-label="Profile menu"
      >
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
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-2xl bg-[#0d0f16] border border-white/10 shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-xs font-bold text-white">
                  {user?.name?.[0] || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-white/40 truncate">{user?.email}</p>
              </div>
            </div>

            <Link
              to={`/user/${user?.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <User className="w-4 h-4" />
              View Profile
            </Link>

            <div className="border-t border-white/[0.06] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">Theme</p>
              <div className="flex flex-col gap-0.5">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => changeTheme(value)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      theme === value
                        ? 'text-violet-300 bg-white/[0.05]'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    {theme === value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/70 hover:text-red-400 hover:bg-white/[0.04] transition-colors border-t border-white/[0.06]"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileMenu;
