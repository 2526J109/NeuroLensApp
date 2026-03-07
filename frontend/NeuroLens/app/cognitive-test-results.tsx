import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Types ──────────────────────────────────────────────────────────────────────
type ContributingFactor = {
    feature: string;
    direction: 'typical' | 'atypical';
    shap_value: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const getPercentileLabel = (rank: number): string => {
    if (rank <= 25) return 'Lower than most';
    if (rank <= 50) return 'Around average';
    if (rank <= 75) return 'Above average';
    return 'Significantly above average';
};

const getPercentileColor = (rank: number): string => {
    if (rank <= 25) return '#10B981'; // green — low risk
    if (rank <= 50) return '#3B82F6'; // blue — moderate
    if (rank <= 75) return '#F59E0B'; // amber
    return '#EF4444';                 // red — high
};

const getRecommendation = (rank: number): string => {
    if (rank <= 25)
        return 'Your cognitive patterns are consistent with healthy individuals in our reference group. Continue monitoring your health regularly.';
    if (rank <= 50)
        return 'Your results are within the typical range. Consider regular checkups and staying mentally active with puzzles and reading.';
    if (rank <= 75)
        return 'Some cognitive patterns are worth discussing with your doctor at your next visit. This is not a diagnosis.';
    return 'Your results show patterns that may benefit from a professional evaluation. We recommend speaking with your healthcare provider.';
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function CognitiveTestResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse params passed from cognitive-test.tsx
    const percentileRank = params.percentile_rank
        ? Number(params.percentile_rank as string)
        : 50;
    const factorsParam = params.contributing_factors
        ? JSON.parse(decodeURIComponent(params.contributing_factors as string)) as ContributingFactor[]
        : [];

    // Animations
    const barAnim   = useRef(new Animated.Value(0)).current;
    const fadeAnim  = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 1, duration: 400, useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(barAnim, {
                    toValue: percentileRank / 100,
                    duration: 900,
                    useNativeDriver: false,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0, duration: 500, useNativeDriver: true,
                }),
            ]),
        ]).start();
    }, []);

    const accentColor  = getPercentileColor(percentileRank);
    const lightBg      = `${accentColor}18`;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Cognitive Results',
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
                {/* ── Percentile Card ── */}
                <Animated.View
                    style={[
                        styles.scoreCard,
                        { backgroundColor: lightBg, opacity: fadeAnim },
                    ]}
                >
                    <Text style={styles.scoreLabel}>Population Comparison</Text>
                    <Text style={[styles.percentileNumber, { color: accentColor }]}>
                        {percentileRank}
                        <Text style={styles.percentileSuffix}>th</Text>
                    </Text>
                    <Text style={styles.percentileWord}>percentile</Text>

                    {/* Animated bar */}
                    <View style={styles.barTrack}>
                        <Animated.View
                            style={[
                                styles.barFill,
                                {
                                    backgroundColor: accentColor,
                                    width: barAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                        {/* Marker labels */}
                        <View style={styles.barLabels}>
                            <Text style={styles.barLabelText}>Low</Text>
                            <Text style={styles.barLabelText}>High</Text>
                        </View>
                    </View>

                    <View style={[styles.badge, { backgroundColor: accentColor }]}>
                        <Text style={styles.badgeText}>
                            {getPercentileLabel(percentileRank)}
                        </Text>
                    </View>
                </Animated.View>

                {/* ── What this means ── */}
                <Animated.View
                    style={[
                        styles.card,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Text style={styles.cardTitle}>What This Means</Text>
                    <Text style={styles.cardBody}>
                        Your cognitive score places you at the{' '}
                        <Text style={{ fontWeight: '700', color: accentColor }}>
                            {percentileRank}th percentile
                        </Text>{' '}
                        compared to {' '}
                        <Text style={{ fontWeight: '600' }}>4,267 individuals</Text>{' '}
                        in our clinical reference dataset. A lower percentile indicates
                        patterns more consistent with healthy individuals.
                    </Text>
                </Animated.View>

                {/* ── Contributing Factors (SHAP) ── */}
                {factorsParam.length > 0 && (
                    <Animated.View
                        style={[
                            styles.card,
                            {
                                transform: [{ translateY: slideAnim }],
                                opacity: fadeAnim,
                            },
                        ]}
                    >
                        <Text style={styles.cardTitle}>Key Factors</Text>
                        <Text style={styles.cardSubtitle}>
                            What influenced your score most
                        </Text>
                        {factorsParam.map((factor, index) => (
                            <View key={index} style={styles.factorRow}>
                                <View
                                    style={[
                                        styles.factorDot,
                                        {
                                            backgroundColor:
                                                factor.direction === 'typical'
                                                    ? '#10B981'
                                                    : '#F59E0B',
                                        },
                                    ]}
                                />
                                <View style={styles.factorTextWrap}>
                                    <Text style={styles.factorName}>
                                        {factor.feature}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.factorDirection,
                                            {
                                                color:
                                                    factor.direction === 'typical'
                                                        ? '#10B981'
                                                        : '#F59E0B',
                                            },
                                        ]}
                                    >
                                        {factor.direction === 'typical'
                                            ? 'Within typical range'
                                            : 'Worth monitoring'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>
                )}

                {/* ── Recommendation ── */}
                <Animated.View
                    style={[
                        styles.card,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <Text style={styles.cardTitle}>Recommendation</Text>
                    <Text style={styles.cardBody}>
                        {getRecommendation(percentileRank)}
                    </Text>
                </Animated.View>

                {/* ── Disclaimer ── */}
                <View style={styles.disclaimerCard}>
                    <Text style={styles.disclaimerTitle}>⚠ Important Notice</Text>
                    <Text style={styles.disclaimerText}>
                        This screening tool detects patterns associated with
                        neurological risk. It does{' '}
                        <Text style={{ fontWeight: '700' }}>not</Text> diagnose
                        any medical condition. Always consult a qualified
                        healthcare professional for medical advice.
                    </Text>
                </View>

                {/* ── Action Button ── */}
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

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        padding: 24,
    },

    // Score card
    scoreCard: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 20,
    },
    scoreLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    percentileNumber: {
        fontSize: 80,
        fontWeight: 'bold',
        lineHeight: 88,
    },
    percentileSuffix: {
        fontSize: 36,
        fontWeight: '600',
    },
    percentileWord: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 24,
    },

    // Animated bar
    barTrack: {
        width: '100%',
        height: 10,
        backgroundColor: '#E2E8F0',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 8,
    },
    barFill: {
        height: '100%',
        borderRadius: 5,
    },
    barLabels: {
        position: 'absolute',
        top: 14,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    barLabelText: {
        fontSize: 11,
        color: '#94A3B8',
    },
    badge: {
        marginTop: 28,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },

    // Generic card
    card: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#94A3B8',
        marginBottom: 14,
    },
    cardBody: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
    },

    // Factor rows
    factorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    factorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 14,
    },
    factorTextWrap: {
        flex: 1,
    },
    factorName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    factorDirection: {
        fontSize: 12,
        marginTop: 2,
    },

    // Disclaimer
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
        fontSize: 13,
        color: '#92400E',
        lineHeight: 20,
    },

    // Home button
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