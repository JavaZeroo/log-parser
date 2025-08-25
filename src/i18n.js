import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from '../public/locales/zh/translation.json';
import en from '../public/locales/en/translation.json';

const resources = {
  zh: { translation: zh },
  en: { translation: en },
};

const storedLang = localStorage.getItem('language');

i18n.use(initReactI18next).init({
  resources,
  lng: storedLang || 'zh',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
