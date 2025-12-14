import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Watch, Bluetooth } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WearableScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Wearable Device',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F8FAFC' },
                    headerTitleStyle: {
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: '#0F172A'
                    },
                    headerTintColor: '#0F172A',
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Connection Status Section */}
                <View style={styles.statusContainer}>
                    <View style={styles.iconCircle}>
                        <Watch size={48} color="#475569" strokeWidth={1.5} />
                    </View>

                    <Text style={styles.statusTitle}>No Device Connected</Text>
                    <Text style={styles.statusSubtitle}>
                        Connect your wearable to begin collecting movement data
                    </Text>
                </View>

                {/* Connect Button */}
                <TouchableOpacity style={styles.connectButton} activeOpacity={0.8}>
                    <Bluetooth size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Connect Device</Text>
                </TouchableOpacity>

                {/* Instructions Card */}
                <View style={styles.instructionsCard}>
                    <Text style={styles.instructionsTitle}>Instructions</Text>

                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.instructionText}>Ensure your wearable is powered on</Text>
                    </View>

                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.instructionText}>Keep your device within 10 meters</Text>
                    </View>

                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.instructionText}>Perform natural movements during collection</Text>
                    </View>

                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.instructionText}>Collection takes approximately 2 minutes</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    statusContainer: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    statusTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 8,
    },
    statusSubtitle: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    connectButton: {
        backgroundColor: '#14B8A6', // Teal 500
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 40,
        shadowColor: '#14B8A6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    instructionsCard: {
        width: '100%',
        backgroundColor: '#F8FAFC', // Slate 50
        borderRadius: 16,
        padding: 24,
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 16,
    },
    bulletPoint: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    bullet: {
        fontSize: 16,
        color: '#64748B',
        marginRight: 8,
        lineHeight: 22,
    },
    instructionText: {
        fontSize: 14,
        color: '#64748B',
        flex: 1,
        lineHeight: 22,
    },
});
