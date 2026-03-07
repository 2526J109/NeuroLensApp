import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';

export const Header = () => {
    const { t } = useLanguage();

    return (
        <View style={styles.container}>
            <Text style={styles.welcomeText}>{t('home.welcomeBack')}</Text>
            <Text style={styles.titleText}>{t('home.healthAssessment')}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    welcomeText: {
        fontSize: 16,
        color: '#64748B', // Slate 500
        marginBottom: 4,
    },
    titleText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0F172A', // Slate 900
    },
});
