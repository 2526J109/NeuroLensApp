import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RotateCcw } from 'lucide-react-native';
import { DrawingCanvas, DrawingPoint } from '@/components/DrawingCanvas';
import { SpiralGuide } from '@/components/SpiralGuide';
import { WaveGuide } from '@/components/WaveGuide';

const CANVAS_SIZE = Math.min(Dimensions.get('window').width - 80, 350);
const WAVE_WIDTH = CANVAS_SIZE;
const WAVE_HEIGHT = 220;

type TestType = 'spiral' | 'wave';

export default function DrawingTestScreen() {
    const router = useRouter();
    const [currentTest, setCurrentTest] = useState<TestType>('spiral');
    const [drawingData, setDrawingData] = useState<DrawingPoint[]>([]);
    const [canvasKey, setCanvasKey] = useState(0);
    const [completedTests, setCompletedTests] = useState<TestType[]>([]);

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

        console.log(`=== SAVED ${currentTest.toUpperCase()} DRAWING DATA ===`);
        console.log('Total points captured:', drawingData.length);
        console.log('Duration (ms):', drawingData[drawingData.length - 1]?.timestamp || 0);
        console.log('\nX coordinates:', drawingData.map(p => p.x));
        console.log('\nY coordinates:', drawingData.map(p => p.y));
        console.log('\nTimestamps (ms):', drawingData.map(p => p.timestamp));
        console.log('==============================================');

        // Mark current test as completed
        setCompletedTests(prev => [...prev, currentTest]);

        // Automatically move to next test
        if (currentTest === 'spiral') {
            setCurrentTest('wave');
            handleClear();
        } else {
            // Both tests completed - navigate to home page
            console.log('🎉 All drawing tests completed!');
            handleClear();
            router.replace('/(tabs)');
        }
    };

    const isSpiral = currentTest === 'spiral';
    const canvasWidth = isSpiral ? CANVAS_SIZE : WAVE_WIDTH;
    const canvasHeight = isSpiral ? CANVAS_SIZE : WAVE_HEIGHT;

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Drawing Test',
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
                        <Text style={[styles.progressLabel, currentTest === 'spiral' && styles.progressLabelActive]}>Spiral</Text>
                        <Text style={[styles.progressLabel, currentTest === 'wave' && styles.progressLabelActive]}>Wave</Text>
                    </View>
                </View>

                {/* Title and Description */}
                <View style={styles.header}>
                    <View style={styles.iconBadge}>
                        <View style={isSpiral ? styles.iconBar : styles.iconDots} />
                    </View>
                    <Text style={styles.title}>{isSpiral ? 'Spiral' : 'Wave'}</Text>
                    <Text style={styles.subtitle}>
                        {isSpiral ? 'Draw a spiral starting from the center' : 'Draw a continuous wave pattern'}
                    </Text>
                </View>

                {/* Drawing Area */}
                <View style={styles.canvasContainer}>
                    <View style={[styles.canvasWrapper, { width: canvasWidth, height: canvasHeight }]}>
                        {/* Guide Pattern */}
                        {isSpiral ? (
                            <SpiralGuide size={CANVAS_SIZE} rounds={5} />
                        ) : (
                            <WaveGuide width={WAVE_WIDTH} height={WAVE_HEIGHT} waves={3} amplitude={40} />
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
                        <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.saveButtonText}>
                            {currentTest === 'spiral' ? 'Next: Wave' : 'Complete'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Data Information Card */}
                {drawingData.length > 0 && (
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>Drawing Data</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Points captured:</Text>
                            <Text style={styles.infoValue}>{drawingData.length}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Duration:</Text>
                            <Text style={styles.infoValue}>
                                {((drawingData[drawingData.length - 1]?.timestamp || 0) / 1000).toFixed(2)}s
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Latest X:</Text>
                            <Text style={styles.infoValue}>
                                {drawingData[drawingData.length - 1]?.x.toFixed(1)}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Latest Y:</Text>
                            <Text style={styles.infoValue}>
                                {drawingData[drawingData.length - 1]?.y.toFixed(1)}
                            </Text>
                        </View>
                        <Text style={styles.infoNote}>
                            Check console for full X, Y, and timestamp arrays
                        </Text>
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
});
