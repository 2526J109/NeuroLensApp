import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface DrawingPoint {
    x: number;
    y: number;
    timestamp: number;
}

interface DrawingCanvasProps {
    size?: number;
    width?: number;
    height?: number;
    strokeColor?: string;
    strokeWidth?: number;
    onDrawingUpdate?: (points: DrawingPoint[]) => void;
    onDrawingComplete?: (points: DrawingPoint[]) => void;
}

export const DrawingCanvas = ({
    size,
    width,
    height,
    strokeColor = '#F97316',
    strokeWidth = 3,
    onDrawingUpdate,
    onDrawingComplete,
}: DrawingCanvasProps) => {
    // Support both size (square) and width/height (rectangle)
    const canvasWidth = width || size || 300;
    const canvasHeight = height || size || 300;
    const [paths, setPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState<string>('');
    const drawingPointsRef = useRef<DrawingPoint[]>([]);
    const startTimeRef = useRef<number>(0);
    const containerRef = useRef<View>(null);
    const updateCountRef = useRef<number>(0);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            
            onPanResponderGrant: (evt: GestureResponderEvent) => {
                startTimeRef.current = Date.now();
                const { locationX, locationY } = evt.nativeEvent;
                
                const newPoint: DrawingPoint = {
                    x: locationX,
                    y: locationY,
                    timestamp: 0, // First point at time 0
                };
                
                drawingPointsRef.current = [newPoint];
                setCurrentPath(`M ${locationX} ${locationY}`);
                updateCountRef.current = 0;
                
                if (onDrawingUpdate) {
                    onDrawingUpdate([newPoint]);
                }
            },
            
            onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                const { locationX, locationY } = evt.nativeEvent;
                const currentTime = Date.now() - startTimeRef.current;
                
                const newPoint: DrawingPoint = {
                    x: locationX,
                    y: locationY,
                    timestamp: currentTime,
                };
                
                // Accumulate points in ref
                drawingPointsRef.current.push(newPoint);
                
                // Update path for visual feedback
                setCurrentPath(prev => `${prev} L ${locationX} ${locationY}`);
                
                // Only update parent every 10 points to avoid too many updates
                updateCountRef.current++;
                if (updateCountRef.current % 10 === 0 && onDrawingUpdate) {
                    onDrawingUpdate([...drawingPointsRef.current]);
                }
            },
            
            onPanResponderRelease: () => {
                setPaths(prev => [...prev, currentPath]);
                setCurrentPath('');
                
                // Final update with all points
                if (onDrawingUpdate) {
                    onDrawingUpdate([...drawingPointsRef.current]);
                }
                
                if (onDrawingComplete) {
                    onDrawingComplete([...drawingPointsRef.current]);
                }
            },
        })
    ).current;

    const clearCanvas = () => {
        setPaths([]);
        setCurrentPath('');
        drawingPointsRef.current = [];
        startTimeRef.current = 0;
        updateCountRef.current = 0;
        
        if (onDrawingUpdate) {
            onDrawingUpdate([]);
        }
    };

    return (
        <View
            ref={containerRef}
            style={[styles.container, { width: canvasWidth, height: canvasHeight }]}
            {...panResponder.panHandlers}
        >
            <Svg width={canvasWidth} height={canvasHeight} style={styles.svg}>
                {paths.map((path, index) => (
                    <Path
                        key={`path-${index}`}
                        d={path}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
                {currentPath && (
                    <Path
                        d={currentPath}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
            </Svg>
        </View>
    );
};

// Export clearCanvas functionality through ref
export interface DrawingCanvasRef {
    clearCanvas: () => void;
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: 'transparent',
        borderRadius: 16,
        overflow: 'hidden',
    },
    svg: {
        backgroundColor: 'transparent',
    },
});
