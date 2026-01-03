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
    const [tremorValue, setTremorValue] = useState<string>("0.00");

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
                        setTremorValue(decoded);
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
                setTremorValue("0.00");
            } catch (error) {
                console.log(error);
            }
        }
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
                        <View style={{ alignItems: 'center', marginTop: 10 }}>
                            <Text style={{ fontSize: 14, color: '#64748B' }}>TREMOR PROBABILITY</Text>
                            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#0F172A' }}>{tremorValue}</Text>
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
