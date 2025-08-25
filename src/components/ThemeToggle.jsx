import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement.classList;
    if (root.contains('dark')) {
      root.remove('dark');
      setIsDark(false);
    } else {
      root.add('dark');
      setIsDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="切换主题"
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
    >
      {isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
      <span>{isDark ? '亮色' : '暗色'}</span>
    </button>
  );
}
