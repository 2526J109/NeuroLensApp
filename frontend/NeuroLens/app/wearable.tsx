import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList, Platform, PermissionsAndroid, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Watch, Bluetooth, X, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BleManager, Device } from 'react-native-ble-plx';
import { useState, useEffect, useMemo } from 'react';

export default function WearableScreen() {
    const router = useRouter();
    const manager = useMemo(() => new BleManager(), []);
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // New Session States
    const [sessionStatus, setSessionStatus] = useState<'IDLE' | 'GATHERING' | 'DONE'>('IDLE');
    const [sessionProgress, setSessionProgress] = useState<number>(0);
    const [sessionTotal, setSessionTotal] = useState<number>(23);
    const [sessionResult, setSessionResult] = useState<'HEALTHY' | 'PARKINSONS' | null>(null);
    const [sessionRatio, setSessionRatio] = useState<string>("0.00");

    const NEUROLENS_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
    const TREMOR_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

    useEffect(() => {
        return () => {
            manager.destroy();
        };
    }, [manager]);

    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            if (Platform.Version >= 31) {
                const result = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                ]);

                return (
                    result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
                    result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
                    result['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
                );
            } else {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'NeuroLens needs location permission to scan for Bluetooth devices.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
        }
        return true;
    };

    const startScan = async () => {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert('Permission Denied', 'Bluetooth permissions are required.');
            return;
        }

        setIsScanning(true);
        setDevices([]);
        setIsModalVisible(true);

        manager.startDeviceScan(null, null, (error, device) => {
            if (error) {
                console.log(error);
                setIsScanning(false);
                return;
            }

            if (device && device.name) {
                setDevices((prevDevices) => {
                    if (!prevDevices.some((d) => d.id === device.id)) {
                        return [...prevDevices, device];
                    }
                    return prevDevices;
                });
            }
        });

        setTimeout(() => {
            manager.stopDeviceScan();
            setIsScanning(false);
        }, 10000);
    };

    const connectToDevice = async (device: Device) => {
        manager.stopDeviceScan();
        setIsScanning(false);

        try {
            const connected = await device.connect();
            await connected.discoverAllServicesAndCharacteristics();
            setConnectedDevice(connected);
            setIsModalVisible(false);

            Alert.alert('Connected', `Connected to ${device.name}`);

            // Monitor the characteristic
            connected.monitorCharacteristicForService(
                NEUROLENS_SERVICE_UUID,
                TREMOR_CHAR_UUID,
                (error, characteristic) => {
                    if (error) {
                        console.log("Monitor Error:", error);
                        return;
                    }
                    if (characteristic?.value) {
                        const decoded = decodeBase64(characteristic.value);
                        console.log("BLE Received:", decoded);

                        // Expected formats: 
                        // "PROG:15:23" -> Gathering data, window 15 of 23
                        // "DONE:PD:0.35" -> Session finished, Parkinson's Detected (35% positive windows)
                        // "DONE:OK:0.04" -> Session finished, Healthy (4% positive windows)

                        const parts = decoded.split(":");
                        if (parts.length >= 3) {
                            if (parts[0] === "PROG") {
                                setSessionStatus('GATHERING');
                                setSessionProgress(parseInt(parts[1], 10) || 0);
                                setSessionTotal(parseInt(parts[2], 10) || 23);
                            } else if (parts[0] === "DONE") {
                                setSessionStatus('DONE');
                                setSessionResult(parts[1] === "PD" ? 'PARKINSONS' : 'HEALTHY');
                                setSessionRatio(parts[2] || "0.00");
                            }
                        }
                    }
                }
            );

        } catch (error) {
            console.log(error);
            Alert.alert('Connection Failed', 'Could not connect.');
        }
    };

    // Helper for Base64 decoding (since atob is not in RN)
    const decodeBase64 = (input: string) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let str = input.replace(/=+$/, '');
        let output = '';

        if (str.length % 4 == 1) {
            throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
        }
        for (let bc = 0, bs = 0, buffer, i = 0;
            buffer = str.charAt(i++);
            ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
                bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
        ) {
            buffer = chars.indexOf(buffer);
        }

        return output;
    };

    const disconnectDevice = async () => {
        if (connectedDevice) {
            try {
                await connectedDevice.cancelConnection();
                setConnectedDevice(null);
                // Reset Session state
                setSessionStatus('IDLE');
                setSessionProgress(0);
                setSessionResult(null);
            } catch (error) {
                console.log(error);
            }
        }
    };

    const startAssessment = async () => {
        if (!connectedDevice) return;

        try {
            // Encode "START" to base64
            const startCommand = btoa("START");
            await manager.writeCharacteristicWithResponseForDevice(
                connectedDevice.id,
                NEUROLENS_SERVICE_UUID,
                TREMOR_CHAR_UUID,
                startCommand
            );

            // Optimistically update UI
            setSessionStatus('GATHERING');
            setSessionProgress(0);
            setSessionResult(null);

        } catch (error) {
            console.log("Failed to start assessment:", error);
            Alert.alert("Error", "Failed to start assessment. Is the device still connected?");
        }
    };

    // Helper for encoding (React Native doesn't have btoa)
    const btoa = (input: string) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let str = input;
        let output = '';

        for (let block = 0, charCode, i = 0, map = chars;
            str.charAt(i | 0) || (map = '=', i % 1);
            output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
            charCode = str.charCodeAt(i += 3 / 4);
            if (charCode > 0xFF) {
                throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
            }
            block = block << 8 | charCode;
        }
        return output;
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen
                options={{
                    headerTitle: 'Wearable Device',
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F8FAFC' },
                    headerTitleStyle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
                    headerTintColor: '#0F172A',
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.statusContainer}>
                    <View style={[styles.iconCircle, connectedDevice && styles.iconCircleConnected]}>
                        <Watch size={48} color={connectedDevice ? "#14B8A6" : "#475569"} strokeWidth={1.5} />
                    </View>

                    <Text style={styles.statusTitle}>
                        {connectedDevice ? connectedDevice.name : 'No Device Connected'}
                    </Text>

                    {connectedDevice ? (
                        <View style={{ width: '100%', alignItems: 'center', marginTop: 16 }}>
                            {sessionStatus === 'IDLE' && (
                                <>
                                    <Text style={styles.statusSubtitle}>Device ready. Tap Start when you are in position.</Text>
                                    <TouchableOpacity
                                        style={styles.startButton}
                                        activeOpacity={0.8}
                                        onPress={startAssessment}
                                    >
                                        <Text style={styles.startButtonText}>Start Assessment</Text>
                                    </TouchableOpacity>
                                </>
                            )}

                            {sessionStatus === 'GATHERING' && (
                                <View style={styles.progressContainer}>
                                    <Text style={styles.progressTitle}>Recording Movement...</Text>
                                    <Text style={styles.progressText}>Step {sessionProgress} of {sessionTotal}</Text>
                                    <View style={styles.progressBarBackground}>
                                        <View style={[styles.progressBarFill, { width: `${Math.min(100, (sessionProgress / sessionTotal) * 100)}%` as any }]} />
                                    </View>
                                    <Text style={styles.progressHint}>Keep making natural movements.</Text>
                                    <ActivityIndicator style={{ marginTop: 16 }} size="small" color="#14B8A6" />
                                </View>
                            )}

                            {sessionStatus === 'DONE' && (
                                <View style={[styles.resultContainer, sessionResult === 'PARKINSONS' ? styles.resultAlert : styles.resultSuccess]}>
                                    <Text style={[styles.resultTitle, sessionResult === 'PARKINSONS' && { color: '#991B1B' }]}>
                                        {sessionResult === 'PARKINSONS' ? "Parkinson's Characteristics Detected" : "Healthy Movement Detected"}
                                    </Text>
                                    <Text style={styles.resultRatio}>
                                        Positive Ratio: {sessionRatio} ({Math.round(parseFloat(sessionRatio) * sessionTotal)}/{sessionTotal} windows)
                                    </Text>

                                    <TouchableOpacity
                                        style={[styles.startButton, { marginTop: 20, backgroundColor: sessionResult === 'PARKINSONS' ? '#DC2626' : '#14B8A6' }]}
                                        activeOpacity={0.8}
                                        onPress={startAssessment}
                                    >
                                        <Text style={styles.startButtonText}>Restart Assessment</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ) : (
                        <Text style={styles.statusSubtitle}>
                            Connect your wearable to begin collecting movement data
                        </Text>
                    )}
                </View>

                {connectedDevice ? (
                    <TouchableOpacity
                        style={[styles.connectButton, styles.disconnectButton]}
                        activeOpacity={0.8}
                        onPress={disconnectDevice}
                    >
                        <X size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>Disconnect Device</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.connectButton}
                        activeOpacity={0.8}
                        onPress={startScan}
                    >
                        <Bluetooth size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.buttonText}>Connect Device</Text>
                    </TouchableOpacity>
                )}

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

            {/* Device Selection Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Device</Text>
                        <TouchableOpacity onPress={() => {
                            setIsModalVisible(false);
                            manager.stopDeviceScan();
                            setIsScanning(false);
                        }}>
                            <X size={24} color="#0F172A" />
                        </TouchableOpacity>
                    </View>

                    {isScanning && (
                        <View style={styles.scanningIndicator}>
                            <ActivityIndicator size="small" color="#14B8A6" />
                            <Text style={styles.scanningText}>Scanning for devices...</Text>
                        </View>
                    )}

                    <FlatList
                        data={devices}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.deviceItem}
                                onPress={() => connectToDevice(item)}
                            >
                                <View style={styles.deviceIconContainer}>
                                    <Bluetooth size={24} color="#64748B" />
                                </View>
                                <View style={styles.deviceInfo}>
                                    <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
                                    <Text style={styles.deviceId}>{item.id}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.deviceList}
                        ListEmptyComponent={
                            !isScanning ? (
                                <Text style={styles.emptyText}>No devices found</Text>
                            ) : null
                        }
                    />
                </SafeAreaView>
            </Modal>
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
    startButton: {
        backgroundColor: '#3B82F6', // Blue 500
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        marginTop: 16,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    startButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressContainer: {
        width: '100%',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 8,
    },
    progressText: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 16,
    },
    progressHint: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 12,
        fontStyle: 'italic',
    },
    progressBarBackground: {
        width: '100%',
        height: 12,
        backgroundColor: '#E2E8F0',
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#14B8A6',
        borderRadius: 6,
    },
    resultContainer: {
        width: '100%',
        alignItems: 'center',
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
    },
    resultSuccess: {
        backgroundColor: '#F0FDFA',
        borderColor: '#5EEAD4',
    },
    resultAlert: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FCA5A5',
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F766E', // Default to dark teal for success
        textAlign: 'center',
        marginBottom: 8,
    },
    resultRatio: {
        fontSize: 14,
        color: '#475569',
    },
    iconCircleConnected: {
        backgroundColor: '#E0F2FE', // Light blue bg for connected state
    },
    disconnectButton: {
        backgroundColor: '#EF4444', // Red for disconnect
        shadowColor: '#EF4444',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    scanningIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        backgroundColor: '#F0FDFA',
    },
    scanningText: {
        marginLeft: 8,
        color: '#14B8A6',
        fontWeight: '500',
    },
    deviceList: {
        padding: 16,
    },
    deviceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        marginBottom: 12,
    },
    deviceIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    deviceInfo: {
        flex: 1,
    },
    deviceName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    deviceId: {
        fontSize: 12,
        color: '#64748B',
    },
    emptyText: {
        textAlign: 'center',
        color: '#94A3B8',
        marginTop: 40,
        fontSize: 16,
    },
});
