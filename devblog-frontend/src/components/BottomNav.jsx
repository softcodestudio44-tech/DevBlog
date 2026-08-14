import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, MessageCircle, User, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BottomNav = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const profileTo = user?.id ? `/user/${user.id}` : '/login';

  const tabs = [
    { to: '/', label: 'Feed', icon: Home, active: path === '/' },
    {
      to: '/community',
      label: 'Community',
      icon: Users,
      active: path.startsWith('/community') || path === '/chat',
    },
    null,
    {
      to: '/messages',
      label: 'Messages',
      icon: MessageCircle,
      active: path.startsWith('/messages') || path === '/dm',
    },
    {
      to: profileTo,
      label: 'Profile',
      icon: User,
      active: user?.id ? path.startsWith(`/user/${user.id}`) || path.startsWith('/edit-profile') : false,
    },
  ];

  return (
    <nav className="tab-bar lg:hidden">
      <div className="h-full flex items-stretch">
        {tabs.map((tab, index) => {
          if (tab === null) {
            return (
              <div key="create" className="flex-1 flex items-center justify-center relative">
                <Link
                  to={isAuthenticated ? '/create' : '/login'}
                  aria-label="Create post"
                  className="create-fab"
                >
                  <Plus className="w-7 h-7" strokeWidth={2.6} />
                </Link>
              </div>
            );
          }
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`tab-item ${tab.active ? 'active' : ''}`}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={tab.active ? 2.4 : 2} />
              <span>{tab.label}</span>
              <span className="tab-dot" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
