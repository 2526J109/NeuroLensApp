import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyzeDrawingPrediction } from '../services/drawingPredictionService';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    PixelRatio,
    Modal,
    Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RotateCcw, ChevronDown, Check } from 'lucide-react-native';

const MODELS = [
    { label: 'NormQuadStream (NB22)', value: 'normquadstream', endpoint: '/api/drawing-prediction/analyze-normquadstream' },
    { label: 'Standard Analysis', value: 'standard', endpoint: '/api/drawing-prediction/analyze' },
    { label: 'Local Analysis', value: 'local', endpoint: '/api/drawing-prediction/analyze-local' },
] as const;
import { useLanguage } from '@/contexts/LanguageContext';
import { DrawingCanvas, DrawingPoint } from '@/components/DrawingCanvas';
import { SpiralGuide } from '@/components/SpiralGuide';
import { WaveGuide } from '@/components/WaveGuide';
import { formatDrawingData, DrawingDataJSON } from '@/utils/dataExport';
import { useAssessment } from '@/contexts/AssessmentContext';

const CANVAS_SIZE = Math.min(Dimensions.get('window').width - 80, 350);
const WAVE_WIDTH = CANVAS_SIZE;
const WAVE_HEIGHT = 220;

type TestType = 'spiral' | 'wave';

