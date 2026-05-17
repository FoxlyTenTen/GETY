import React, { createContext, useContext, useState } from 'react';
import translations, { Lang, Strings } from '@/lib/translations';

type LanguageContextType = {
    language: Lang;
    setLanguage: (lang: Lang) => void;
    t: Strings;
};

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    setLanguage: () => {},
    t: translations.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Lang>('en');
    return (
        <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] as Strings }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
