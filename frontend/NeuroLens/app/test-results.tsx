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
import { PenTool, ShieldCheck, AlertTriangle, AlertCircle, ChevronRight } from 'lucide-react-native';

interface ModelPrediction {
    risk_percentage: number;
    risk_level: 'Low' | 'Moderate' | 'High';
    label: string;
    confidence: number;
    message?: string;
}

interface PredictionParam {
    prediction?: ModelPrediction;
    save_result?: unknown;
}

const RISK = {
    Low:      { color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', Icon: ShieldCheck },
    Moderate: { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', Icon: AlertTriangle },
    High:     { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', Icon: AlertCircle },
} as const;

const TIPS: Record<string, string[]> = {
    Low:      ['Continue regular health monitoring', 'Maintain an active and balanced lifestyle', 'Schedule annual neurological check-ups'],
    Moderate: ['Consider scheduling a neurologist visit', 'Track any new or worsening symptoms', 'Repeat this assessment in 4–6 weeks'],
    High:     ['Consult a neurologist as soon as possible', 'Bring a detailed symptom history', 'Do not rely on this AI assessment alone'],
};

export default function TestResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    let prediction: ModelPrediction | null = null;
    if (params.prediction) {
        try {
            const parsed: PredictionParam = JSON.parse(params.prediction as string);
            prediction = parsed?.prediction ?? (parsed as unknown as ModelPrediction);
        } catch {
            prediction = null;
        }
    }

    const riskLevel  = (prediction?.risk_level  ?? 'Low') as keyof typeof RISK;
    const riskPct    = prediction?.risk_percentage ?? 0;
    const confidence = prediction?.confidence ?? 0;
    const label      = prediction?.label ?? 'No prediction available';

    const { color, bg, border, Icon } = RISK[riskLevel];
    const tips = TIPS[riskLevel];

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Test Results',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F8FAFC' },
                    headerTitleStyle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
                    headerTintColor: '#0F172A',
                }}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Result hero card */}
                <View style={styles.heroCard}>
                    <View style={[styles.iconWrap, { backgroundColor: '#F97316' }]}>
                        <PenTool color="#FFFFFF" size={24} />
                    </View>
                    <Text style={styles.heroTitle}>Drawing Analysis</Text>
                    <Text style={[styles.heroScore, { color }]}>{riskPct.toFixed(1)}%</Text>
                    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
                        <Icon color={color} size={14} />
                        <Text style={[styles.badgeText, { color }]}>{riskLevel} Risk — {label}</Text>
                    </View>
                </View>

                {/* Scores */}
                {prediction && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Score Details</Text>

                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreRowLabel}>Risk Score</Text>
                            <View style={styles.barTrack}>
                                <View style={[styles.barFill, { width: `${Math.min(riskPct, 100)}%` as any, backgroundColor: color }]} />
                            </View>
                            <Text style={[styles.scoreRowValue, { color }]}>{riskPct.toFixed(1)}%</Text>
                        </View>

                        <View style={styles.scoreRow}>
                            <Text style={styles.scoreRowLabel}>Confidence</Text>
                            <View style={styles.barTrack}>
                                <View style={[styles.barFill, { width: `${Math.min(confidence, 100)}%` as any, backgroundColor: '#14B8A6' }]} />
                            </View>
                            <Text style={[styles.scoreRowValue, { color: '#14B8A6' }]}>{confidence.toFixed(1)}%</Text>
                        </View>
                    </View>
                )}

                {/* Recommendations */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Recommendations</Text>
                    {tips.map((tip, i) => (
                        <View key={i} style={styles.tipRow}>
                            <View style={[styles.tipDot, { backgroundColor: color }]} />
                            <Text style={styles.tipText}>{tip}</Text>
                        </View>
                    ))}
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerTitle}>Important Notice</Text>
                    <Text style={styles.disclaimerText}>
                        This AI assessment is <Text style={styles.bold}>NOT a medical diagnosis</Text>. Always consult a qualified healthcare professional for proper evaluation.
                    </Text>
                </View>

                {/* CTA */}
                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => router.replace('/(tabs)')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.homeBtnText}>Back to Home</Text>
                    <ChevronRight color="#14B8A6" size={18} />
                </TouchableOpacity>

                <View style={{ height: 24 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        padding: 20,
    },

    // Hero
    heroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    heroTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 8,
    },
    heroScore: {
        fontSize: 64,
        fontWeight: '700',
        lineHeight: 72,
        marginBottom: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Cards
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
    },

    // Score rows
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 10,
    },
    scoreRowLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
        width: 72,
    },
    barTrack: {
        flex: 1,
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
    scoreRowValue: {
        fontSize: 13,
        fontWeight: '700',
        width: 46,
        textAlign: 'right',
    },

    // Tips
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    tipDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 8,
        flexShrink: 0,
    },
    tipText: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
        flex: 1,
    },

    // Disclaimer
    disclaimer: {
        backgroundColor: '#FEF3C7',
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    disclaimerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#92400E',
        marginBottom: 4,
    },
    disclaimerText: {
        fontSize: 13,
        color: '#92400E',
        lineHeight: 20,
    },
    bold: { fontWeight: '700' },

    // Button
    homeBtn: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    homeBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
});
