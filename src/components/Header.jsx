import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function Header() {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState(() => localStorage.getItem('language') || i18n.language || 'zh');

  useEffect(() => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  }, [lang, i18n]);

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div
        role="group"
        aria-label={t('header.language')}
        className="flex overflow-hidden rounded border text-xs whitespace-nowrap"
      >
        <button
          type="button"
          onClick={() => setLang('zh')}
          aria-pressed={lang === 'zh'}
          className={`px-2 py-1 transition-colors focus:outline-none whitespace-nowrap ${
            lang === 'zh'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {t('language.zh')}
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          aria-pressed={lang === 'en'}
          className={`px-2 py-1 transition-colors focus:outline-none whitespace-nowrap ${
            lang === 'en'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          {t('language.en')}
        </button>
      </div>
    </div>
  );
}
