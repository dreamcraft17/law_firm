'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

type ThemeContextValue = { theme: Theme; setTheme: (t: Theme) => void; resolved: 'light' | 'dark' };

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'admin-theme';

function getStored(): Theme {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}

function resolveDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider(props: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setThemeState(getStored());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolveDark(theme);
    setResolved(isDark ? 'dark' : 'light');
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') {
        const isDark = resolveDark('system');
        setResolved(isDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', isDark);
      }
    };
    m.addEventListener('change', listener);
    return () => m.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
