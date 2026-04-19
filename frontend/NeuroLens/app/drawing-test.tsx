import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    PixelRatio,
    Modal,
    FlatList,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RotateCcw, ChevronDown, Check } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { DrawingCanvas, DrawingPoint } from '@/components/DrawingCanvas';
import { SpiralGuide } from '@/components/SpiralGuide';
import { WaveGuide } from '@/components/WaveGuide';
import { formatDrawingData, DrawingDataJSON } from '@/utils/dataExport';
import { useAssessment } from '@/contexts/AssessmentContext';
import { useAuth } from '../contexts/AuthContext';
import { analyzeDrawing } from '../services/drawingPredictionService';
import {
    DRAWING_MODEL_OPTIONS,
    DrawingModelKey,
    DrawingModelOption,
} from '../constants/api';

const CANVAS_SIZE = Math.min(Dimensions.get('window').width - 80, 350);
const WAVE_WIDTH  = Math.min(Dimensions.get('window').width - 80, 300);
const WAVE_HEIGHT = 560;

type TestType = 'spiral' | 'wave';

// ── Model Selector Dropdown ────────────────────────────────────────────────────

function ModelSelector({
    selected,
    onSelect,
}: {
    selected: DrawingModelOption;
    onSelect: (opt: DrawingModelOption) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <View style={sel.wrapper}>
            <Text style={sel.label}>Analysis Model</Text>
            <TouchableOpacity
                style={sel.trigger}
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
            >
                <View style={sel.triggerLeft}>
                    <View style={[sel.badge, { backgroundColor: selected.badgeColor + '22' }]}>
                        <Text style={[sel.badgeText, { color: selected.badgeColor }]}>
                            {selected.badge}
                        </Text>
                    </View>
                    <View>
                        <Text style={sel.triggerTitle}>{selected.label}</Text>
                        <Text style={sel.triggerDesc}>{selected.description}</Text>
                    </View>
                </View>
                <ChevronDown size={18} color="#64748B" />
            </TouchableOpacity>

            <Modal
                visible={open}
                transparent
                animationType="fade"
                onRequestClose={() => setOpen(false)}
            >
                <TouchableOpacity
                    style={sel.overlay}
                    activeOpacity={1}
                    onPress={() => setOpen(false)}
                >
                    <View style={sel.sheet}>
                        <Text style={sel.sheetTitle}>Select Analysis Model</Text>
                        <FlatList
                            data={DRAWING_MODEL_OPTIONS}
                            keyExtractor={item => item.key}
                            renderItem={({ item }) => {
                                const isActive = item.key === selected.key;
                                return (
                                    <TouchableOpacity
                                        style={[sel.option, isActive && sel.optionActive]}
                                        onPress={() => { onSelect(item); setOpen(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[sel.badge, { backgroundColor: item.badgeColor + '22' }]}>
                                            <Text style={[sel.badgeText, { color: item.badgeColor }]}>
                                                {item.badge}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[sel.optionTitle, isActive && { color: '#F97316' }]}>
                                                {item.label}
                                            </Text>
                                            <Text style={sel.optionDesc}>{item.description}</Text>
                                        </View>
                                        {isActive && <Check size={16} color="#F97316" />}
                                    </TouchableOpacity>
                                );
                            }}
                            scrollEnabled={false}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

// ── Live Coordinate Panel ──────────────────────────────────────────────────────

function LiveDataPanel({ points }: { points: DrawingPoint[] }) {
    if (points.length === 0) return null;

    const last = points[points.length - 1];
    const duration = ((last?.timestamp ?? 0) / 1000).toFixed(2);
    const recent = points.slice(-8).reverse();

    return (
        <View style={live.card}>
            {/* Summary row */}
            <View style={live.summaryRow}>
                <View style={live.stat}>
                    <Text style={live.statVal}>{points.length}</Text>
                    <Text style={live.statLab}>Points</Text>
                </View>
                <View style={live.divider} />
                <View style={live.stat}>
                    <Text style={live.statVal}>{duration}s</Text>
                    <Text style={live.statLab}>Duration</Text>
                </View>
                <View style={live.divider} />
                <View style={live.stat}>
                    <Text style={live.statVal}>{last.x.toFixed(1)}</Text>
                    <Text style={live.statLab}>X (px)</Text>
                </View>
                <View style={live.divider} />
                <View style={live.stat}>
                    <Text style={live.statVal}>{last.y.toFixed(1)}</Text>
                    <Text style={live.statLab}>Y (px)</Text>
                </View>
            </View>

            {/* Coordinate table — last 8 points */}
            <View style={live.tableHeader}>
                <Text style={[live.col, live.colHead]}>#</Text>
                <Text style={[live.col, live.colHead, live.colWide]}>X</Text>
                <Text style={[live.col, live.colHead, live.colWide]}>Y</Text>
                <Text style={[live.col, live.colHead, live.colWide]}>T (ms)</Text>
            </View>
            {recent.map((p, i) => {
                const idx = points.length - i;
                const isLatest = i === 0;
                return (
                    <View key={idx} style={[live.tableRow, isLatest && live.tableRowLatest]}>
                        <Text style={[live.col, live.colIdx, isLatest && live.latestText]}>
                            {idx}
                        </Text>
                        <Text style={[live.col, live.colWide, isLatest && live.latestText]}>
                            {p.x.toFixed(1)}
                        </Text>
                        <Text style={[live.col, live.colWide, isLatest && live.latestText]}>
                            {p.y.toFixed(1)}
                        </Text>
                        <Text style={[live.col, live.colWide, isLatest && live.latestText]}>
                            {p.timestamp.toFixed(0)}
                        </Text>
                    </View>
                );
            })}
            <Text style={live.hint}>
                Showing last {Math.min(8, points.length)} of {points.length} captured points
            </Text>
        </View>
    );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function DrawingTestScreen() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { sessionId, markTaskComplete } = useAssessment();
    const router = useRouter();

    const [currentTest, setCurrentTest]         = useState<TestType>('spiral');
    const [drawingData, setDrawingData]         = useState<DrawingPoint[]>([]);
    const [canvasKey, setCanvasKey]             = useState(0);
    const [completedTests, setCompletedTests]   = useState<TestType[]>([]);
    const [isSubmitting, setIsSubmitting]       = useState(false);
    const [isDrawing, setIsDrawing]             = useState(false);
    const [spiralDataJSON, setSpiralDataJSON]   = useState<DrawingDataJSON | null>(null);
    const [selectedModel, setSelectedModel]     = useState<DrawingModelOption>(DRAWING_MODEL_OPTIONS[0]);

    const handleDrawingUpdate = (points: DrawingPoint[]) => setDrawingData(points);

    const handleDrawingComplete = (points: DrawingPoint[]) => {
        console.log(`${currentTest.toUpperCase()} done — ${points.length} points`);
    };

    const handleClear = () => {
        setDrawingData([]);
        setCanvasKey(prev => prev + 1);
    };

    const handleSave = () => {
        if (drawingData.length === 0) return;

        const jsonData = formatDrawingData(currentTest, drawingData);

        if (currentTest === 'spiral') {
            setSpiralDataJSON(jsonData);
            setCompletedTests(prev => [...prev, 'spiral']);
            setCurrentTest('wave');
            handleClear();
        } else {
            setCompletedTests(prev => [...prev, 'wave']);

            const sendPrediction = async () => {
                setIsSubmitting(true);
                try {
                    const firebaseToken = user ? await user.getIdToken() : undefined;
                    const userId = user?.uid || '';
                    const predictionResponse = await analyzeDrawing(
                        selectedModel.key as DrawingModelKey,
                        userId,
                        spiralDataJSON!,
                        jsonData!,
                        firebaseToken,
                        PixelRatio.get(),
                        sessionId || undefined,
                    );
                    markTaskComplete('drawing');
                    router.push({
                        pathname: '/test-results',
                        params: {
                            spiralData:  spiralDataJSON ? JSON.stringify(spiralDataJSON) : '',
                            waveData:    jsonData ? JSON.stringify(jsonData) : '',
                            prediction:  JSON.stringify(predictionResponse),
                            modelLabel:  selectedModel.label,
                        },
                    });
                } catch (err) {
                    console.error('[Drawing] Prediction error:', err);
                    router.push({
                        pathname: '/test-results',
                        params: {
                            spiralData: spiralDataJSON ? JSON.stringify(spiralDataJSON) : '',
                            waveData:   jsonData ? JSON.stringify(jsonData) : '',
                            modelLabel: selectedModel.label,
                        },
                    });
                } finally {
                    setIsSubmitting(false);
                }
            };
            sendPrediction();
        }
    };

    const isSpiral    = currentTest === 'spiral';
    const canvasWidth = isSpiral ? CANVAS_SIZE : WAVE_WIDTH;
    const canvasHeight = isSpiral ? CANVAS_SIZE : WAVE_HEIGHT;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: t('drawing.title'),
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#FFFFFF' },
                    headerTitleStyle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
                    headerTintColor: '#0F172A',
                }}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isDrawing}
            >
                {/* Model Selector */}
                <ModelSelector selected={selectedModel} onSelect={setSelectedModel} />

                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressDots}>
                        <View style={[
                            styles.dot,
                            completedTests.includes('spiral') && styles.dotCompleted,
                            currentTest === 'spiral' && styles.dotActive,
                        ]}>
                            <Text style={[
                                styles.dotText,
                                (completedTests.includes('spiral') || currentTest === 'spiral') && styles.dotTextActive,
                            ]}>1</Text>
                        </View>
                        <View style={styles.progressLine} />
                        <View style={[
                            styles.dot,
                            completedTests.includes('wave') && styles.dotCompleted,
                            currentTest === 'wave' && styles.dotActive,
                        ]}>
                            <Text style={[
                                styles.dotText,
                                (completedTests.includes('wave') || currentTest === 'wave') && styles.dotTextActive,
                            ]}>2</Text>
                        </View>
                    </View>
                    <View style={styles.progressLabels}>
                        <Text style={[styles.progressLabel, currentTest === 'spiral' && styles.progressLabelActive]}>
                            {t('drawing.spiral.title')}
                        </Text>
                        <Text style={[styles.progressLabel, currentTest === 'wave' && styles.progressLabelActive]}>
                            {t('drawing.wave.title')}
                        </Text>
                    </View>
                </View>

                {/* Title and Description */}
                <View style={styles.header}>
                    <View style={styles.iconBadge}>
                        <View style={isSpiral ? styles.iconBar : styles.iconDots} />
                    </View>
                    <Text style={styles.title}>
                        {isSpiral ? t('drawing.spiral.title') : t('drawing.wave.title')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isSpiral ? t('drawing.spiral.description') : t('drawing.wave.description')}
                    </Text>
                </View>

                {/* Drawing Area */}
                <View style={styles.canvasContainer}>
                    <View style={[styles.canvasWrapper, { width: canvasWidth, height: canvasHeight }]}>
                        {isSpiral ? (
                            <SpiralGuide size={CANVAS_SIZE} rounds={2} />
                        ) : (
                            <WaveGuide width={WAVE_WIDTH} height={WAVE_HEIGHT} waves={2} amplitude={100} />
                        )}
                        <DrawingCanvas
                            key={canvasKey}
                            width={canvasWidth}
                            height={canvasHeight}
                            strokeColor="#F97316"
                            strokeWidth={3}
                            onDrawingUpdate={handleDrawingUpdate}
                            onDrawingComplete={handleDrawingComplete}
                            onDrawingStart={() => setIsDrawing(true)}
                            onDrawingEnd={() => setIsDrawing(false)}
                        />
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={handleClear}
                        activeOpacity={0.7}
                    >
                        <RotateCcw size={20} color="#64748B" />
                        <Text style={styles.clearButtonText}>{t('drawing.clear')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.saveButton, isSubmitting && { opacity: 0.6 }]}
                        onPress={handleSave}
                        activeOpacity={0.8}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.saveButtonText}>
                            {isSubmitting
                                ? t('drawing.analyzing')
                                : currentTest === 'spiral'
                                    ? t('drawing.nextWave')
                                    : t('drawing.complete')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Live Coordinate Panel */}
                <LiveDataPanel points={drawingData} />

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent:   { padding: 24, alignItems: 'center' },
    progressContainer: { width: '100%', marginBottom: 24 },
    progressDots:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    dot:             { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    dotActive:       { backgroundColor: '#F97316' },
    dotCompleted:    { backgroundColor: '#10B981' },
    dotText:         { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
    dotTextActive:   { color: '#FFFFFF' },
    progressLine:    { width: 60, height: 2, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
    progressLabels:  { flexDirection: 'row', justifyContent: 'space-around' },
    progressLabel:   { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
    progressLabelActive: { color: '#F97316', fontWeight: '600' },
    header:          { alignItems: 'center', marginBottom: 24 },
    iconBadge:       { height: 6, marginBottom: 16 },
    iconBar:         { width: 48, height: 6, backgroundColor: '#F97316', borderRadius: 3 },
    iconDots:        { width: 48, height: 6, backgroundColor: '#14B8A6', borderRadius: 3 },
    title:           { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
    subtitle:        { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
    canvasContainer: { width: '100%', alignItems: 'center', marginBottom: 24 },
    canvasWrapper:   { position: 'relative', backgroundColor: '#F8FAFC', borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    buttonContainer: { flexDirection: 'row', width: '100%', gap: 12, marginBottom: 16 },
    clearButton:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 14, gap: 8 },
    clearButtonText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
    saveButton:      { flex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#99F6E4', borderRadius: 12, paddingVertical: 14 },
    saveButtonText:  { fontSize: 16, fontWeight: '600', color: '#0F766E' },
});

// ── Selector styles ────────────────────────────────────────────────────────────

const sel = StyleSheet.create({
    wrapper:     { width: '100%', marginBottom: 20 },
    label:       { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    trigger:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    triggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    triggerTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    triggerDesc: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
    badge:       { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    badgeText:   { fontSize: 10, fontWeight: '700' },
    overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet:       { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
    sheetTitle:  { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
    option:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    optionActive: { backgroundColor: '#FFF7ED' },
    optionTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    optionDesc:  { fontSize: 12, color: '#94A3B8', marginTop: 2 },
});

// ── Live data panel styles ────────────────────────────────────────────────────

const live = StyleSheet.create({
    card:        { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16 },
    summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    stat:        { flex: 1, alignItems: 'center' },
    statVal:     { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    statLab:     { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    divider:     { width: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
    colHead:     { color: '#94A3B8', fontWeight: '700' },
    tableHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', marginBottom: 4 },
    tableRow:    { flexDirection: 'row', paddingVertical: 4 },
    tableRowLatest: { backgroundColor: '#FFF7ED', borderRadius: 6, paddingHorizontal: 4 },
    col:         { fontSize: 12, color: '#475569', fontFamily: 'monospace' },
    colIdx:      { width: 32, color: '#94A3B8' },
    colWide:     { flex: 1 },
    latestText:  { color: '#F97316', fontWeight: '600' },
    hint:        { fontSize: 11, color: '#CBD5E1', marginTop: 8, textAlign: 'center' },
});
