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
    <div className="flex items-center gap-2">
      <label htmlFor="lang-select" className="sr-only">
        {t('header.language')}
      </label>
      <select
        id="lang-select"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="border rounded p-1 text-xs bg-white dark:bg-gray-800"
      >
        <option value="zh">中文</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
