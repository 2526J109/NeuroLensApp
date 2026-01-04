import { DrawingDataJSON } from './dataExport';

export interface RiskAssessment {
    riskPercentage: number; // 0-100
    riskLevel: 'Low' | 'Moderate' | 'High';
    confidence: number; // 0-100
    metrics: {
        smoothness: number;
        speed: number;
        tremor: number;
    };
}

/**
 * Calculate smoothness score based on point-to-point distance variance
 * Lower variance = smoother drawing (healthier)
 */
const calculateSmoothness = (points: { x: number; y: number }[]): number => {
    if (points.length < 3) return 100;
    
    const distances: number[] = [];
    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        distances.push(Math.sqrt(dx * dx + dy * dy));
    }
    
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower std dev = smoother (better)
    // Normalize to 0-100 scale (100 = smooth, 0 = very rough)
    const smoothness = Math.max(0, 100 - (stdDev * 2));
    return smoothness;
};

/**
 * Calculate speed score based on points per second
 * Very slow OR very fast can indicate issues
 */
const calculateSpeed = (points: number, durationMs: number): number => {
    if (durationMs === 0) return 50;
    
    const pointsPerSecond = (points / durationMs) * 1000;
    
    // Optimal range: 30-60 points per second
    // Too slow (bradykinesia) or too fast (tremor compensation)
    if (pointsPerSecond >= 30 && pointsPerSecond <= 60) {
        return 100;
    } else if (pointsPerSecond < 20 || pointsPerSecond > 80) {
        return 0;
    } else {
        // Gradual decline
        return 50;
    }
};

/**
 * Calculate tremor indicator based on high-frequency variations
 */
const calculateTremor = (points: { x: number; y: number }[]): number => {
    if (points.length < 5) return 0;
    
    let tremorScore = 0;
    
    // Look for rapid direction changes (tremor indicator)
    for (let i = 2; i < points.length; i++) {
        const dx1 = points[i - 1].x - points[i - 2].x;
        const dy1 = points[i - 1].y - points[i - 2].y;
        const dx2 = points[i].x - points[i - 1].x;
        const dy2 = points[i].y - points[i - 1].y;
        
        // Calculate angle change
        const angle1 = Math.atan2(dy1, dx1);
        const angle2 = Math.atan2(dy2, dx2);
        let angleDiff = Math.abs(angle2 - angle1);
        
        // Normalize to 0-π
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        // Large direction changes = potential tremor
        if (angleDiff > Math.PI / 2) {
            tremorScore++;
        }
    }
    
    // Normalize to 0-100 (higher = more tremor = worse)
    const tremorPercentage = Math.min(100, (tremorScore / points.length) * 100 * 10);
    return tremorPercentage;
};

/**
 * Analyze drawing data and calculate Parkinson's risk
 * NOTE: This is a HEURISTIC placeholder. Replace with actual ML model predictions.
 */
export const analyzeDrawingRisk = (
    spiralData: DrawingDataJSON | null,
    waveData: DrawingDataJSON | null
): RiskAssessment => {
    // Default low risk if no data
    if (!spiralData && !waveData) {
        return {
            riskPercentage: 0,
            riskLevel: 'Low',
            confidence: 0,
            metrics: { smoothness: 0, speed: 0, tremor: 0 }
        };
    }
    
    let totalSmoothness = 0;
    let totalSpeed = 0;
    let totalTremor = 0;
    let count = 0;
    
    // Analyze spiral data
    if (spiralData && spiralData.points.length > 0) {
        totalSmoothness += calculateSmoothness(spiralData.points);
        totalSpeed += calculateSpeed(spiralData.total_points, spiralData.duration_ms);
        totalTremor += calculateTremor(spiralData.points);
        count++;
    }
    
    // Analyze wave data
    if (waveData && waveData.points.length > 0) {
        totalSmoothness += calculateSmoothness(waveData.points);
        totalSpeed += calculateSpeed(waveData.total_points, waveData.duration_ms);
        totalTremor += calculateTremor(waveData.points);
        count++;
    }
    
    // Average metrics
    const avgSmoothness = totalSmoothness / count;
    const avgSpeed = totalSpeed / count;
    const avgTremor = totalTremor / count;
    
    // Calculate risk (inverse of health indicators)
    // Lower smoothness, abnormal speed, higher tremor = higher risk
    const smoothnessRisk = 100 - avgSmoothness;
    const speedRisk = 100 - avgSpeed;
    const tremorRisk = avgTremor;
    
    // Weighted average (tremor is most indicative)
    const riskPercentage = Math.round(
        (smoothnessRisk * 0.3 + speedRisk * 0.2 + tremorRisk * 0.5)
    );
    
    // Determine risk level
    let riskLevel: 'Low' | 'Moderate' | 'High';
    if (riskPercentage < 30) {
        riskLevel = 'Low';
    } else if (riskPercentage < 60) {
        riskLevel = 'Moderate';
    } else {
        riskLevel = 'High';
    }
    
    // Confidence based on data quality
    const confidence = Math.min(100, count * 50);
    
    return {
        riskPercentage,
        riskLevel,
        confidence,
        metrics: {
            smoothness: Math.round(avgSmoothness),
            speed: Math.round(avgSpeed),
            tremor: Math.round(avgTremor)
        }
    };
};
