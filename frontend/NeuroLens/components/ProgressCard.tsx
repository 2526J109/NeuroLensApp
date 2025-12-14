import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export const ProgressCard = () => {
    // 25% progress
    const percentage = 25;
    const radius = 35;
    const strokeWidth = 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <View style={styles.card}>
            <View style={styles.contentContainer}>
                <View style={styles.textContainer}>
                    <Text style={styles.cardTitle}>Your Progress</Text>
                    <Text style={styles.subtitle}>1 of 4 tests completed</Text>

                    <TouchableOpacity style={styles.button}>
                        <Text style={styles.buttonText}>View Results</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.chartContainer}>
                    <Svg height="100" width="100" viewBox="0 0 100 100">
                        {/* Background Circle */}
                        <Circle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke="#F1F5F9"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                        {/* Progress Circle */}
                        <Circle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke="#14B8A6" // Teal 500
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90, 50, 50)"
                        />
                    </Svg>
                    <View style={styles.percentageContainer}>
                        <Text style={styles.percentageText}>{percentage}%</Text>
                        <Text style={styles.completeText}>Complete</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: 24,
    },
    contentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
        paddingRight: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 16,
    },
    button: {
        backgroundColor: '#14B8A6', // Teal
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    chartContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 100,
        height: 100,
    },
    percentageContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentageText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    completeText: {
        fontSize: 10,
        color: '#64748B',
    },
});
