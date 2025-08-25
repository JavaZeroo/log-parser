import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

const themes = ['system', 'light', 'dark'];

function applyTheme(theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
  if (theme === 'dark' || (theme === 'system' && prefersDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
    const listener = () => theme === 'system' && applyTheme('system');
    media?.addEventListener('change', listener);
    return () => media?.removeEventListener('change', listener);
  }, [theme]);

  const cycleTheme = () => {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    setTheme(next);
  };

  const icons = {
    system: <Monitor size={16} aria-hidden="true" />,
    light: <Sun size={16} aria-hidden="true" />,
    dark: <Moon size={16} aria-hidden="true" />,
  };

  return (
    <button
      onClick={cycleTheme}
      aria-label="切换主题"
      className={`p-1 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${className}`}
    >
      {icons[theme]}
    </button>
  );
}
