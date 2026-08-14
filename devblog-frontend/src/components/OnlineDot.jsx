import React from 'react';
import { useOnlineStatus } from '../context/OnlineStatusContext';

// Green dot when online, grey when offline. Renders at the bottom-right
// of an avatar (wrap in a `relative` container).
const OnlineDot = ({ userId, size = 'w-3 h-3', className = '', borderClass = 'border-[#0F0A1E]' }) => {
  const { isOnline } = useOnlineStatus();
  const online = isOnline(userId);

  return (
    <span
      className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 ${size} ${borderClass} ${
        online ? 'bg-emerald-400' : 'bg-slate-500'
      } ${className}`}
      title={online ? 'Online' : 'Offline'}
      aria-label={online ? 'Online' : 'Offline'}
    />
  );
};

export default OnlineDot;
