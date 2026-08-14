import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch profile from Supabase
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  };

  // Create the profile row for a user if it doesn't exist yet (e.g. social login)
  const ensureProfile = async (authUser) => {
    if (!authUser) return null;

    const existing = await fetchProfile(authUser.id);
    if (existing) return existing;

    const metadata = authUser.user_metadata || {};
    const email = authUser.email || metadata.email || (metadata.user_name || authUser.id) + '@devblog.local';
    const name = metadata.full_name || metadata.name || metadata.user_name || (authUser.email ? authUser.email.split('@')[0] : 'Developer');
    const avatar = metadata.avatar_url || metadata.picture || null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: authUser.id, email, name, avatar }, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating profile:', err);
      return null;
    }
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await ensureProfile(session.user);
        setUser({ ...session.user, ...profile });
        setProfile(profile);
        setIsAuthenticated(true);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await ensureProfile(session.user);
          setUser({ ...session.user, ...profile });
          setProfile(profile);
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const profile = await ensureProfile(session.user);
          setUser({ ...session.user, ...profile });
          setProfile(profile);
          setIsAuthenticated(true);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const signInWithOAuth = async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const updateProfile = async (updates) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      setUser(prev => ({ ...prev, ...data }));
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isAuthenticated,
      loading,
      signUp,
      signIn,
      signInWithOAuth,
      logout,
      updateProfile,
      fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);