import React from 'react';
import { Link } from 'react-router-dom';
import { PenLine, MessageCircle, Sparkles, Users, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import Logo from '../components/Logo';
import WhatsAppIcon from '../components/WhatsAppIcon';

const WHATSAPP_URL = 'https://wa.me/2348056244696';
const WHATSAPP_PHONE = '08056244696';

const features = [
  {
    icon: PenLine,
    title: 'Write & Share',
    desc: 'Write and share blog posts with the developer community.',
  },
  {
    icon: MessageCircle,
    title: 'Community Chat',
    desc: 'Real-time community chat to discuss ideas and get help fast.',
  },
  {
    icon: Sparkles,
    title: 'AI Assistant',
    desc: 'A built-in AI assistant to help you write, debug, and learn.',
  },
  {
    icon: Users,
    title: 'Connect',
    desc: 'Connect with other developers and grow your network.',
  },
];

const Landing = () => {
  return (
    <>
      <SEO
        title="DevBlog — The developer community where code meets creativity"
        description="Write and share blog posts, chat in real time, get help from an AI assistant, and connect with developers around the world."
      />

      <div className="min-h-screen flex flex-col">

        <section className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-20 text-center">
          <Logo size="xl" />
          <h1 className="mt-8 text-5xl sm:text-6xl font-extrabold brand-gradient-text leading-tight">
            DevBlog
          </h1>
          <p className="mt-5 text-lg sm:text-xl font-medium text-white/80 max-w-xl">
            The developer community where code meets creativity
          </p>
          <p className="mt-4 max-w-xl text-white/50">
            Write and share blog posts, chat in real time, get help from an AI
            assistant, and connect with developers around the world.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link
              to="/register"
              className="btn-neon px-8 py-4 text-base inline-flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="btn-secondary px-8 py-4 text-base inline-flex items-center justify-center"
            >
              Login
            </Link>
          </div>
        </section>

        <section className="px-4 py-16 max-w-6xl mx-auto w-full">
          <h2 className="text-center text-3xl font-bold text-white">Built for Developers</h2>
          <p className="text-center text-white/50 mt-2">
            Everything you need to create, learn, and grow.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass-card p-6 text-center hover:-translate-y-1 transition-transform"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                  <f.icon className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-white/50">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-16">
          <div className="max-w-3xl mx-auto glass-card p-8 sm:p-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Need Help?</h2>
            <p className="mt-3 text-white/60">
              WhatsApp business support hotline
              <span className="block mt-1 text-xl font-semibold text-white/85">
                {WHATSAPP_PHONE}
              </span>
            </p>
            <p className="mt-2 text-white/50">Reach us on WhatsApp for support.</p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold px-6 py-3.5 transition-all hover:-translate-y-0.5 shadow-lg shadow-green-500/20"
            >
              <WhatsAppIcon className="w-6 h-6" />
              Chat with us on WhatsApp
            </a>
          </div>
        </section>

        <footer className="border-t border-white/[0.06] px-4 py-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} DevBlog. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/login" className="text-white/60 hover:text-white transition-colors">
                Login
              </Link>
              <Link to="/register" className="text-white/60 hover:text-white transition-colors">
                Join
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
