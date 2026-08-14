import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const THEME_STORAGE_KEY = 'devblog_theme';
const DARK_COLOR = '#09090B';
const LIGHT_COLOR = '#f8fafc';

const getStoredTheme = () => {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  } catch {
    return 'dark';
  }
};

const getSystemTheme = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';

const applyTheme = (resolved) => {
  const root = document.documentElement;
  root.classList.toggle('light', resolved === 'light');
  root.classList.toggle('dark', resolved === 'dark');
  root.setAttribute('data-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'light' ? LIGHT_COLOR : DARK_COLOR);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const t = getStoredTheme();
    return t === 'system' ? getSystemTheme() : t;
  });

  // Apply the resolved theme class whenever it changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Follow OS preference changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      if (theme === 'system') {
        setResolvedTheme(getSystemTheme());
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const changeTheme = useCallback((next) => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
    setResolvedTheme(next === 'system' ? getSystemTheme() : next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
