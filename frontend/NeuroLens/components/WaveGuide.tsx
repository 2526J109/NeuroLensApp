import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface WaveGuideProps {
    width?: number;
    height?: number;
    waves?: number;
    amplitude?: number;
    color?: string;
}

export const WaveGuide = ({ 
    width = 300, 
    height = 200,
    waves = 3,
    amplitude = 40,
    color = '#0F172A' 
}: WaveGuideProps) => {
    // Generate sine wave path
    const generateWavePath = () => {
        const points: string[] = [];
        const totalPoints = waves * 50; // 50 points per wave for smoothness
        const wavelength = width / waves;
        const centerY = height / 2;
        
        for (let i = 0; i <= totalPoints; i++) {
            const x = (i / totalPoints) * width;
            const progress = (x / wavelength) * 2 * Math.PI;
            const y = centerY + amplitude * Math.sin(progress);
            
            if (i === 0) {
                points.push(`M ${x} ${y}`);
            } else {
                points.push(`L ${x} ${y}`);
            }
        }
        
        return points.join(' ');
    };

    return (
        <View style={[styles.container, { width, height }]}>
            <Svg width={width} height={height} style={styles.svg}>
                <Path
                    d={generateWavePath()}
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