export default function DrawingTestScreen() {
    const { user, userProfile } = useAuth();
    const { t } = useLanguage();
    const { sessionId, markTaskComplete } = useAssessment();
    const router = useRouter();
    const [currentTest, setCurrentTest] = useState<TestType>('spiral');
    const [drawingData, setDrawingData] = useState<DrawingPoint[]>([]);
    const [canvasKey, setCanvasKey] = useState(0);
    const [completedTests, setCompletedTests] = useState<TestType[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedModel, setSelectedModel] = useState<typeof MODELS[number]>(MODELS[0]);
    const [modelPickerOpen, setModelPickerOpen] = useState(false);

    // Store JSON data for both tests
    const [spiralDataJSON, setSpiralDataJSON] = useState<DrawingDataJSON | null>(null);
    const [waveDataJSON, setWaveDataJSON] = useState<DrawingDataJSON | null>(null);

    const handleDrawingUpdate = (points: DrawingPoint[]) => {
        setDrawingData(points);
    };

    const handleDrawingComplete = (points: DrawingPoint[]) => {
        console.log(`${currentTest.toUpperCase()} drawing completed!`);
        console.log('Total points:', points.length);
        console.log('X coordinates:', points.map(p => p.x));
        console.log('Y coordinates:', points.map(p => p.y));
        console.log('Timestamps (ms):', points.map(p => p.timestamp));
    };

    const handleClear = () => {
        setDrawingData([]);
        setCanvasKey(prev => prev + 1);
    };

    const handleSave = () => {
        if (drawingData.length === 0) {
            console.log('No drawing data to save');
            return;
        }

        // Create JSON object for current test
        const jsonData = formatDrawingData(currentTest, drawingData);

        // Store JSON based on test type
        if (currentTest === 'spiral') {
            setSpiralDataJSON(jsonData);
            console.log('=== SPIRAL DATA JSON ===');
            console.log(JSON.stringify(jsonData, null, 2));
            console.log('========================');
        } else {
            setWaveDataJSON(jsonData);
            console.log('=== WAVE DATA JSON ===');
            console.log(JSON.stringify(jsonData, null, 2));
            console.log('======================');
        }

        // Mark current test as completed
        setCompletedTests(prev => [...prev, currentTest]);

        // Automatically move to next test
        if (currentTest === 'spiral') {
            setCurrentTest('wave');
            handleClear();
        } else {
            // Both tests completed - send data to backend for prediction
            console.log('All drawing tests completed!')
            console.log('\n=== ALL TEST DATA ===');
            if (spiralDataJSON) {
                console.log('Spiral Data:', JSON.stringify(spiralDataJSON, null, 2));
            }
            if (jsonData) {
                console.log('Wave Data:', JSON.stringify(jsonData, null, 2));
            }
            console.log('=====================');

            // Get Firebase token
            const sendPrediction = async () => {
                setIsSubmitting(true);
                try {
                    const firebaseToken = user ? await user.getIdToken() : undefined;
                    const userId = user?.uid || '';
                    const predictionResponse = await analyzeDrawingPrediction(
                        userId,
                        spiralDataJSON!,
                        jsonData!,
                        firebaseToken,
                        PixelRatio.get(),
                        sessionId || undefined,
                        selectedModel.endpoint
                    );

                    // Mark task as complete
                    markTaskComplete('drawing');

                    console.log('Prediction response:', predictionResponse);
                    router.push({
                        pathname: '/test-results',
                        params: {
                            spiralData: spiralDataJSON ? JSON.stringify(spiralDataJSON) : '',
                            waveData: jsonData ? JSON.stringify(jsonData) : '',
                            prediction: JSON.stringify(predictionResponse),
                            modelName: selectedModel.label,
                        }
                    });
                } catch (err) {
                    console.error('Error sending drawing prediction:', err);
                    router.push({
                        pathname: '/test-results',
                        params: {
                            spiralData: spiralDataJSON ? JSON.stringify(spiralDataJSON) : '',
                            waveData: jsonData ? JSON.stringify(jsonData) : '',
                        }
                    });
                } finally {
                    setIsSubmitting(false);
                }
            };
            sendPrediction();
        }
    };

    const isSpiral = currentTest === 'spiral';
    const canvasWidth = isSpiral ? CANVAS_SIZE : WAVE_WIDTH;
    const canvasHeight = isSpiral ? CANVAS_SIZE : WAVE_HEIGHT;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: t('drawing.title'),
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

            {/* Model picker modal */}
            <Modal visible={modelPickerOpen} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setModelPickerOpen(false)}>
                    <View style={styles.modalSheet}>
                        <Text style={styles.modalTitle}>Select Model</Text>
                        {MODELS.map(model => (
                            <TouchableOpacity
                                key={model.value}
                                style={styles.modalOption}
                                onPress={() => { setSelectedModel(model); setModelPickerOpen(false); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.modalOptionText, selectedModel.value === model.value && styles.modalOptionTextSelected]}>
                                    {model.label}
                                </Text>
                                {selectedModel.value === model.value && (
                                    <Check size={16} color="#F97316" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isDrawing}
            >
                {/* Model Selector */}
                <View style={styles.modelSelectorRow}>
                    <Text style={styles.modelSelectorLabel}>Model</Text>
                    <TouchableOpacity
                        style={styles.modelSelectorButton}
                        onPress={() => setModelPickerOpen(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.modelSelectorValue}>{selectedModel.label}</Text>
                        <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Progress Indicator */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressDots}>
                        <View style={[styles.dot, completedTests.includes('spiral') && styles.dotCompleted, currentTest === 'spiral' && styles.dotActive]}>
                            <Text style={[styles.dotText, (completedTests.includes('spiral') || currentTest === 'spiral') && styles.dotTextActive]}>1</Text>
                        </View>
                        <View style={styles.progressLine} />
                        <View style={[styles.dot, completedTests.includes('wave') && styles.dotCompleted, currentTest === 'wave' && styles.dotActive]}>
                            <Text style={[styles.dotText, (completedTests.includes('wave') || currentTest === 'wave') && styles.dotTextActive]}>2</Text>
                        </View>
                    </View>
                    <View style={styles.progressLabels}>
                        <Text style={[styles.progressLabel, currentTest === 'spiral' && styles.progressLabelActive]}>{t('drawing.spiral.title')}</Text>
                        <Text style={[styles.progressLabel, currentTest === 'wave' && styles.progressLabelActive]}>{t('drawing.wave.title')}</Text>
                    </View>
                </View>

                {/* Title and Description */}
                <View style={styles.header}>
                    <View style={styles.iconBadge}>
                        <View style={isSpiral ? styles.iconBar : styles.iconDots} />
                    </View>
                    <Text style={styles.title}>{isSpiral ? t('drawing.spiral.title') : t('drawing.wave.title')}</Text>
                    <Text style={styles.subtitle}>
                        {isSpiral ? t('drawing.spiral.description') : t('drawing.wave.description')}
                    </Text>
                </View>

                {/* Drawing Area */}
                <View style={styles.canvasContainer}>
                    <View style={[styles.canvasWrapper, { width: canvasWidth, height: canvasHeight }]}>
                        {/* Guide Pattern */}
                        {isSpiral ? (
                            <SpiralGuide size={CANVAS_SIZE} rounds={2} />
                        ) : (
                            <WaveGuide width={WAVE_WIDTH} height={WAVE_HEIGHT} waves={3} amplitude={60} />
                        )}

                        {/* Drawing Canvas */}
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
                            {isSubmitting ? t('drawing.analyzing') : (currentTest === 'spiral' ? t('drawing.nextWave') : t('drawing.complete'))}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Data Information Card */}
                {drawingData.length > 0 && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>{t('drawing.data.title')}</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('drawing.data.points')}</Text>
                            <Text style={styles.infoValue}>{drawingData.length}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('drawing.data.duration')}</Text>
                            <Text style={styles.infoValue}>
                                {((drawingData[drawingData.length - 1]?.timestamp || 0) / 1000).toFixed(2)}s
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('drawing.data.latestX')}</Text>
                            <Text style={styles.infoValue}>
                                {drawingData[drawingData.length - 1]?.x.toFixed(1)}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('drawing.data.latestY')}</Text>
                            <Text style={styles.infoValue}>
                                {drawingData[drawingData.length - 1]?.y.toFixed(1)}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
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
        alignItems: 'center',
    },
    progressContainer: {
        width: '100%',
        marginBottom: 24,
    },
    progressDots: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    dot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotActive: {
        backgroundColor: '#F97316',
    },
    dotCompleted: {
        backgroundColor: '#10B981',
    },
    dotText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
    },
    dotTextActive: {
        color: '#FFFFFF',
    },
    progressLine: {
        width: 60,
        height: 2,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 8,
    },
    progressLabels: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    progressLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    progressLabelActive: {
        color: '#F97316',
        fontWeight: '600',
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconBadge: {
        height: 6,
        marginBottom: 16,
    },
    iconBar: {
        width: 48,
        height: 6,
        backgroundColor: '#F97316',
        borderRadius: 3,
    },
    iconDots: {
        width: 48,
        height: 6,
        backgroundColor: '#14B8A6',
        borderRadius: 3,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
    },
    canvasContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 24,
    },
    canvasWrapper: {
        position: 'relative',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginBottom: 16,
    },
    clearButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    clearButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
    },
    saveButton: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#99F6E4',
        borderRadius: 12,
        paddingVertical: 14,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F766E',
    },
    infoCard: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#64748B',
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    infoNote: {
        fontSize: 12,
        color: '#94A3B8',
        fontStyle: 'italic',
        marginTop: 8,
    },

    // Model selector
    modelSelectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
    },
    modelSelectorLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    modelSelectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    modelSelectorValue: {
        fontSize: 13,
        fontWeight: '500',
        color: '#0F172A',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    modalSheet: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalOptionText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '500',
    },
    modalOptionTextSelected: {
        color: '#F97316',
        fontWeight: '600',
    },
});
