import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Mic, ArrowLeft, Play, Square, Check, Volume2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { API_ENDPOINTS } from '../constants/api';
import { useLanguage } from '@/contexts/LanguageContext';

const PROMPTS = [
  {
    id: 1,
  },
  {
    id: 2,
  },
];

export default function VoiceAnalysisScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<{ [key: number]: any }>({});
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isUnloadingRef = useRef(false);

  useEffect(() => {
    // Request audio permissions
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert(t('permissions.microphoneRequired'));
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 0.1);
      }, 100);

      // Animate the recording circle
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      scaleAnim.setValue(1);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      // Cleanup audio resources
      if (sound) {
        sound.unloadAsync().catch(() => {
          // Ignore errors during cleanup
        });
      }
      if (recording && !isUnloadingRef.current) {
        isUnloadingRef.current = true;
        recording.stopAndUnloadAsync().catch(() => {
          // Ignore errors during cleanup
        });
      }

      // Stop any ongoing speech when leaving the screen
      Speech.stop();
    };
  }, [sound, recording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const speakPrompt = (text: string) => {
    if (!text) return;

    // Stop any previous speech before starting a new one
    Speech.stop();

    Speech.speak(text, {
      language: 'en-US',
      rate: 0.9,
      pitch: 1.0,
    });
  };

  const startRecording = async () => {
    try {
      // Reset unloading flag when starting new recording
      isUnloadingRef.current = false;

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      console.error('Failed to start recording', err);
      alert(t('errors.failedStart'));
    }
  };

  const stopRecording = async () => {
    if (!recording || !isRecording || isUnloadingRef.current) return;

    // Mark as unloading to prevent double unload
    isUnloadingRef.current = true;

    // Store reference to current recording to avoid state issues
    const currentRecording = recording;
    const currentTime = recordingTime;
    const currentIndex = currentPromptIndex;

    try {
      // Get URI first (before any status checks or stopping)
      let uri: string | null = null;
      try {
        uri = currentRecording.getURI();
      } catch (uriErr) {
        console.log('Could not get URI from recording');
      }

      // Get the status to check if recording is active
      let status;
      try {
        status = await currentRecording.getStatusAsync();
      } catch (statusErr) {
        // Recording might already be unloaded, but try to save if we have URI
        console.log('Recording status unavailable, may already be unloaded');
        setIsRecording(false);
        setRecording(null);
        setRecordingTime(0);

        // Still try to save if we have a URI
        if (uri) {
          setRecordings((prev) => ({
            ...prev,
            [currentIndex]: { uri: uri!, duration: currentTime },
          }));
        }

        isUnloadingRef.current = false;
        return;
      }

      if (!status.isRecording) {
        // Recording already stopped, but try to save if we have URI
        setIsRecording(false);
        setRecording(null);
        setRecordingTime(0);

        // Still try to save if we have a URI
        if (uri) {
          setRecordings((prev) => ({
            ...prev,
            [currentIndex]: { uri: uri!, duration: currentTime },
          }));
        }

        isUnloadingRef.current = false;
        return;
      }

      // Stop and unload the recording
      await currentRecording.stopAndUnloadAsync();

      // Get the URI after stopping (should still be available)
      if (!uri) {
        try {
          uri = currentRecording.getURI();
        } catch (e) {
          console.log('Could not get URI after stopping');
        }
      }

      // Update state after successful stop
      setIsRecording(false);

      // Always save the recording to state (even if URI is null, we mark it as recorded)
      // This ensures the "Next Prompt" button appears
      setRecordings((prev) => ({
        ...prev,
        [currentIndex]: {
          uri: uri || `recording_${currentIndex}_${Date.now()}`,
          duration: currentTime
        },
      }));


      setRecording(null);
      setRecordingTime(0);
    } catch (err: any) {
      console.error('Failed to stop recording', err);
      // Even if there's an error, reset the recording state to prevent UI lock
      setIsRecording(false);
      setRecording(null);
      setRecordingTime(0);

      // Try to get URI and save recording, even if there was an error
      let errorUri: string | null = null;
      try {
        errorUri = currentRecording.getURI();
      } catch (e) {
        // Ignore errors when trying to get URI
      }

      // Always save to state to allow progression, even if URI is null
      setRecordings((prev) => ({
        ...prev,
        [currentIndex]: {
          uri: errorUri || `recording_${currentIndex}_${Date.now()}`,
          duration: currentTime
        },
      }));
    } finally {
      // Reset the unloading flag after a short delay to allow cleanup to complete
      setTimeout(() => {
        isUnloadingRef.current = false;
      }, 100);
    }
  };

  const playRecording = async (promptIndex: number) => {
    const recordingData = recordings[promptIndex];
    if (!recordingData) return;

    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingData.uri },
        { shouldPlay: true }
      );
      setSound(newSound);

      await newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (err) {
      console.error('Failed to play recording', err);
    }
  };

  const handleNextPrompt = () => {
    if (currentPromptIndex < PROMPTS.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1);
      setRecordingTime(0);
    }
  };

  // --- Multimodal prediction integration ---
  const handleCompleteTestWithResults = async () => {
    // Check if all recordings are complete
    const allRecordingsComplete = PROMPTS.every((_, index) => recordings[index]);
    if (!allRecordingsComplete) {
      Alert.alert(
        t('errors.incompleteTestTitle'),
        t('errors.incompleteTestMessage'),
        [{ text: t('errors.ok') }]
      );
      return;
    }
    setIsAnalyzing(true);

    try {
      // Build multipart form with the actual audio recordings
      const formData = new FormData();

      PROMPTS.forEach((_prompt, index) => {
        const rec = recordings[index];
        if (!rec?.uri) return;

        const uri: string = rec.uri;

        // Only upload if this is a real filesystem path.
        // Expo produces file:// URIs on iOS/Android. Fallback URIs like
        // "recording_0_1234567890" are not real files and must be skipped.
        const isRealFile =
          uri.startsWith('file://') ||
          uri.startsWith('/') ||
          uri.startsWith('content://');

        if (!isRealFile) {
          console.warn(`Skipping non-file URI for prompt ${index}:`, uri);
          return;
        }

        const fieldName = index === 0 ? 'audio_0' : 'audio_1';

        // Derive filename and MIME type from the URI
        const cleanUri = uri.split('?')[0]; // strip query params
        const uriParts = cleanUri.split('.');
        const ext = uriParts[uriParts.length - 1]?.toLowerCase() || 'm4a';
        const mimeMap: Record<string, string> = {
          m4a: 'audio/m4a',
          mp4: 'audio/mp4',
          aac: 'audio/aac',
          wav: 'audio/wav',
          caf: 'audio/x-caf',
        };
        const mimeType = mimeMap[ext] || 'audio/m4a';

        console.log(`Appending ${fieldName}:`, { uri, name: `recording_${index}.${ext}`, type: mimeType });
        (formData as any).append(fieldName, {
          uri,
          name: `recording_${index}.${ext}`,
          type: mimeType,
        } as any);
      });

      // Log the form data entries for debugging
      console.log('FormData prepared, submitting to:', API_ENDPOINTS.VOICE_ANALYSIS.PREDICT_MULTIMODAL_AUDIO);


      // Do NOT set Content-Type — fetch sets the multipart boundary automatically
      const response = await fetch(API_ENDPOINTS.VOICE_ANALYSIS.PREDICT_MULTIMODAL_AUDIO, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const percentage = parseFloat(result?.risk_percentage) || 0;
      const status = result?.risk_category || 'Unknown';
      const description = `Voice analysis completed. Risk: ${result?.risk_percentage} (${status})`;
      router.push(
        `/voice-test-results?percentage=${Math.round(percentage)}&status=${status}&description=${encodeURIComponent(description)}`
      );
    } catch (error: any) {
      console.error('Error analyzing voice recordings:', error);
      Alert.alert(
        t('errors.analysisFailedTitle'),
        t('errors.analysisFailedMessage', { details: error?.message ?? t('errors.unknownError') }),
        [{ text: t('errors.ok') }]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };




  const currentPrompt = PROMPTS[currentPromptIndex];
  const hasRecording = !!recordings[currentPromptIndex];
  const isLastPrompt = currentPromptIndex === PROMPTS.length - 1;
  const completedRecordings = Object.keys(recordings).filter(
    (key) => recordings[parseInt(key)]
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerTitle: t('voiceAnalysis.headerTitle'),
          headerShadowVisible: false,
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: '#0F172A',
          },
          headerTintColor: '#0F172A',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {PROMPTS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentPromptIndex && styles.progressDotActive,
                index < currentPromptIndex && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>

        {/* Recording Circle */}
        <View style={styles.recordingContainer}>
          <TouchableOpacity
            onPress={!isRecording && !hasRecording ? startRecording : undefined}
            activeOpacity={!isRecording && !hasRecording ? 0.7 : 1}
            disabled={isRecording || hasRecording}
          >
            <Animated.View
              style={[
                styles.recordingCircle,
                isRecording && { transform: [{ scale: scaleAnim }] },
              ]}
            >
              {isRecording ? (
                <>
                  <View style={styles.recordingCircleInner}>
                    <Mic size={48} color="#FFFFFF" />
                  </View>
                  <View style={styles.recordingRing} />
                </>
              ) : (
                <Mic size={48} color="#475569" />
              )}
            </Animated.View>
          </TouchableOpacity>

          {isRecording && (
            <Text style={styles.timer}>{formatTime(recordingTime)}</Text>
          )}
        </View>

        {/* Prompt Card (tap to listen) */}
        <TouchableOpacity
          style={styles.promptCard}
          activeOpacity={0.8}
          onPress={() => speakPrompt(t(`prompts.${currentPrompt.id}`))}
        >
          <Volume2 size={24} color="#A855F7" style={styles.speakerIcon} />
          <View style={styles.promptContent}>
            <Text style={styles.promptLabel}>
              {t('voiceAnalysis.promptCount', { current: currentPromptIndex + 1, total: PROMPTS.length })}
            </Text>
            <Text style={styles.promptText}>{t(`prompts.${currentPrompt.id}`)}</Text>
            <Text style={styles.promptHint}>{t('voiceAnalysis.tapToHear')}</Text>
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {hasRecording && !isRecording && (
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => playRecording(currentPromptIndex)}
              activeOpacity={0.8}
            >
              <Play size={20} color="#64748B" fill="#64748B" />
              <Text style={styles.playButtonText}>{t('voiceAnalysis.playRecording')}</Text>
            </TouchableOpacity>
          )}

          {isRecording ? (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopRecording}
              activeOpacity={0.8}
            >
              <Square size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.stopButtonText}>{t('voiceAnalysis.stopRecording')}</Text>
            </TouchableOpacity>
          ) : isLastPrompt && hasRecording ? (
            <TouchableOpacity
              style={[styles.completeButton, isAnalyzing && styles.completeButtonDisabled]}
              onPress={handleCompleteTestWithResults}
              activeOpacity={0.8}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.completeButtonText}>{t('voiceAnalysis.analyzing')}</Text>
                </>
              ) : (
                <>
                  <Check size={20} color="#FFFFFF" />
                  <Text style={styles.completeButtonText}>{t('voiceAnalysis.completeTest')}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : hasRecording ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextPrompt}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>{t('voiceAnalysis.nextPrompt')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={startRecording}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>{t('voiceAnalysis.startRecording')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recordings Completed Section */}
        <View style={styles.completedSection}>
          <Text style={styles.completedText}>{t('voiceAnalysis.recordingsCompleted')}</Text>
          <Text style={styles.completedCount}>
            {completedRecordings}/{PROMPTS.length}
          </Text>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  backButton: {
    marginLeft: 8,
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  progressDotActive: {
    backgroundColor: '#A855F7',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: '#10B981',
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  recordingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  recordingCircleInner: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#A855F7',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  recordingRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#A855F7',
    opacity: 0.3,
  },
  timer: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 8,
  },
  promptCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  speakerIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  promptContent: {
    flex: 1,
  },
  promptLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 26,
  },
  promptHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#94A3B8',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextButton: {
    backgroundColor: '#14B8A6',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  nextButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextButtonTextDisabled: {
    color: '#94A3B8',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
  },
  completedText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  completedCount: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
});

