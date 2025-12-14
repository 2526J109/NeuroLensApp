import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Header = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.titleText}>Health Assessment</Text>
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
