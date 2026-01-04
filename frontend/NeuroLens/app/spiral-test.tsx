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

const CANVAS_SIZE = Math.min(Dimensions.get('window').width - 80, 350);

export default function SpiralTestScreen() {
    const router = useRouter();
    const [drawingData, setDrawingData] = useState<DrawingPoint[]>([]);
    const [patternsCompleted, setPatternsCompleted] = useState(0);
    const [canvasKey, setCanvasKey] = useState(0);

    const handleDrawingUpdate = (points: DrawingPoint[]) => {
        setDrawingData(points);
    };

    const handleDrawingComplete = (points: DrawingPoint[]) => {
        console.log('Spiral drawing completed!');
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

        console.log('=== SAVED SPIRAL DRAWING DATA ===');
        console.log('Total points captured:', drawingData.length);
        console.log('Duration (ms):', drawingData[drawingData.length - 1]?.timestamp || 0);
        console.log('\nX coordinates:', drawingData.map(p => p.x));
        console.log('\nY coordinates:', drawingData.map(p => p.y));
        console.log('\nTimestamps (ms):', drawingData.map(p => p.timestamp));
        console.log('==================================');

        setPatternsCompleted(prev => Math.min(prev + 1, 3));
        handleClear();
    };

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
                {/* Title and Description */}
                <View style={styles.header}>
                    <View style={styles.iconBadge}>
                        <View style={styles.iconBar} />
                    </View>
                    <Text style={styles.title}>Spiral</Text>
                    <Text style={styles.subtitle}>Draw a spiral starting from the center</Text>
                </View>

                {/* Drawing Area */}
                <View style={styles.canvasContainer}>
                    <View style={styles.canvasWrapper}>
                        {/* Spiral Guide - positioned absolutely */}
                        <SpiralGuide size={CANVAS_SIZE} rounds={2} />
                        
                        {/* Drawing Canvas - positioned absolutely on top */}
                        <DrawingCanvas
                            key={canvasKey}
                            size={CANVAS_SIZE}
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
                        <Text style={styles.saveButtonText}>Save Drawing</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress */}
                <Text style={styles.progressText}>
                    Patterns completed
                    <Text style={styles.progressCount}> {patternsCompleted}/3</Text>
                </Text>

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
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconBadge: {
        width: 48,
        height: 6,
        backgroundColor: '#F97316',
        borderRadius: 3,
        marginBottom: 16,
    },
    iconBar: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F97316',
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
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
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
    progressText: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 24,
    },
    progressCount: {
        fontWeight: '600',
        color: '#0F172A',
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
