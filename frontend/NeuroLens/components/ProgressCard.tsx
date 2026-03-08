import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAssessment } from '@/contexts/AssessmentContext';
import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;
const isTablet = SCREEN_WIDTH >= 768;

export const ProgressCard = () => {
    const { t } = useLanguage();
    const { completedTasks, isSessionComplete, sessionId } = useAssessment();
    const router = useRouter();

    // Calculate real progress percentage
    const percentage = Math.round((completedTasks.length / 4) * 100);

    // Responsive sizing
    const chartSize = isSmallScreen ? 80 : isTablet ? 120 : 100;
    const radius = isSmallScreen ? 28 : isTablet ? 42 : 35;
    const strokeWidth = isSmallScreen ? 6 : isTablet ? 10 : 8;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const handleViewResults = () => {
        if (completedTasks.length > 0) {
            router.push({
                pathname: '/multimodal-results' as any,
                params: { sessionId }
            });
        } else {
            // Optional: show toast saying "Complete all tests first"
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.contentContainer}>
                <View style={styles.textContainer}>
                    <Text style={styles.cardTitle}>{t('home.progress.title')}</Text>
                    <Text style={styles.subtitle}>{t('home.progress.subtitle')}</Text>

                    <TouchableOpacity
                        style={[styles.button, completedTasks.length === 0 && styles.buttonDisabled]}
                        onPress={handleViewResults}
                        disabled={completedTasks.length === 0}
                    >
                        <Text style={styles.buttonText}>
                            {isSessionComplete ? t('home.progress.viewFinalAnalysis') : t('home.progress.viewResults')}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.chartContainer, { width: chartSize, height: chartSize }]}>
                    <Svg height={chartSize} width={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
                        {/* Background Circle */}
                        <Circle
                            cx={chartSize / 2}
                            cy={chartSize / 2}
                            r={radius}
                            stroke="#F1F5F9"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                        />
                        {/* Progress Circle */}
                        <Circle
                            cx={chartSize / 2}
                            cy={chartSize / 2}
                            r={radius}
                            stroke="#14B8A6" // Teal 500
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform={`rotate(-90 ${chartSize / 2} ${chartSize / 2})`}
                        />
                    </Svg>
                    <View style={styles.percentageContainer}>
                        <Text style={styles.percentageText}>{percentage}%</Text>
                        <Text style={styles.completeText}>{t('home.progress.complete')}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: isSmallScreen ? 16 : isTablet ? 24 : 20,
        padding: isSmallScreen ? 16 : isTablet ? 28 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: isSmallScreen ? 20 : isTablet ? 32 : 24,
    },
    contentContainer: {
        flexDirection: isSmallScreen ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isSmallScreen ? 'flex-start' : 'center',
        gap: isSmallScreen ? 16 : 0,
    },
    textContainer: {
        flex: 1,
        paddingRight: isSmallScreen ? 0 : 16,
        width: isSmallScreen ? '100%' : 'auto',
    },
    cardTitle: {
        fontSize: isSmallScreen ? 16 : isTablet ? 22 : 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
        color: '#64748B',
        marginBottom: isSmallScreen ? 12 : 16,
    },
    button: {
        backgroundColor: '#14B8A6', // Teal
        paddingVertical: isSmallScreen ? 8 : isTablet ? 12 : 10,
        paddingHorizontal: isSmallScreen ? 14 : isTablet ? 20 : 16,
        borderRadius: isSmallScreen ? 8 : isTablet ? 12 : 10,
        alignSelf: isSmallScreen ? 'stretch' : 'flex-start',
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
        textAlign: isSmallScreen ? 'center' : 'left',
    },
    buttonDisabled: {
        backgroundColor: '#CBD5E1', // Slate 300
    },
    chartContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: isSmallScreen ? 'center' : 'flex-end',
    },
    percentageContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentageText: {
        fontSize: isSmallScreen ? 18 : isTablet ? 26 : 20,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    completeText: {
        fontSize: isSmallScreen ? 9 : isTablet ? 12 : 10,
        color: '#64748B',
    },
});
