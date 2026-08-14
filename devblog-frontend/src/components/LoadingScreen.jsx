import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[999] bg-[#07080c] flex flex-col items-center justify-center"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <div className="w-[150px] h-[150px] rounded-full bg-white flex items-center justify-center shadow-2xl shadow-black/40 ring-1 ring-black/10">
          <img src="/logo.png?v=4" alt="DevBlog" className="w-[105px] h-[105px] object-contain" />
        </div>
        <h1 className="mt-6 text-3xl font-bold brand-gradient-text">DevBlog</h1>
        <p className="mt-1 text-sm text-white/40">Code. Write. Share.</p>
        <div className="mt-8 w-44 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoadingScreen;
