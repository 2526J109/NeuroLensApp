import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from '../utils/i18n';

interface LanguageContextType {
    locale: string;
    changeLanguage: (lang: string) => Promise<void>;
    t: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType>({
    locale: 'en',
    changeLanguage: async () => { },
    t: (key: string) => key, // default placeholder
});

const LANGUAGE_KEY = '@app_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [locale, setLocale] = useState<string>('en');

    useEffect(() => {
        const initializeLanguage = async () => {
            try {
                const storedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
                if (storedLanguage) {
                    i18n.locale = storedLanguage;
                    setLocale(storedLanguage);
                } else {
                    // Fallback to device language or English
                    const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
                    i18n.locale = deviceLanguage;
                    setLocale(deviceLanguage);
                }
            } catch (error) {
                console.error('Failed to load language', error);
            }
        };

        initializeLanguage();
    }, []);

    const changeLanguage = useCallback(async (newLocale: string) => {
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, newLocale);
            i18n.locale = newLocale;
            setLocale(newLocale);
        } catch (error) {
            console.error('Failed to save language', error);
        }
    }, []);

    // Provide a bound 't' function that forces the current React state locale to be used.
    const t = useCallback((key: string, options?: any) => {
        return i18n.t(key, { ...options, locale });
    }, [locale]);

    const contextValue = useMemo(() => ({
        locale,
        changeLanguage,
        t
    }), [locale, changeLanguage, t]);

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
