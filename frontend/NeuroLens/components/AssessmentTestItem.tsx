import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon, ChevronRight, Check } from 'lucide-react-native';

interface AssessmentTestItemProps {
    title: string;
    description: string;
    icon: LucideIcon;
    color: string;
    isCompleted?: boolean;
    onPress?: () => void;
}

export const AssessmentTestItem = ({
    title,
    description,
    icon: Icon,
    color,
    isCompleted = false,
    onPress,
}: AssessmentTestItemProps) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color }]}>
                <Icon color="#FFFFFF" size={24} />
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.description} numberOfLines={1}>
                    {description}
                </Text>
            </View>

            <View style={styles.actionContainer}>
                {isCompleted ? (
                    <View style={styles.completedBadge}>
                        <Check size={16} color="#10B981" />
                    </View>
                ) : (
                    <ChevronRight size={24} color="#CBD5E1" />
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
        paddingRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 2,
    },
    description: {
        fontSize: 13,
        color: '#64748B',
    },
    actionContainer: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completedBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ECFDF5', // Green 50
        borderWidth: 1,
        borderColor: '#10B981', // Green 500
        justifyContent: 'center',
        alignItems: 'center',
    },
});
