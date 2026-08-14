import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';

const WHATSAPP_URL = 'https://wa.me/2348056244696';

const FloatingSupport = () => {
  const [open, setOpen] = useState(false);
  const widgetRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      {open && (
        <div
          ref={widgetRef}
          className="absolute bottom-[72px] right-0 w-72 glass-strong rounded-2xl p-5 shadow-2xl shadow-black/50"
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label="Close support chat"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
              <WhatsAppIcon className="w-5 h-5 text-white" />
            </div>
            <p className="font-semibold text-white text-sm">DevBlog Support</p>
          </div>
          <p className="text-sm text-white/60">Hi! How can we help you?</p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold text-sm px-4 py-3 transition-all hover:-translate-y-0.5 shadow-lg shadow-green-500/20"
          >
            <WhatsAppIcon className="w-5 h-5" />
            Chat on WhatsApp
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 active:scale-95 transition-all"
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        {open ? <X className="w-6 h-6" /> : <WhatsAppIcon className="w-7 h-7" />}
      </button>
    </div>
  );
};

export default FloatingSupport;
