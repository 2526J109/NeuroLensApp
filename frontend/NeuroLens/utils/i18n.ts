import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import en from '../locales/en.json';
import si from '../locales/si.json';
import ta from '../locales/ta.json';

const i18n = new I18n({
    en,
    si,
    ta,
});

i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export default i18n;
