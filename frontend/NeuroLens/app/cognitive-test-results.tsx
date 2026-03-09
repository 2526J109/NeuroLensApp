import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';

const W = Dimensions.get('window').width;

// ── Types ──────────────────────────────────────────────────────────────────────
type ContributingFactor = {
    feature: string;
    direction: 'typical' | 'atypical';
    shap_value: number;
};

// ── Percentile buckets — 5 discrete blocks ─────────────────────────────────────
// p10=lowest risk, p90=highest risk
// percentile_rank from backend: lower = healthier
const BUCKETS = [
    { label: 'Great',  max: 10,  color: '#10B981', lightBg: '#ECFDF5' },
    { label: 'Good',   max: 25,  color: '#34D399', lightBg: '#F0FDF9' },
    { label: 'Mod',    max: 50,  color: '#F59E0B', lightBg: '#FFFBEB' },
    { label: 'Watch',  max: 75,  color: '#F97316', lightBg: '#FFF7ED' },
    { label: 'High',   max: 100, color: '#EF4444', lightBg: '#FEF2F2' },
];

// Risk probability thresholds
const getRiskLabel = (prob: number): { label: string; color: string; bg: string } => {
    if (prob < 0.40) return { label: 'LOW',      color: '#059669', bg: '#ECFDF5' };
    if (prob < 0.70) return { label: 'WATCH',    color: '#D97706', bg: '#FFFBEB' };
    return              { label: 'ELEVATED', color: '#DC2626', bg: '#FEF2F2' };
};

const getBucketIndex = (rank: number): number => {
    if (rank <= 10) return 0;
    if (rank <= 25) return 1;
    if (rank <= 50) return 2;
    if (rank <= 75) return 3;
    return 4;
};

const getInterpretation = (rank: number): string => {
    if (rank <= 25)
        return 'Your score places you at the ' + rank + 'th percentile against a baseline of over 4,000 adults. In this test, a lower percentile means your results are consistent with typical, healthy brain activity.';
    if (rank <= 50)
        return 'Your score places you at the ' + rank + 'th percentile against a baseline of over 4,000 adults. Some patterns are slightly outside the typical range — this can be influenced by temporary factors like fatigue or stress.';
    if (rank <= 75)
        return 'Your score places you at the ' + rank + 'th percentile against a baseline of over 4,000 adults. A few patterns are worth keeping an eye on. Regular retesting over time gives a much clearer picture.';
    return 'Your score places you at the ' + rank + 'th percentile against a baseline of over 4,000 adults. Some patterns detected here can sometimes appear in early neurological changes. We recommend speaking with a healthcare professional.';
};

