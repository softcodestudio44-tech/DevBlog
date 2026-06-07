import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CodeParticles from './components/CodeParticles';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import UserProfile from './pages/UserProfile';
import EditProfile from './pages/EditProfile';
import Chat from './pages/Chat';
import BettyAI from './pages/BettyAI';

const NO_FOOTER_PAGES = ['/chat', '/betty-ai'];

function AppContent() {
  const location = useLocation();
  const showFooter = !NO_FOOTER_PAGES.includes(location.pathname);

  return (
    <>
      <div className="app-background" />
      <CodeParticles />

      <div className="min-h-screen flex flex-col relative">
        <Navbar />

        <main className="flex-1 flex flex-col min-w-0 pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/create" element={<CreatePost />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/betty-ai" element={<BettyAI />} />
          </Routes>
          {showFooter && <Footer />}
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;