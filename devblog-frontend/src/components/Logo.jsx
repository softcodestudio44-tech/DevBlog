import React from 'react';

const LOGO_SIZES = {
  sm: { box: 'w-12 h-12', img: 'w-8 h-8', text: 'text-xl' },
  md: { box: 'w-14 h-14', img: 'w-10 h-10', text: 'text-xl' },
  auth: { box: 'w-[120px] h-[120px]', img: 'w-[84px] h-[84px]', text: 'text-2xl' },
  xl: { box: 'w-[150px] h-[150px]', img: 'w-[105px] h-[105px]', text: 'text-3xl' },
};

const Logo = ({ size = 'md', withName = false, className = '' }) => {
  const s = LOGO_SIZES[size] || LOGO_SIZES.md;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`${s.box} rounded-full bg-white flex items-center justify-center shadow-lg shadow-black/25 ring-1 ring-black/10`}
      >
        <img src="/logo.png?v=4" alt="DevBlog" className={`${s.img} object-contain`} />
      </div>
      {withName && (
        <span className={`${s.text} font-bold brand-gradient-text mt-3`}>DevBlog</span>
      )}
    </div>
  );
};

export default Logo;
