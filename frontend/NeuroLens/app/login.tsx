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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Globe, ChevronDown, Check, AlertCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { locale, changeLanguage, t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const languages = [
    { code: 'en', label: 'GB English', flag: 'GB' },
    { code: 'si', label: 'LK සිංහල', flag: 'LK' },
    { code: 'ta', label: 'LK தமிழ்', flag: 'LK' },
  ];

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = t('auth.validation.fillField');
      setErrors(newErrors);
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.validation.validEmail');
      setErrors(newErrors);
      return false;
    }

    if (!password.trim()) {
      newErrors.password = t('auth.validation.fillField');
      setErrors(newErrors);
      return false;
    } else if (password.length < 8) {
      newErrors.password = t('auth.validation.passwordLength');
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSignIn = async () => {
    if (validateForm()) {
      setLoading(true);
      try {
        await signIn(email, password);

        // Show success toast
        Toast.show({
          type: 'success',
          text1: t('auth.loginSuccessful'),
          text2: t('auth.welcomeToNeuroLens'),
          position: 'top',
          visibilityTime: 2000,
          topOffset: 60,
        });

        // Redirect to home
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 500);
      } catch (error: any) {
        // Show error toast
        Toast.show({
          type: 'error',
          text1: t('auth.loginFailed'),
          text2: error.message || t('auth.checkCredentials'),
          position: 'top',
          visibilityTime: 4000,
          topOffset: 60,
        });
      } finally {
        setLoading(false);
      }
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
              <Text style={styles.languageText}>{languages.find(l => l.code === locale)?.label || 'GB English'}</Text>
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
                        changeLanguage(lang.code);
                        setShowLanguageDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.languageOptionText}>{lang.label}</Text>
                      {locale === lang.code && (
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
            <Text style={styles.welcomeText}>{t('auth.welcomeBack')}</Text>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>{t('auth.emailAddress')}</Text>
              </View>
              {/* Wrapper — position:relative so the focus ring can overlay it */}
              <View style={styles.inputWrapper}>
                {/* Absolutely-positioned focus ring — opacity-only change, zero layout impact */}
                <View style={[
                  styles.focusRing,
                  { opacity: focusedField === 'email' ? 1 : 0 }
                ]} pointerEvents="none" />
                <TextInput
                  style={[
                    styles.input,
                    Platform.OS === 'web' && { outline: 'none' as any }
                  ]}
                  placeholder={t('auth.enterEmail')}
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
                <Text style={styles.inputLabel}>{t('auth.password')}</Text>
              </View>
              {/* Outer wrapper — static styles only, no conditional layout changes */}
              <View style={styles.passwordContainer}>
                {/* Absolutely-positioned focus ring — opacity only, zero layout impact */}
                <View style={[
                  styles.focusRing,
                  { opacity: focusedField === 'password' ? 1 : 0 }
                ]} pointerEvents="none" />
                {showPassword ? (
                  <TextInput
                    style={[
                      styles.passwordInput,
                      Platform.OS === 'web' && { outline: 'none' as any }
                    ]}
                    placeholder={t('auth.enterPassword')}
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    secureTextEntry={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textContentType="password"
                    keyboardType="ascii-capable"
                    onFocus={() => {
                      setFocusedField('password');
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                    }}
                  />
                ) : (
                  <TextInput
                    style={[
                      styles.passwordInput,
                      Platform.OS === 'web' && { outline: 'none' as any }
                    ]}
                    placeholder={t('auth.enterPassword')}
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    secureTextEntry={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textContentType="password"
                    keyboardType="ascii-capable"
                    onFocus={() => {
                      setFocusedField('password');
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                    }}
                  />
                )}
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
            style={[styles.signInButton, loading && styles.signInButtonDisabled]}
            onPress={handleSignIn}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signInButtonText}>{t('auth.signIn')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          <View style={styles.createAccountSection}>
            <Text style={styles.createAccountText}>{t('auth.dontHaveAccount')}</Text>
            <TouchableOpacity onPress={handleCreateAccount}>
              <Text style={styles.createAccountLink}>{t('auth.createAccount')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.disclaimerSection}>
            <Text style={styles.disclaimerText}>
              {t('auth.byContinuing')} <Text style={styles.disclaimerLink}>{t('auth.termsOfService')}</Text>
              {'\n'}{t('auth.and')} <Text style={styles.disclaimerLink}>{t('auth.privacyPolicy')}</Text>
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
  },
  // Absolutely-positioned border overlay — toggled via opacity (not layout props)
  // so iOS never triggers a layout pass that blurs the focused TextInput
  focusRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#14B8A6',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1,
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
  signInButtonDisabled: {
    backgroundColor: '#94A3B8',
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