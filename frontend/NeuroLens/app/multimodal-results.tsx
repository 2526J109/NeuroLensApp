import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAssessment } from '@/contexts/AssessmentContext';
import api from '@/services/api';
import { AlertCircle, CheckCircle2, ChevronRight, RefreshCcw, Clock } from 'lucide-react-native';

interface AggregatedResult {
    session_id: string;
    final_score: number;
    individual_scores: {
        wearable?: number;
        voice?: number;
        drawing?: number;
        cognitive?: number;
    };
    remaining_tasks: number;
    missing_modalities: string[];
    timestamp: string;
}

export default function MultimodalResultsScreen() {
    const { t } = useLanguage();
    const router = useRouter();
    const { sessionId, resetSession } = useAssessment();
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<AggregatedResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            setError(null);

            try {
                if (sessionId) {
                    try {
                        const response = await api.post(`/api/multimodal/result/${sessionId}`);
                        setResult(response.data);
                        setLoading(false);
                        return;
                    } catch (err) {
                        console.warn('Session specific fetch failed, trying latest fallback...');
                    }
                }

                // Fallback to latest
                const fallbackResponse = await api.get('/api/multimodal/latest');
                setResult(fallbackResponse.data);
            } catch (err: any) {
                console.error('Error fetching multimodal results:', err);
                setError(err.message || 'Failed to fetch results');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [sessionId]);

    const getRiskLevel = (score: number) => {
        if (score < 30) return { label: t('resultsTab.riskLevel.low'), color: '#10B981', bg: '#D1FAE5' };
        if (score < 70) return { label: t('resultsTab.riskLevel.medium'), color: '#F59E0B', bg: '#FEF3C7' };
        return { label: t('resultsTab.riskLevel.high'), color: '#EF4444', bg: '#FEE2E2' };
    };

    const handleReset = () => {
        resetSession();
        router.replace('/(tabs)');
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#14B8A6" />
                <Text style={styles.loadingText}>{t('resultsTab.multimodal.loading')}</Text>
            </SafeAreaView>
        );
    }

    if (error || !result) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <AlertCircle size={48} color="#EF4444" />
                <Text style={styles.errorText}>{t('resultsTab.multimodal.error')}</Text>
                <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/(tabs)')}>
                    <Text style={styles.homeButtonText}>{t('results.backToHome')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const overallRisk = getRiskLevel(result.final_score);

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: t('resultsTab.multimodal.header'),
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#FFFFFF' },
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Overall Score Card */}
                <View style={[styles.scoreCard, { backgroundColor: overallRisk.bg }]}>
                    <Text style={styles.scoreLabel}>{t('resultsTab.multimodal.overallScore')}</Text>
                    <Text style={[styles.scorePercentage, { color: overallRisk.color }]}>
                        {Math.round(result.final_score)}%
                    </Text>
                    <View style={[styles.riskBadge, { backgroundColor: overallRisk.color }]}>
                        <Text style={styles.riskBadgeText}>{overallRisk.label}</Text>
                    </View>
                </View>

                {/* Partial Result Notice */}
                {result.remaining_tasks > 0 && (
                    <View style={styles.pendingCard}>
                        <Clock size={20} color="#0F766E" />
                        <Text style={styles.pendingText}>
                            {result.remaining_tasks === 1
                                ? "1 task is remain."
                                : `${result.remaining_tasks} tasks remain.`}
                        </Text>
                    </View>
                )}

                <Text style={styles.summaryText}>{t('resultsTab.multimodal.summary')}</Text>

                {/* Breakdown Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('resultsTab.multimodal.breakdown')}</Text>
                </View>

                <View style={styles.breakdownContainer}>
                    {['wearable', 'voice', 'drawing', 'cognitive'].map((key) => {
                        const score = result.individual_scores?.[key as keyof typeof result.individual_scores] ?? 0;
                        const isPending = result.missing_modalities?.includes(key);
                        const risk = getRiskLevel(score);

                        return (
                            <View key={key} style={styles.breakdownItem}>
                                <View style={styles.breakdownInfo}>
                                    <View>
                                        <Text style={styles.breakdownLabel}>
                                            {t(`history.categories.${key === 'cognitive' ? 'brain' : key}`)}
                                        </Text>
                                        <Text style={[styles.breakdownRiskLabel, { color: isPending ? '#94A3B8' : risk.color }]}>
                                            {isPending ? 'Pending' : risk.label}
                                        </Text>
                                    </View>
                                    <Text style={[styles.breakdownValue, isPending && { color: '#94A3B8' }]}>
                                        {isPending ? '--' : `${Math.round(score)}%`}
                                    </Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    {!isPending && (
                                        <View
                                            style={[
                                                styles.progressBarFill,
                                                { width: `${score}%`, backgroundColor: risk.color }
                                            ]}
                                        />
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimerCard}>
                    <Text style={styles.disclaimerText}>{t('resultsTab.disclaimerFull')}</Text>
                </View>

                {/* Reset Button */}
                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                    <RefreshCcw size={20} color="#0F766E" />
                    <Text style={styles.resetButtonText}>{t('resultsTab.multimodal.startNew')}</Text>
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    scrollContent: {
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
    },
    errorText: {
        marginTop: 16,
        marginBottom: 24,
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
    },
    scoreCard: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 16,
    },
    scoreLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    scorePercentage: {
        fontSize: 64,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    riskBadge: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    riskBadgeText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        paddingHorizontal: 10,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    breakdownContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
    },
    breakdownItem: {
        marginBottom: 16,
    },
    breakdownInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    breakdownLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    breakdownRiskLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    disclaimerCard: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    disclaimerText: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    resetButton: {
        flexDirection: 'row',
        backgroundColor: '#99F6E4',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F766E',
    },
    pendingCard: {
        flexDirection: 'row',
        backgroundColor: '#CCFBF1',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    pendingText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F766E',
    },
    homeButton: {
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    homeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
    },
});
