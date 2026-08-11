import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, MessageCircle, Sparkles, PenLine, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BottomNav = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const tabs = [
    { to: '/', label: 'Feed', icon: Home, active: path === '/' },
    { to: '/community', label: 'Community', icon: Users, active: path.startsWith('/community') || path === '/chat' },
    { to: '/messages', label: 'Messages', icon: MessageCircle, active: path.startsWith('/messages') || path === '/dm' },
    { to: '/betty-ai', label: 'Betty', icon: Sparkles, active: path.startsWith('/betty-ai') },
    {
      to: user?.id ? `/user/${user.id}` : '/login',
      label: 'Profile',
      icon: User,
      active: user?.id ? path.startsWith(`/user/${user.id}`) || path.startsWith('/edit-profile') : false,
    },
  ];

  return (
    <>
      {isAuthenticated && (
        <Link to="/create" className="fab lg:hidden" aria-label="Write post">
          <PenLine className="w-6 h-6" />
        </Link>
      )}

      <nav className="tab-bar lg:hidden">
        <div className="h-full flex items-stretch">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={`tab-item ${tab.active ? 'active' : ''}`}
            >
              <tab.icon className="w-[22px] h-[22px]" strokeWidth={tab.active ? 2.4 : 2} />
              <span>{tab.label}</span>
              <span className="tab-dot" />
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
