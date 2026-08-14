import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useOnline';

const OfflineBanner = () => {
  const online = useOnline();

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium shadow-lg shadow-black/30">
            <WifiOff className="w-3.5 h-3.5" />
            You're offline — changes will sync when you're back online
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
