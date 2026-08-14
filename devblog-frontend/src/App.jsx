import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function AppContent() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  useOfflineSync(user, toast);

  // Keep the loading screen visible briefly so it doesn't flicker
  const [minDelayDone, setMinDelayDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDelayDone(true), 700);
    return () => clearTimeout(t);
  }, []);
  const showLoader = loading || !minDelayDone;

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen flex flex-col relative z-10">
        <Navbar />

        <main className="flex-1 flex flex-col min-w-0 pt-16 pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/edit-post/:id" element={<EditPost />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/betty-ai" element={<BettyAI />} />

            {/* Separate Community (channels) and Messages (DMs) */}
            <Route path="/community" element={<Community />} />
            <Route path="/messages" element={<Messages />} />

            {/* Redirect old routes to new ones */}
            <Route path="/chat" element={<Community />} />
            <Route path="/dm" element={<Messages />} />
          </Routes>
        </main>

        <BottomNav />
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
