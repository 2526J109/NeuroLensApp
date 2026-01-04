import React, { useRef, useState, useCallback } from 'react';
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
    const pathsRef = useRef<string[]>([]); // Keep ref in sync with state
    const [currentPath, setCurrentPath] = useState<string>('');
    const currentPathRef = useRef<string>('');
    
    const drawingPointsRef = useRef<DrawingPoint[]>([]);
    const startTimeRef = useRef<number>(0);
    const containerRef = useRef<View>(null);
    const updateCountRef = useRef<number>(0);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            
            onPanResponderGrant: (evt: GestureResponderEvent) => {
                // Only set start time on the very first touch
                if (drawingPointsRef.current.length === 0) {
                    startTimeRef.current = Date.now();
                }
                
                const { locationX, locationY } = evt.nativeEvent;
                const currentTime = Date.now() - startTimeRef.current;
                
                const newPoint: DrawingPoint = {
                    x: locationX,
                    y: locationY,
                    timestamp: currentTime,
                };
                
                // Continue accumulating points
                drawingPointsRef.current.push(newPoint);
                
                // Start a new path segment
                const newPath = `M ${locationX} ${locationY}`;
                currentPathRef.current = newPath;
                setCurrentPath(newPath);
                
                if (onDrawingUpdate) {
                    onDrawingUpdate([...drawingPointsRef.current]);
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
                
                // Accumulate points
                drawingPointsRef.current.push(newPoint);
                
                // Update path
                const updatedPath = `${currentPathRef.current} L ${locationX} ${locationY}`;
                currentPathRef.current = updatedPath;
                setCurrentPath(updatedPath);
                
                // Only update parent every 10 points
                updateCountRef.current++;
                if (updateCountRef.current % 10 === 0 && onDrawingUpdate) {
                    onDrawingUpdate([...drawingPointsRef.current]);
                }
            },
            
            onPanResponderRelease: () => {
                // Save the current stroke
                if (currentPathRef.current) {
                    const newPaths = [...pathsRef.current, currentPathRef.current];
                    pathsRef.current = newPaths;
                    setPaths(newPaths);
                    
                    currentPathRef.current = '';
                    setCurrentPath('');
                }
                
                // Final update
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
        pathsRef.current = [];
        setCurrentPath('');
        currentPathRef.current = '';
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
