import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import GradientBackground from './components/GradientBackground';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import PostDetail from './pages/PostDetail';
import UserProfile from './pages/UserProfile';
import EditProfile from './pages/EditProfile';
import Community from './pages/Community';
import Messages from './pages/Messages';
import BettyAI from './pages/BettyAI';

function AppContent() {
  return (
    <>
      <GradientBackground />
      <div className="min-h-screen flex flex-col relative z-10">
        <Navbar />

        <main className="flex-1 flex flex-col min-w-0 pt-16 pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;