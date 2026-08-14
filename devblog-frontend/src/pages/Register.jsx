import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import SEO from '../components/SEO';
import Logo from '../components/Logo';
import WhatsAppIcon from '../components/WhatsAppIcon';

const GoogleIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.31 1 3.25 3.66 1.28 7.53l3.66 2.84C5.87 7.02 8.68 5.38 12 5.38z" />
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#FBBC05" d="M5.02 13.51a7.02 7.02 0 0 1 0-4.5L1.28 6.1A11.97 11.97 0 0 0 0 12c0 1.93.46 3.76 1.28 5.38l3.74-2.87z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.86-3c-1.08.72-2.45 1.16-4.42 1.16-3.32 0-6.13-1.8-7.56-4.44l-3.66 2.84C3.25 20.34 7.31 23 12 23z" />
  </svg>
);

const GithubIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
  </svg>
);

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const { signUp, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp(email, password, name);
      if (error) throw new Error(error);
      if (data?.session) {
        navigate('/');
      } else {
        setError('Account created! Check your inbox to confirm your email, then sign in.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setError('');
    setOauthLoading(provider);
    try {
      const { error } = await signInWithOAuth(provider);
      if (error) throw new Error(error);
    } catch (err) {
      setError(err.message);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <>
      <SEO title="Join DevBlog" description="Create your DevBlog account" />
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="glass-auth-card w-full max-w-md p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <Logo size="auth" withName />
          </div>

          <h1 className="text-center text-2xl font-semibold text-white mb-8">Join DevBlog</h1>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-white/70 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  required
                  className="glass-input pl-10"
                />
              </div>
            </div>

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

            <div>
              <label className="block text-sm text-white/70 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="glass-input pl-10 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  minLength={6}
                  className="glass-input pl-10"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-auth w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-4 my-7">
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-sm text-white/40">or</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading}
              className="glass-oauth"
              title="Continue with Google"
            >
              {oauthLoading === 'google' ? <span className="spinner-xs" /> : <GoogleIcon className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={!!oauthLoading}
              className="glass-oauth"
              title="Continue with GitHub"
            >
              {oauthLoading === 'github' ? <span className="spinner-xs" /> : <GithubIcon className="w-5 h-5" />}
            </button>
          </div>

          <p className="text-center text-sm text-white/40 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 font-semibold hover:text-purple-300 transition-colors">
              Sign In
            </Link>
          </p>
        </div>

        <a
          href="https://wa.me/2348056244696"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <WhatsAppIcon className="w-4 h-4" />
          Need help? Contact us on WhatsApp
        </a>
      </div>
    </>
  );
};

export default Register;
