import { createContext, useContext, useState, useEffect } from 'react';
import { translations, supportedLanguages } from '../lib/translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('cvln_language');
    return saved || navigator.language.split('-')[0] || 'en';
  });

  useEffect(() => {
    localStorage.setItem('cvln_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    // Fallback to English if translation not found
    if (value === undefined) {
      value = translations['en'];
      for (const k of keys) {
        value = value?.[k];
      }
    }
    
    return value || key;
  };

  const changeLanguage = (lang) => {
    if (supportedLanguages.some(l => l.code === lang)) {
      setLanguage(lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage: changeLanguage, 
      t,
      languages: supportedLanguages 
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
