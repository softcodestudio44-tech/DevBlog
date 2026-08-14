import React from 'react';
import { Link } from 'react-router-dom';
import { PenLine, MessageCircle, Sparkles, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import Logo from '../components/Logo';

const features = [
  {
    icon: PenLine,
    title: 'Share Your Knowledge',
    desc: 'Write and publish technical blog posts.',
  },
  {
    icon: MessageCircle,
    title: 'Real-Time Community',
    desc: 'Chat with developers in group channels and DMs.',
  },
  {
    icon: Sparkles,
    title: 'Betty AI Assistant',
    desc: 'Get help with code, debugging, and learning.',
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

        <section className="px-4 py-16 max-w-5xl mx-auto w-full">
          <h2 className="text-center text-3xl font-bold text-white">Built for Developers</h2>
          <p className="text-center text-white/50 mt-2">
            Everything you need to create, learn, and grow.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-[#12141b] border border-white/[0.06] rounded-2xl p-7 text-center hover:border-violet-500/30 hover:-translate-y-1 transition-all"
              >
                <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <f.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-white/50">{f.desc}</p>
              </div>
            ))}
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
              <a href="#" onClick={(e) => e.preventDefault()} className="text-white/60 hover:text-white transition-colors">
                Privacy
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing;
