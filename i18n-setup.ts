import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import domain JSONs (using existing files from src/locales)
import arCommon from './src/locales/ar/common.json';
import enCommon from './src/locales/en/common.json';

const resources = {
  ar: { translation: arCommon },
  en: { translation: enCommon },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
