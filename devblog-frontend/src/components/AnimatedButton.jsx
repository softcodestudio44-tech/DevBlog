import React from 'react';

const AnimatedButton = ({ children, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden group ${className}`}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="relative">{children}</span>
    </button>
  );
};

export default AnimatedButton;