import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('devblog_install_dismissed');
    if (dismissed || isStandalone()) return;

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    // iOS: no beforeinstallprompt, show a hint after a short delay
    if (isIos()) {
      const timer = setTimeout(() => setIosHint(true), 4000);
      return () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      localStorage.setItem('devblog_install_dismissed', '1');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setIosHint(false);
    localStorage.setItem('devblog_install_dismissed', '1');
  };

  return (
    <AnimatePresence>
      {(showBanner || iosHint) && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-[calc(68px+env(safe-area-inset-bottom))] left-4 right-4 z-[70] lg:bottom-5 lg:left-5 lg:right-auto lg:w-80"
        >
          <div className="glass-strong rounded-2xl p-4 shadow-2xl shadow-black/40">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Install DevBlog</p>
                {iosHint ? (
                  <p className="text-xs text-white/50 mt-0.5">
                    Tap the <Share className="w-3 h-3 inline text-white/70" /> share button, then choose "Add to Home Screen".
                  </p>
                ) : (
                  <p className="text-xs text-white/50 mt-0.5">Add to your home screen for a faster, app-like experience.</p>
                )}
              </div>
              <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-white/10 text-white/40 flex-shrink-0" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
            {!iosHint && (
              <button
                onClick={handleInstall}
                className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-all"
              >
                Install
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
