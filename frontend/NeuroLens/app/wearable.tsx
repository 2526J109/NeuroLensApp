import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList, Platform, PermissionsAndroid, Alert, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Watch, Bluetooth, X, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BleManager, Device } from 'react-native-ble-plx';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function WearableScreen() {
    const router = useRouter();
    const { userProfile } = useAuth();
    const manager = useMemo(() => new BleManager(), []);
    const [isScanning, setIsScanning] = useState(false);
    const [devices, setDevices] = useState<Device[]>([]);
    const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // New Session States
    const [sessionStatus, setSessionStatus] = useState<'IDLE' | 'GATHERING' | 'DONE'>('IDLE');
    const [sessionProgress, setSessionProgress] = useState<number>(0);
    const [sessionTotal, setSessionTotal] = useState<number>(12);
    const [sessionResult, setSessionResult] = useState<'HEALTHY' | 'PARKINSONS' | null>(null);
    const [sessionRatio, setSessionRatio] = useState<string>("0.00");

    const [assessmentStep, _setAssessmentStep] = useState<number>(0); // 0: Idle, 1: Resting, 2: Postural, 3: Kinetic, 4: Summary 
    const assessmentStepRef = React.useRef(0);
    const setAssessmentStep = (step: number) => {
        _setAssessmentStep(step);
        assessmentStepRef.current = step;
    };
    const [stepResults, setStepResults] = useState<{ [key: number]: { ratio: string, result: 'HEALTHY' | 'PARKINSONS' } }>({});

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

            if (device && device.name && device.name.includes("NeuroLens")) {
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
                                const resultType = parts[1] === "PD" ? 'PARKINSONS' : 'HEALTHY';
                                const ratio = parts[2] || "0.00";
                                const currentStep = assessmentStepRef.current;

                                // Store step result
                                setStepResults(prev => ({
                                    ...prev,
                                    [currentStep - 1]: { ratio, result: resultType }
                                }));

                                setSessionStatus('DONE');
                                setSessionResult(resultType);
                                setSessionRatio(ratio);

                                // Auto-transition to summary if last step done
                                if (currentStep === 3) {
                                    setTimeout(() => setAssessmentStep(4), 1500);
                                }
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

    const calculateAge = (birthday?: string) => {
        if (!birthday) return 0;
        const birthDate = new Date(birthday);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const startAssessment = async () => {
        if (!connectedDevice) return;

        // Step 1: Resting (CAT:0), Step 2: Postural (CAT:1), Step 3: Kinetic (CAT:2)
        const categoryIdx = assessmentStep - 1;

        try {
            // 1. Send User Data (Gender, Age, Handedness)
            const isMale = userProfile?.gender?.toLowerCase() === 'male' ? 1 : 0;
            const age = calculateAge(userProfile?.birthday);
            const isRightHanded = userProfile?.handedness?.toLowerCase() === 'right' ? 1 : 0;

            // Format: "GEN:0/1", "AGE:XX", "HAN:0/1", "CAT:0/1/2"
            const sendCmd = async (cmd: string) => {
                console.log("Sending to wearable:", cmd);
                await manager.writeCharacteristicWithResponseForDevice(
                    connectedDevice.id,
                    NEUROLENS_SERVICE_UUID,
                    TREMOR_CHAR_UUID,
                    btoa(cmd)
                );
                await new Promise(resolve => setTimeout(resolve, 300));
            };

            await sendCmd(`GEN:${isMale}`);
            await sendCmd(`AGE:${age}`);
            await sendCmd(`HAN:${isRightHanded}`);
            await sendCmd(`CAT:${categoryIdx}`);
            await sendCmd("START");

            // Update UI
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
                    headerBackTitle: 'Back',
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
                            {assessmentStep === 0 && (
                                <View style={styles.wizardIntro}>
                                    <Text style={styles.statusSubtitle}>Begin the standardized Parkinson's Assessment. This will guide you through 3 movement tasks (1 minute each).</Text>
                                    <TouchableOpacity
                                        style={styles.startButton}
                                        onPress={() => setAssessmentStep(1)}
                                    >
                                        <Text style={styles.startButtonText}>Begin Assessment</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {assessmentStep >= 1 && assessmentStep <= 3 && (
                                <>
                                    {sessionStatus === 'IDLE' && (
                                        <View style={styles.stepContainer}>
                                            <View style={styles.stepHeader}>
                                                <Text style={styles.stepBadge}>Step {assessmentStep} of 3</Text>
                                                <Text style={styles.stepTitle}>
                                                    {assessmentStep === 1 ? "Resting Tremor" :
                                                        assessmentStep === 2 ? "Postural Tremor" : "Kinetic Tremor"}
                                                </Text>
                                            </View>

                                            <View style={styles.stepGraphic}>
                                                <Text style={{ fontSize: 40 }}>
                                                    {assessmentStep === 1 ? "🧘" : assessmentStep === 2 ? "👐" : "👃"}
                                                </Text>
                                            </View>

                                            <Text style={styles.stepInstructions}>
                                                {assessmentStep === 1 ? "Place your hands comfortably in your lap. Try to relax and remain as still as possible." :
                                                    assessmentStep === 2 ? "Stretch your arms straight out in front of you, palms facing down, and keep them level." :
                                                        "Slowly and repeatedly touch your finger to your nose, then extend your arm back out."}
                                            </Text>

                                            <TouchableOpacity
                                                style={[styles.startButton, { backgroundColor: '#14B8A6' }]}
                                                onPress={startAssessment}
                                            >
                                                <Text style={styles.startButtonText}>Start Recording</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {sessionStatus === 'GATHERING' && (
                                        <View style={styles.progressContainer}>
                                            <Text style={styles.progressTitle}>Recording {assessmentStep === 1 ? "Resting" : assessmentStep === 2 ? "Postural" : "Kinetic"}...</Text>
                                            <Text style={styles.progressText}>Observation {sessionProgress} of {sessionTotal}</Text>
                                            <View style={styles.progressBarBackground}>
                                                <View style={{ height: '100%', backgroundColor: '#14B8A6', borderRadius: 6, width: `${Math.round((sessionProgress / Math.max(1, sessionTotal)) * 100)}%` as any }} />
                                            </View>
                                            <Text style={styles.progressHint}>Continue the task until the timer finishes.</Text>
                                            <ActivityIndicator style={{ marginTop: 16 }} size="small" color="#14B8A6" />
                                        </View>
                                    )}

                                    {sessionStatus === 'DONE' && (
                                        <View style={[styles.resultContainer, sessionResult === 'PARKINSONS' ? styles.resultAlert : styles.resultSuccess]}>
                                            <Check size={32} color={sessionResult === 'PARKINSONS' ? "#B91C1C" : "#0D9488"} style={{ marginBottom: 12 }} />
                                            <Text style={[styles.resultTitle, sessionResult === 'PARKINSONS' && { color: '#991B1B' }]}>
                                                {assessmentStep === 1 ? "Resting" : assessmentStep === 2 ? "Postural" : "Kinetic"} Assessment Complete
                                            </Text>

                                            <Text style={styles.resultRatio}>
                                                Window Vote: {sessionResult === 'PARKINSONS' ? "Signs detected" : "No signs detected"}
                                                ({Math.round(parseFloat(sessionRatio) * 100)}% detection)
                                            </Text>

                                            {assessmentStep < 3 ? (
                                                <TouchableOpacity
                                                    style={[styles.startButton, { marginTop: 24, backgroundColor: '#3B82F6' }]}
                                                    onPress={() => {
                                                        setAssessmentStep(assessmentStep + 1);
                                                        setSessionStatus('IDLE');
                                                    }}
                                                >
                                                    <Text style={styles.startButtonText}>Proceed to Next Task</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <ActivityIndicator style={{ marginTop: 24 }} color="#3B82F6" />
                                            )}
                                        </View>
                                    )}
                                </>
                            )}

                            {assessmentStep === 4 && (
                                <View style={styles.summaryContainer}>
                                    <View style={styles.globalVerdictCard}>
                                        <Text style={styles.globalVerdictLabel}>Overall Clinical Verdict</Text>
                                        <Text style={[styles.globalVerdictValue,
                                        Object.values(stepResults).some(r => r.result === 'PARKINSONS') ? { color: '#B91C1C' } : { color: '#0D9488' }
                                        ]}>
                                            {Object.values(stepResults).some(r => r.result === 'PARKINSONS')
                                                ? "Parkinson's Characteristics Detected"
                                                : "Healthy Movement Observed"}
                                        </Text>
                                        <Text style={styles.probabilityScore}>
                                            Probability Score: {Math.round(Math.max(...Object.values(stepResults).map(r => parseFloat(r.ratio))) * 100)}%
                                        </Text>
                                        <Text style={styles.globalVerdictSubtext}>
                                            Based on aggregate analysis of Resting, Postural, and Kinetic tasks.
                                        </Text>
                                    </View>

                                    <Text style={styles.summaryHeader}>Detailed Breakdown</Text>

                                    {[1, 2, 3].map((step) => (
                                        <View key={step} style={styles.summaryItem}>
                                            <View style={styles.summaryItemTitleGroup}>
                                                <Text style={styles.summaryItemLabel}>
                                                    {step === 1 ? "Resting Task" : step === 2 ? "Postural Task" : "Kinetic Task"}
                                                </Text>
                                                <Text style={[styles.summaryBadge, stepResults[step - 1]?.result === 'PARKINSONS' ? styles.badgeAlert : styles.badgeSuccess]}>
                                                    {stepResults[step - 1]?.result === 'PARKINSONS' ? `${Math.round(parseFloat(stepResults[step - 1]?.ratio || "0") * 100)}%` : "Healthy"}
                                                </Text>
                                            </View>
                                            <Text style={styles.summaryItemDetail}>
                                                {stepResults[step - 1]?.result === 'PARKINSONS' ? "Signs detected in " : "No signs detected in "}
                                                {Math.round(parseFloat(stepResults[step - 1]?.ratio || "0") * sessionTotal)} of {sessionTotal} windows
                                            </Text>
                                        </View>
                                    ))}

                                    <TouchableOpacity
                                        style={[styles.startButton, { marginTop: 32, width: '100%' }]}
                                        onPress={() => {
                                            setAssessmentStep(0);
                                            setSessionStatus('IDLE');
                                            setStepResults({});
                                        }}
                                    >
                                        <Text style={styles.startButtonText}>Restart Entire Assessment</Text>
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
                    <Text style={styles.instructionsTitle}>Assessment Protocol</Text>

                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>1.</Text>
                        <Text style={styles.instructionText}>Fasten the wearable securely to your wrist.</Text>
                    </View>

                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>2.</Text>
                        <Text style={styles.instructionText}>After pressing Start, place your phone down on the table.</Text>
                    </View>

                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>3.</Text>
                        <Text style={styles.instructionText}>Rest your hands completely still in your lap and relax.</Text>
                    </View>

                    <View style={styles.bulletPoint}>
                        <Text style={styles.bullet}>4.</Text>
                        <Text style={styles.instructionText}>Wait for the assessment to complete (approx. 45 seconds). The result screen will appear automatically.</Text>
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
    wizardIntro: {
        width: '100%',
        alignItems: 'center',
    },
    stepContainer: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    stepHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    stepBadge: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    stepGraphic: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    stepInstructions: {
        fontSize: 16,
        color: '#475569',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    summaryContainer: {
        width: '100%',
        padding: 20,
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    summaryHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 24,
        textAlign: 'center',
    },
    summaryItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    summaryItemTitleGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryItemLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    summaryItemDetail: {
        fontSize: 14,
        color: '#64748B',
    },
    summaryBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 'bold',
        overflow: 'hidden',
    },
    badgeSuccess: {
        backgroundColor: '#DCFCE7',
        color: '#166534',
    },
    badgeAlert: {
        backgroundColor: '#FEE2E2',
        color: '#991B1B',
    },
    globalVerdictCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    globalVerdictLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
    },
    globalVerdictValue: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    probabilityScore: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#475569',
        marginBottom: 12,
    },
    globalVerdictSubtext: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
