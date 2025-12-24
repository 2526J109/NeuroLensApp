import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';

interface Language {
  code: string;
  countryCode: string;
  nativeName: string;
  englishName: string;
}

const languages: Language[] = [
  { code: 'en', countryCode: 'GB', nativeName: 'English', englishName: 'English' },
  { code: 'si', countryCode: 'LK', nativeName: 'සිංහල', englishName: 'Sinhala' },
  { code: 'ta', countryCode: 'LK', nativeName: 'தமிழ்', englishName: 'Tamil' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  const handleContinue = () => {
    // TODO: Save selected language preference
    console.log('Selected language:', selectedLanguage);
    // Navigate to login screen
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <View style={styles.waveformContainer}>
                <View style={styles.waveform}>
                  <View style={[styles.waveBar, { height: 20 }]} />
                  <View style={[styles.waveBar, { height: 35 }]} />
                  <View style={[styles.waveBar, { height: 15 }]} />
                  <View style={[styles.waveBar, { height: 40 }]} />
                  <View style={[styles.waveBar, { height: 25 }]} />
                  <View style={[styles.waveBar, { height: 30 }]} />
                  <View style={[styles.waveBar, { height: 18 }]} />
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.welcomeTitle}>Welcome to NeuroLens</Text>
          <Text style={styles.welcomeSubtitle}>Your Health Companion</Text>
        </View>

        {/* Language Selection Section */}
        <View style={styles.languageSection}>
          <Text style={styles.languageTitle}>Select Your Preferred Language</Text>
          
          <View style={styles.languageGrid}>
            {languages.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageCard,
                    isSelected && styles.languageCardSelected
                  ]}
                  onPress={() => setSelectedLanguage(lang.code)}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <View style={styles.checkmarkContainer}>
                      <View style={styles.checkmarkCircle}>
                        <Check size={16} color="#14B8A6" />
                      </View>
                    </View>
                  )}
                  <Text style={styles.countryCode}>{lang.countryCode}</Text>
                  <Text style={styles.nativeName}>{lang.nativeName}</Text>
                  <Text style={styles.englishName}>{lang.englishName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        {/* Legal Disclaimer */}
        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.disclaimerLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.disclaimerLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0F2F1',
    borderWidth: 2,
    borderColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    width: 50,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#14B8A6',
    borderRadius: 2,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  languageSection: {
    marginBottom: 32,
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 24,
    textAlign: 'center',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  languageCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
    minHeight: 140,
    justifyContent: 'flex-start',
  },
  languageCardSelected: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
    borderWidth: 2,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  checkmarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0F2F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  nativeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  englishName: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  disclaimerSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  disclaimerLink: {
    color: '#14B8A6',
    textDecorationLine: 'underline',
  },
});

