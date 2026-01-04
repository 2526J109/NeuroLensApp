import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeDrawingRisk, RiskAssessment } from '@/utils/riskAnalysis';
import { DrawingDataJSON } from '@/utils/dataExport';

export default function TestResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    // Parse JSON data from params
    const spiralData: DrawingDataJSON | null = params.spiralData 
        ? JSON.parse(params.spiralData as string) 
        : null;
    const waveData: DrawingDataJSON | null = params.waveData 
        ? JSON.parse(params.waveData as string) 
        : null;
    
    // Calculate risk assessment
    const assessment: RiskAssessment = analyzeDrawingRisk(spiralData, waveData);
    
    // Determine color based on risk level
    const getRiskColor = () => {
        switch (assessment.riskLevel) {
            case 'Low':
                return '#10B981'; // Green
            case 'Moderate':
                return '#F59E0B'; // Orange
            case 'High':
                return '#EF4444'; // Red
        }
    };
    
    const getBackgroundColor = () => {
        switch (assessment.riskLevel) {
            case 'Low':
                return '#D1FAE5'; // Light green
            case 'Moderate':
                return '#FEF3C7'; // Light orange
            case 'High':
                return '#FEE2E2'; // Light red
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Test Results',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#FFFFFF' },
                    headerTitleStyle: {
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: '#0F172A',
                    },
                    headerTintColor: '#0F172A',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Risk Score Card */}
                <View style={[styles.scoreCard, { backgroundColor: getBackgroundColor() }]}>
                    <Text style={styles.scoreLabel}>Risk Assessment</Text>
                    <Text style={[styles.scorePercentage, { color: getRiskColor() }]}>
                        {assessment.riskPercentage}%
                    </Text>
                    <View style={[styles.riskBadge, { backgroundColor: getRiskColor() }]}>
                        <Text style={styles.riskBadgeText}>{assessment.riskLevel} Risk</Text>
                    </View>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimerCard}>
                    <Text style={styles.disclaimerTitle}>Important Notice</Text>
                    <Text style={styles.disclaimerText}>
                        This is a preliminary assessment based on drawing analysis. 
                        It is NOT a medical diagnosis. Please consult a healthcare 
                        professional for proper evaluation.
                    </Text>
                </View>


                {/* Recommendations */}
                <View style={styles.recommendationsCard}>
                    <Text style={styles.recommendationsTitle}>Recommendations</Text>
                    {assessment.riskLevel === 'Low' && (
                        <Text style={styles.recommendationText}>
                            Your drawing patterns appear normal. Continue monitoring your health 
                            and consult a doctor if you notice any changes.
                        </Text>
                    )}
                    {assessment.riskLevel === 'Moderate' && (
                        <Text style={styles.recommendationText}>
                            Some indicators suggest you may benefit from a professional evaluation. 
                            Consider scheduling an appointment with a neurologist.
                        </Text>
                    )}
                    {assessment.riskLevel === 'High' && (
                        <Text style={styles.recommendationText}>
                            Your drawing patterns show several indicators that warrant professional 
                            attention. We strongly recommend consulting a neurologist for comprehensive evaluation.
                        </Text>
                    )}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                    style={styles.homeButton}
                    onPress={() => router.replace('/(tabs)')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.homeButtonText}>Back to Home</Text>
                </TouchableOpacity>

                <View style={{ height: 24 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        padding: 24,
    },
    scoreCard: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 20,
    },
    scoreLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 12,
    },
    scorePercentage: {
        fontSize: 72,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    riskBadge: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    riskBadgeText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    disclaimerCard: {
        backgroundColor: '#FEF3C7',
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    disclaimerTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#92400E',
        marginBottom: 8,
    },
    disclaimerText: {
        fontSize: 14,
        color: '#92400E',
        lineHeight: 20,
    },
    metricsCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    metricsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 20,
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    metricLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        width: 90,
    },
    metricBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        marginHorizontal: 12,
        overflow: 'hidden',
    },
    metricFill: {
        height: '100%',
        borderRadius: 4,
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A',
        width: 45,
        textAlign: 'right',
    },
    recommendationsCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    recommendationsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
    },
    recommendationText: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    },
    homeButton: {
        backgroundColor: '#99F6E4',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    homeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F766E',
    },
});
