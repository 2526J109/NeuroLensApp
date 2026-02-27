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

type RiskLevel = 'Low' | 'Moderate' | 'High';

const getRiskLevelFromPercentage = (percentage: number): RiskLevel => {
    if (percentage < 30) return 'Low';
    if (percentage < 60) return 'Moderate';
    return 'High';
};

export default function VoiceTestResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const percentageParam = params.percentage
        ? Number(params.percentage as string)
        : 0;

    const statusParam = (params.status as string) || 'good';
    const descriptionParam = (params.description as string) || '';

    const riskPercentage = Number.isNaN(percentageParam)
        ? 0
        : Math.max(0, Math.min(100, percentageParam));

    const riskLevel: RiskLevel = getRiskLevelFromPercentage(riskPercentage);

    const getRiskColor = () => {
        switch (riskLevel) {
            case 'Low':
                return '#10B981'; // Green
            case 'Moderate':
                return '#F59E0B'; // Orange
            case 'High':
                return '#EF4444'; // Red
        }
    };

    const getBackgroundColor = () => {
        switch (riskLevel) {
            case 'Low':
                return '#D1FAE5'; // Light green
            case 'Moderate':
                return '#FEF3C7'; // Light orange
            case 'High':
                return '#FEE2E2'; // Light red
        }
    };

    const getSummaryText = () => {
        if (descriptionParam) {
            return descriptionParam;
        }

        if (statusParam === 'good') {
            return 'Voice characteristics within normal range. No significant tremor detected.';
        }

        if (riskLevel === 'Moderate') {
            return 'Slight voice tremor detected. Consider monitoring your symptoms and practicing voice exercises.';
        }

        return 'Moderate voice tremor and reduced clarity detected. Consider consulting a healthcare professional.';
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
                <View
                    style={[
                        styles.scoreCard,
                        { backgroundColor: getBackgroundColor() },
                    ]}
                >
                    <Text style={styles.scoreLabel}>Risk Assessment</Text>
                    <Text
                        style={[
                            styles.scorePercentage,
                            { color: getRiskColor() },
                        ]}
                    >
                        {riskPercentage}%
                    </Text>
                    <View
                        style={[
                            styles.riskBadge,
                            { backgroundColor: getRiskColor() },
                        ]}
                    >
                        <Text style={styles.riskBadgeText}>
                            {riskLevel} Risk
                        </Text>
                    </View>
                </View>

                {/* Summary from analysis */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Voice Assessment</Text>
                    <Text style={styles.summaryStatus}>
                        Status: {statusParam === 'good' ? 'Good' : 'Warning'}
                    </Text>
                    <Text style={styles.summaryText}>{getSummaryText()}</Text>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimerCard}>
                    <Text style={styles.disclaimerTitle}>Important Notice</Text>
                    <Text style={styles.disclaimerText}>
                        This is a preliminary assessment based on voice analysis.
                        It is NOT a medical diagnosis. Please consult a
                        healthcare professional for proper evaluation.
                    </Text>
                </View>

                {/* Recommendations */}
                <View style={styles.recommendationsCard}>
                    <Text style={styles.recommendationsTitle}>
                        Recommendations
                    </Text>
                    {riskLevel === 'Low' && (
                        <Text style={styles.recommendationText}>
                            Your voice characteristics appear within normal
                            range. Continue monitoring your health and consult a
                            doctor if you notice any changes.
                        </Text>
                    )}
                    {riskLevel === 'Moderate' && (
                        <Text style={styles.recommendationText}>
                            Mild changes in voice patterns are present. Consider
                            regular checkups and practicing breathing and voice
                            exercises to support vocal stability.
                        </Text>
                    )}
                    {riskLevel === 'High' && (
                        <Text style={styles.recommendationText}>
                            Your voice patterns show indicators that may benefit
                            from professional evaluation. We recommend
                            discussing these findings with a neurologist or
                            healthcare provider.
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
    summaryCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    summaryStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
    },
    summaryText: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
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

