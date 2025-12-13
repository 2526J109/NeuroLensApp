import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const TipCard = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                <Text style={styles.boldText}>Tip: </Text>
                Complete all four tests for the most accurate assessment results.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#EFF6FF', // Blue 50
        borderRadius: 16,
        padding: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#DBEAFE', // Blue 100
    },
    text: {
        fontSize: 14,
        color: '#1E293B',
        lineHeight: 20,
    },
    boldText: {
        fontWeight: 'bold',
    },
});
