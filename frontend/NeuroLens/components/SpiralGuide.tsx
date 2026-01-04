import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SpiralGuideProps {
    size?: number;
    rounds?: number;
    color?: string;
}

export const SpiralGuide = ({ 
    size = 300, 
    rounds = 8,
    color = '#0F172A' 
}: SpiralGuideProps) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 20;
    
    // Generate Archimedean spiral path
    const generateSpiralPath = () => {
        const points: string[] = [];
        // Add extra 0.25 rotation to complete the final circle visually
        const effectiveRounds = rounds + 0.25;
        const totalPoints = Math.floor(effectiveRounds * 100); // 100 points per round for smoothness
        
        for (let i = 0; i <= totalPoints; i++) {
            const angle = (i / totalPoints) * effectiveRounds * 2 * Math.PI;
            const radius = (i / totalPoints) * maxRadius;
            
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            if (i === 0) {
                points.push(`M ${x} ${y}`);
            } else {
                points.push(`L ${x} ${y}`);
            }
        }
        
        return points.join(' ');
    };

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size} style={styles.svg}>
                <Path
                    d={generateSpiralPath()}
                    stroke={color}
                    strokeWidth="2"
                    strokeDasharray="8,8"
                    fill="none"
                    opacity={0.6}
                />
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    svg: {
        position: 'absolute',
    },
});
