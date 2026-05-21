import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted variable fonts — Inter for UI, JetBrains Mono for numeric/code.
// Variable files are small (~25-30KB each) and cover all weights we need.
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import './i18n';
import App from './App.jsx';
import { ToastProvider } from './components/ToastContext.jsx';

const theme = localStorage.getItem('theme') || 'system';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (theme === 'dark' || (theme === 'system' && prefersDark)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
