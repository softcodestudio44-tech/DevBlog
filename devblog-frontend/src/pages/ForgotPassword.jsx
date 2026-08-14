import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SEO from '../components/SEO';
import Logo from '../components/Logo';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw new Error(error.message);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Forgot Password - DevBlog" description="Reset your DevBlog password" />
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="glass-auth-card w-full max-w-md p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <Logo size="auth" withName />
          </div>

          <h1 className="text-center text-2xl font-semibold text-white mb-2">Forgot Password?</h1>
          <p className="text-center text-sm text-white/40 mb-8">
            Enter your email and we'll send you a reset link.
          </p>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {sent ? (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm text-center">
              <CheckCircle2 className="w-5 h-5 inline-block mr-2 -mt-0.5" />
              Reset link sent! Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-white/70 mb-2">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="glass-input pl-10"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-auth w-full">
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-white/40 mt-8">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-purple-400 font-semibold hover:text-purple-300 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;
