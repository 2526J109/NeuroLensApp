import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Globe, ChevronDown, Check, AlertCircle } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('GB English');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const languages = [
    { code: 'en', label: 'GB English', flag: 'GB' },
    { code: 'si', label: 'LK සිංහල', flag: 'LK' },
    { code: 'ta', label: 'LK தமிழ்', flag: 'LK' },
  ];

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Please fill out this field';
      setErrors(newErrors);
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      setErrors(newErrors);
      return false;
    }

    if (!password.trim()) {
      newErrors.password = 'Please fill out this field';
      setErrors(newErrors);
      return false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSignIn = () => {
    if (validateForm()) {
      console.log('Sign in pressed', { email, password });
      router.replace('/(tabs)');
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleCreateAccount = () => {
    router.push('/signup');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          <View style={styles.languageContainer}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
              activeOpacity={0.7}
            >
              <Globe size={16} color="#64748B" />
              <Text style={styles.languageText}>{selectedLanguage}</Text>
              <ChevronDown size={16} color="#64748B" />
            </TouchableOpacity>

            {showLanguageDropdown && (
              <>
                <TouchableWithoutFeedback
                  onPress={() => setShowLanguageDropdown(false)}
                >
                  <View style={styles.dropdownOverlay} />
                </TouchableWithoutFeedback>
                <View style={styles.languageDropdown}>
                  {languages.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={styles.languageOption}
                      onPress={() => {
                        setSelectedLanguage(lang.label);
                        setShowLanguageDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.languageOptionText}>{lang.label}</Text>
                      {selectedLanguage === lang.label && (
                        <Check size={16} color="#14B8A6" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

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
            <Text style={styles.appName}>NeuroLens</Text>
            <Text style={styles.welcomeText}>Welcome Back</Text>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
              </View>
              <View style={[
                styles.inputWrapper,
                focusedField === 'email' && styles.inputWrapperFocused
              ]}>
                <TextInput
                  style={[
                    styles.input,
                    Platform.OS === 'web' && { outline: 'none' as any }
                  ]}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) {
                      setErrors({ ...errors, email: undefined });
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.email && (
                <View style={styles.errorTooltip}>
                  <View style={styles.errorTooltipArrow} />
                  <View style={styles.errorTooltipContent}>
                    <View style={styles.errorIconContainer}>
                      <AlertCircle size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.errorTooltipText}>{errors.email}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Password</Text>
              </View>
              <View style={[styles.passwordContainer, focusedField === 'password' && styles.inputWrapperFocused]}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    Platform.OS === 'web' && { outline: 'none' as any }
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors({ ...errors, password: undefined });
                    }
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="none"
                  onFocus={() => {
                    setFocusedField('password');
                  }}
                  onBlur={() => {
                    setFocusedField(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748B" />
                  ) : (
                    <Eye size={20} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password && (
                <View style={styles.errorTooltip}>
                  <View style={styles.errorTooltipArrow} />
                  <View style={styles.errorTooltipContent}>
                    <View style={styles.errorIconContainer}>
                      <AlertCircle size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.errorTooltipText}>{errors.password}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.signInButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.createAccountSection}>
            <Text style={styles.createAccountText}>Don't have an account?</Text>
            <TouchableOpacity onPress={handleCreateAccount}>
              <Text style={styles.createAccountLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.disclaimerSection}>
            <Text style={styles.disclaimerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.disclaimerLink}>Terms of Service</Text>
              {'\n'}and{' '}
              <Text style={styles.disclaimerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  languageContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
    zIndex: 1000,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  languageDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 150,
    marginTop: 4,
    zIndex: 1000,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  languageOptionText: {
    fontSize: 14,
    color: '#0F172A',
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
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: '#14B8A6',
    borderWidth: 2,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: 'transparent',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
  },
  eyeIcon: {
    padding: 4,
  },
  signInButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14B8A6',
  },
  createAccountSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  createAccountText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  createAccountLink: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#14B8A6',
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
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  errorTooltip: {
    marginTop: 8,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  errorTooltipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  errorIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTooltipText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '400',
  },
  errorTooltipArrow: {
    position: 'absolute',
    top: -5,
    left: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F1F5F9',
  },
});