const getRecommendation = (rank: number): string => {
    if (rank <= 25) return 'Your cognitive patterns look healthy. Keep mentally active with reading, puzzles, and regular sleep. Retake in 30 days to track over time.';
    if (rank <= 50) return 'Your results are within a monitoring range. Consider regular checkups and staying mentally active. Retake in 30 days for a clearer trend.';
    if (rank <= 75) return 'Your results suggest some patterns worth monitoring. Staying physically active and mentally engaged can help. Consider speaking with your doctor.';
    return 'We recommend speaking with a qualified healthcare provider to discuss your results. This screening is a starting point, not a diagnosis.';
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function CognitiveTestResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { t } = useLanguage();

    const percentileRank = params.percentile_rank
        ? Number(params.percentile_rank as string)
        : 50;

    // risk_probability is passed as 0–1 float from backend
    const riskProbability = params.risk_probability
        ? Number(params.risk_probability as string)
        : percentileRank / 100;

    const factorsParam = params.contributing_factors
        ? JSON.parse(decodeURIComponent(params.contributing_factors as string)) as ContributingFactor[]
        : [];

    const bucketIdx   = getBucketIndex(percentileRank);
    const activeBucket = BUCKETS[bucketIdx];
    const riskInfo    = getRiskLabel(riskProbability);
    const riskPct     = Math.round(riskProbability * 100);

    // Animations
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <SafeAreaView style={styles.safe} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Cognitive Results',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F8FAFC' },
                    headerTitleStyle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
                    headerTintColor: '#0F172A',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >

                {/* ── 1. RISK SCORE CARD (top, standalone) ── */}
                <Animated.View
                    style={[
                        styles.riskCard,
                        { backgroundColor: riskInfo.bg, opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                    ]}
                >
                    <Text style={styles.riskCardLabel}>RISK SCORE</Text>

                    <View style={styles.riskRow}>
                        <Text style={[styles.riskPct, { color: riskInfo.color }]}>
                            {riskPct}
                            <Text style={styles.riskPctSymbol}>%</Text>
                        </Text>
                        <View style={[styles.riskBadge, { backgroundColor: riskInfo.color }]}>
                            <Text style={styles.riskBadgeText}>{riskInfo.label}</Text>
                        </View>
                    </View>

                    {/* Mini probability bar */}
                    <View style={styles.probBarTrack}>
                        <View style={[styles.probBarFill, {
                            width: `${riskPct}%` as any,
                            backgroundColor: riskInfo.color,
                        }]} />
                        {/* Zone markers */}
                        <View style={[styles.probMarker, { left: '40%' }]} />
                        <View style={[styles.probMarker, { left: '70%' }]} />
                    </View>
                    <View style={styles.probBarLabels}>
                        <Text style={styles.probBarLabelText}>Low</Text>
                        <Text style={styles.probBarLabelText}>Watch</Text>
                        <Text style={styles.probBarLabelText}>Elevated</Text>
                    </View>
                </Animated.View>

                {/* ── 2. WHERE YOU STAND — 5 discrete blocks ── */}
                <Animated.View
                    style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                >
                    <Text style={styles.cardLabel}>WHERE YOU STAND</Text>

                    {/* 5 segment blocks */}
                    <View style={styles.blocksRow}>
                        {BUCKETS.map((b, i) => {
                            const isActive = i === bucketIdx;
                            const isPast   = i < bucketIdx;
                            return (
                                <View key={b.label} style={styles.blockWrapper}>
                                    <View style={[
                                        styles.block,
                                        {
                                            backgroundColor: isActive || isPast ? b.color : '#E2E8F0',
                                            // Active block is taller
                                            height: isActive ? 20 : 14,
                                            // Rounded ends
                                            borderTopLeftRadius:  i === 0 ? 8 : 3,
                                            borderBottomLeftRadius: i === 0 ? 8 : 3,
                                            borderTopRightRadius:  i === 4 ? 8 : 3,
                                            borderBottomRightRadius: i === 4 ? 8 : 3,
                                            opacity: isPast ? 0.45 : 1,
                                        },
                                    ]} />
                                    {/* "You" marker on active block */}
                                    {isActive && (
                                        <View style={styles.youMarkerWrap}>
                                            <View style={[styles.youDot, { backgroundColor: b.color }]} />
                                            <Text style={[styles.youLabel, { color: b.color }]}>You</Text>
                                        </View>
                                    )}
                                    <Text style={[
                                        styles.blockLabel,
                                        { color: isActive ? b.color : '#94A3B8', fontWeight: isActive ? '700' : '500' },
                                    ]}>
                                        {b.label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Percentile tick labels */}
                    <View style={styles.tickRow}>
                        <Text style={styles.tickText}>10%</Text>
                        <Text style={styles.tickText}>25%</Text>
                        <Text style={styles.tickText}>50%</Text>
                        <Text style={styles.tickText}>75%</Text>
                        <Text style={styles.tickText}>90%</Text>
                    </View>

                    {/* Flipped framing — friendly summary */}
                    {percentileRank <= 50 ? (
                        <View style={[styles.summaryPill, { backgroundColor: activeBucket.lightBg }]}>
                            <Text style={[styles.summaryText, { color: activeBucket.color }]}>
                                Your results are healthier than {100 - percentileRank}% of people assessed
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.summaryPill, { backgroundColor: activeBucket.lightBg }]}>
                            <Text style={[styles.summaryText, { color: activeBucket.color }]}>
                                You are in the {activeBucket.label.toLowerCase()} monitoring range
                            </Text>
                        </View>
                    )}
                </Animated.View>

                {/* ── 3. WHAT THIS MEANS ── */}
                <Animated.View
                    style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                >
                    <Text style={styles.cardTitle}>What This Means</Text>
                    <Text style={styles.cardBody}>{getInterpretation(percentileRank)}</Text>
                </Animated.View>

                {/* ── 4. KEY FACTORS (SHAP) ── */}
                {factorsParam.length > 0 && (
                    <Animated.View
                        style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                    >
                        <Text style={styles.cardTitle}>Key Factors</Text>
                        <Text style={styles.cardSubtitle}>What influenced your score most</Text>
                        {factorsParam.map((factor, index) => (
                            <View key={index} style={[
                                styles.factorRow,
                                { borderBottomWidth: index < factorsParam.length - 1 ? 1 : 0 },
                            ]}>
                                <View style={[styles.factorDot, {
                                    backgroundColor: factor.direction === 'typical' ? '#10B981' : '#F59E0B',
                                }]} />
                                <View style={styles.factorTextWrap}>
                                    <Text style={styles.factorName}>{factor.feature}</Text>
                                    <Text style={[styles.factorDirection, {
                                        color: factor.direction === 'typical' ? '#10B981' : '#F59E0B',
                                    }]}>
                                        {factor.direction === 'typical' ? 'Within typical range' : 'Worth monitoring'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>
                )}

                {/* ── 5. RECOMMENDATION ── */}
                <Animated.View
                    style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                >
                    <Text style={styles.cardTitle}>Recommendation</Text>
                    <Text style={styles.cardBody}>{getRecommendation(percentileRank)}</Text>
                </Animated.View>

                {/* ── 6. DISCLAIMER ── */}
                <View style={styles.disclaimerCard}>
                    <Text style={styles.disclaimerTitle}>⚠ Important Notice</Text>
                    <Text style={styles.disclaimerBody}>
                        This screening tool detects patterns associated with neurological risk. It does{' '}
                        <Text style={{ fontWeight: '700' }}>not</Text> diagnose any medical condition.
                        Always consult a qualified healthcare professional for medical advice.
                    </Text>
                </View>

                {/* ── Button ── */}
                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => router.replace('/(tabs)')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.homeBtnText}>Back to Home</Text>
                </TouchableOpacity>

                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    scroll: { paddingHorizontal: 20, paddingTop: 20 },

    // ── Risk card ──
    riskCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 14,
    },
    riskCardLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        marginBottom: 12,
        textAlign: 'center',
    },
    riskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        marginBottom: 20,
    },
    riskPct: {
        fontSize: 64,
        fontWeight: '800',
        lineHeight: 70,
        letterSpacing: -2,
    },
    riskPctSymbol: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 0,
    },
    riskBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 50,
    },
    riskBadgeText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 1.2,
    },

    // Probability bar
    probBarTrack: {
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 6,
    },
    probBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    probMarker: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: '#FFFFFF',
    },
    probBarLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
    },
    probBarLabelText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
    },

    // ── Generic card ──
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 14,
        shadowColor: '#0F172A',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    cardLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        marginBottom: 16,
        textAlign: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 12,
    },
    cardBody: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    },

    // ── 5 blocks ──
    blocksRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 5,
        marginBottom: 4,
        paddingTop: 28, // space for "You" marker above
    },
    blockWrapper: {
        flex: 1,
        alignItems: 'center',
        position: 'relative',
    },
    block: {
        width: '100%',
    },
    youMarkerWrap: {
        position: 'absolute',
        top: -26,
        alignItems: 'center',
        gap: 2,
    },
    youDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    youLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    blockLabel: {
        fontSize: 10,
        marginTop: 6,
        textAlign: 'center',
    },
    tickRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 2,
        marginBottom: 14,
        paddingHorizontal: 2,
    },
    tickText: {
        fontSize: 9,
        color: '#CBD5E1',
        textAlign: 'center',
        flex: 1,
    },
    summaryPill: {
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center',
    },
    summaryText: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 18,
    },

    // ── Factors ──
    factorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 11,
        borderBottomColor: '#F1F5F9',
    },
    factorDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        marginRight: 12,
    },
    factorTextWrap: { flex: 1 },
    factorName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    factorDirection: { fontSize: 12, marginTop: 2 },

    // ── Disclaimer ──
    disclaimerCard: {
        backgroundColor: '#FFFBEB',
        borderLeftWidth: 3,
        borderLeftColor: '#F59E0B',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
    },
    disclaimerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#92400E',
        marginBottom: 6,
    },
    disclaimerBody: {
        fontSize: 12,
        color: '#92400E',
        lineHeight: 18,
    },

    // ── Button ──
    homeBtn: {
        backgroundColor: '#0F172A',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    homeBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});