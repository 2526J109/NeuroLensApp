import { DrawingPoint } from '@/components/DrawingCanvas';

export interface DrawingDataJSON {
    test_type: 'spiral' | 'wave';
    timestamp: string; // ISO 8601 format
    total_points: number;
    duration_ms: number;
    points: DrawingPoint[];
}

/**
 * Format drawing data into JSON structure
 */
export const formatDrawingData = (
    testType: 'spiral' | 'wave',
    points: DrawingPoint[]
): DrawingDataJSON => {
    const totalPoints = points.length;
    const durationMs = totalPoints > 0 ? points[points.length - 1].timestamp : 0;
    
    return {
        test_type: testType,
        timestamp: new Date().toISOString(),
        total_points: totalPoints,
        duration_ms: durationMs,
        points: points,
    };
};

/**
 * Convert JSON object to formatted string for display or storage
 */
export const stringifyDrawingData = (data: DrawingDataJSON): string => {
    return JSON.stringify(data, null, 2);
};
