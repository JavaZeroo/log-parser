import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

const theme = localStorage.getItem('theme') || 'system';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (theme === 'dark' || (theme === 'system' && prefersDark)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
