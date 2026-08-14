import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import AnimatedBackground from './components/AnimatedBackground';
import OfflineBanner from './components/OfflineBanner';
import InstallPrompt from './components/InstallPrompt';
import LoadingScreen from './components/LoadingScreen';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import PostDetail from './pages/PostDetail';
import UserProfile from './pages/UserProfile';
import EditProfile from './pages/EditProfile';
import Community from './pages/Community';
import Messages from './pages/Messages';
import BettyAI from './pages/BettyAI';

function PublicOnly({ children }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function AppContent() {
  const { user, isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  useOfflineSync(user, toast);

  // Keep the loading screen visible briefly so it doesn't flicker
  const [minDelayDone, setMinDelayDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 700);
    return () => clearTimeout(t);
  }, []);
  const showLoader = loading || !minDelayDone;

  const location = useLocation();
  const PUBLIC_PATHS = ['/login', '/register', '/forgot-password'];
  const isAuthPage = PUBLIC_PATHS.includes(location.pathname);
  const isLanding = location.pathname === '/' && !isAuthenticated;
  const showNav = !isAuthPage && !isLanding;

  const mainClass = showNav
    ? 'flex-1 flex flex-col min-w-0 pt-16 pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0'
    : 'flex-1 flex flex-col min-w-0';

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen flex flex-col relative z-10">
        {showNav && <Navbar />}

        <main className={mainClass}>
          <Routes>
            <Route path="/" element={isAuthenticated ? <Home /> : loading ? null : <Landing />} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
            <Route path="/create" element={<RequireAuth><CreatePost /></RequireAuth>} />
            <Route path="/edit-post/:id" element={<RequireAuth><EditPost /></RequireAuth>} />
            <Route path="/post/:id" element={<RequireAuth><PostDetail /></RequireAuth>} />
            <Route path="/user/:id" element={<RequireAuth><UserProfile /></RequireAuth>} />
            <Route path="/edit-profile" element={<RequireAuth><EditProfile /></RequireAuth>} />
            <Route path="/betty-ai" element={<RequireAuth><BettyAI /></RequireAuth>} />

            {/* Separate Community (channels) and Messages (DMs) */}
            <Route path="/community" element={<RequireAuth><Community /></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />

            {/* Redirect old routes to new ones */}
            <Route path="/chat" element={<RequireAuth><Community /></RequireAuth>} />
            <Route path="/dm" element={<RequireAuth><Messages /></RequireAuth>} />
          </Routes>
        </main>

        {showNav && <BottomNav />}
      </div>
      <OfflineBanner />
      <InstallPrompt />
      <AnimatePresence>{showLoader && <LoadingScreen />}</AnimatePresence>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <AppContent />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
