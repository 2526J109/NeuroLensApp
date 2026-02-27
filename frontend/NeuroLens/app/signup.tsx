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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, ArrowLeft, Globe, ChevronDown, Check, AlertCircle, Calendar } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('GB English');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    birthday?: string;
    gender?: string;
    handedness?: string;
  }>({});

  // New fields
  const [gender, setGender] = useState<string>('');
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [birthday, setBirthday] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [handedness, setHandedness] = useState<string>('');
  const [showHandednessDropdown, setShowHandednessDropdown] = useState(false);

  // Dynamic z-index for dropdowns
  const [dropdownZIndex, setDropdownZIndex] = useState(100);

  const genderOptions = ['Male', 'Female', 'Prefer not to say'];
  const handednessOptions = ['Left', 'Right'];

  const languages = [
    { code: 'en', label: 'GB English', flag: 'GB' },
    { code: 'si', label: 'LK සිංහල', flag: 'LK' },
    { code: 'ta', label: 'LK தமிழ்', flag: 'LK' },
  ];

  const validateForm = () => {
    const newErrors: {
      fullName?: string;
      email?: string;
      password?: string;
      birthday?: string;
      gender?: string;
      handedness?: string;
    } = {};

    // Validate full name first
    if (!fullName.trim()) {
      newErrors.fullName = 'Please fill out this field';
      setErrors(newErrors);
      return false;
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
      setErrors(newErrors);
      return false;
    }

    // Only validate email if full name is valid
    if (!email.trim()) {
      newErrors.email = 'Please fill out this field';
      setErrors(newErrors);
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      setErrors(newErrors);
      return false;
    }

    // Only validate password if email is valid
    if (!password.trim()) {
      newErrors.password = 'Please fill out this field';
      setErrors(newErrors);
      return false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      setErrors(newErrors);
      return false;
    }

    // Validate gender
    if (!gender) {
      newErrors.gender = 'Please select your gender';
      setErrors(newErrors);
      return false;
    }

    // Validate birthday
    if (!birthday.trim()) {
      newErrors.birthday = 'Please enter your birthday';
      setErrors(newErrors);
      return false;
    } else {
      // Validate date format (YYYY-MM-DD or DD/MM/YYYY)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(birthday)) {
        newErrors.birthday = 'Please enter a valid date (YYYY-MM-DD)';
        setErrors(newErrors);
        return false;
      }
      // Validate that date is in the past and reasonable
      const date = new Date(birthday);
      const today = new Date();
      const minDate = new Date('1900-01-01');
      if (isNaN(date.getTime()) || date > today || date < minDate) {
        newErrors.birthday = 'Please enter a valid date of birth';
        setErrors(newErrors);
        return false;
      }
    }

    // Validate handedness
    if (!handedness) {
      newErrors.handedness = 'Please select your handedness';
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleCreateAccount = async () => {
    if (validateForm()) {
      setLoading(true);
      try {
        await signUp(email, password, fullName);
        
        Toast.show({
          type: 'success',
          text1: 'Registration Successful!',
          text2: 'Your account has been created.',
          position: 'top',
          visibilityTime: 3000,
          topOffset: 60,
          onHide: () => {
            router.replace('/login');
          }
        });
        
      } catch (error: any) {
        const errorMessage = error.message || 'An error occurred during registration. Please try again.';
        
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: errorMessage,
          position: 'top',
          visibilityTime: 4000,
          topOffset: 60,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleBack = () => {
    router.back();
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
          {/* Language Selector */}
          <View style={styles.languageContainer}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => {
                setShowLanguageDropdown(!showLanguageDropdown);
                setShowGenderDropdown(false);
                setShowHandednessDropdown(false);
              }}
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

          {/* Back Button */}
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>

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
            <Text style={styles.appName}>NeuroLens</Text>
            <Text style={styles.welcomeText}>Create Your Account</Text>
          </View>

          {/* Input Fields */}
          <View style={styles.inputSection}>
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
              </View>
              <View style={[
                styles.inputWrapper,
                focusedField === 'fullName' && styles.inputWrapperFocused
              ]}>
                <TextInput
                  style={[
                    styles.input,
                    Platform.OS === 'web' && { outline: 'none' as any }
                  ]}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName) {
                      setErrors({ ...errors, fullName: undefined });
                    }
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.fullName && (
                <View style={styles.errorTooltip}>
                  <View style={styles.errorTooltipArrow} />
                  <View style={styles.errorTooltipContent}>
                    <View style={styles.errorIconContainer}>
                      <AlertCircle size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.errorTooltipText}>{errors.fullName}</Text>
                  </View>
                </View>
              )}
            </View>

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

            {/* Birthday Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Birthday</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.inputWrapper,
                  styles.dateInputWrapper,
                  focusedField === 'birthday' && styles.inputWrapperFocused,
                  errors.birthday && styles.inputWrapperError
                ]}
                onPress={() => {
                  if (birthday) {
                    const date = new Date(birthday);
                    if (!isNaN(date.getTime())) {
                      setSelectedDate(date);
                    }
                  }
                  setShowDatePicker(true);
                  setShowGenderDropdown(false);
                  setShowHandednessDropdown(false);
                  setShowLanguageDropdown(false);
                  setFocusedField('birthday');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateInputText, !birthday && styles.dropdownPlaceholder]}>
                  {birthday || 'Select your birthday'}
                </Text>
                <Calendar size={20} color="#64748B" style={{ marginRight: 4 }} />
              </TouchableOpacity>
              {errors.birthday && (
                <View style={styles.errorTooltip}>
                  <View style={styles.errorTooltipArrow} />
                  <View style={styles.errorTooltipContent}>
                    <View style={styles.errorIconContainer}>
                      <AlertCircle size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.errorTooltipText}>{errors.birthday}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Gender Field */}
            <View style={[styles.inputGroup, showGenderDropdown && { zIndex: 1000 }]}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Gender</Text>
              </View>
              <View style={[styles.dropdownContainer, showGenderDropdown && { zIndex: 1000 }]}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    focusedField === 'gender' && styles.inputWrapperFocused,
                    errors.gender && styles.inputWrapperError
                  ]}
                  onPress={() => {
                    const isOpening = !showGenderDropdown;
                    setShowGenderDropdown(isOpening);
                    setShowHandednessDropdown(false);
                    setShowLanguageDropdown(false);
                    setShowDatePicker(false);
                    setFocusedField(isOpening ? 'gender' : null);
                    if (isOpening) {
                      setDropdownZIndex(1000);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownButtonText, !gender && styles.dropdownPlaceholder]}>
                    {gender || 'Select your gender'}
                  </Text>
                  <ChevronDown size={20} color="#64748B" />
                </TouchableOpacity>

                {showGenderDropdown && (
                  <>
                    <TouchableWithoutFeedback
                      onPress={() => {
                        setShowGenderDropdown(false);
                        setFocusedField(null);
                      }}
                    >
                      <View style={[styles.dropdownOverlay, { zIndex: dropdownZIndex - 1 }]} />
                    </TouchableWithoutFeedback>
                    <View style={[styles.dropdownMenu, { zIndex: dropdownZIndex }]}>
                      {genderOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={styles.dropdownOption}
                          onPress={() => {
                            setGender(option);
                            setShowGenderDropdown(false);
                            setFocusedField(null);
                            if (errors.gender) {
                              setErrors({ ...errors, gender: undefined });
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dropdownOptionText}>{option}</Text>
                          {gender === option && (
                            <Check size={16} color="#14B8A6" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
              {errors.gender && (
                <View style={styles.errorTooltip}>
                  <View style={styles.errorTooltipArrow} />
                  <View style={styles.errorTooltipContent}>
                    <View style={styles.errorIconContainer}>
                      <AlertCircle size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.errorTooltipText}>{errors.gender}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Handedness Field */}
            <View style={[styles.inputGroup, showHandednessDropdown && { zIndex: 1001 }]}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Handedness</Text>
              </View>
              <View style={[styles.dropdownContainer, showHandednessDropdown && { zIndex: 1001 }]}>
                <TouchableOpacity
                  style={[
                    styles.dropdownButton,
                    focusedField === 'handedness' && styles.inputWrapperFocused,
                    errors.handedness && styles.inputWrapperError
                  ]}
                  onPress={() => {
                    const isOpening = !showHandednessDropdown;
                    setShowHandednessDropdown(isOpening);
                    setShowGenderDropdown(false);
                    setShowLanguageDropdown(false);
                    setShowDatePicker(false);
                    setFocusedField(isOpening ? 'handedness' : null);
                    if (isOpening) {
                      setDropdownZIndex(1001);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownButtonText, !handedness && styles.dropdownPlaceholder]}>
                    {handedness || 'Select left or right hand'}
                  </Text>
                  <ChevronDown size={20} color="#64748B" />
                </TouchableOpacity>

                {showHandednessDropdown && (
                  <>
                    <TouchableWithoutFeedback
                      onPress={() => {
                        setShowHandednessDropdown(false);
                        setFocusedField(null);
                      }}
                    >
                      <View style={[styles.dropdownOverlay, { zIndex: dropdownZIndex - 1 }]} />
                    </TouchableWithoutFeedback>
                    <View style={[styles.dropdownMenu, { zIndex: dropdownZIndex }]}>
                      {handednessOptions.map((option) => (
                        <TouchableOpacity
                          key={option}
                          style={styles.dropdownOption}
                          onPress={() => {
                            setHandedness(option);
                            setShowHandednessDropdown(false);
                            setFocusedField(null);
                            if (errors.handedness) {
                              setErrors({ ...errors, handedness: undefined });
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dropdownOptionText}>{option} Hand</Text>
                          {handedness === option && (
                            <Check size={16} color="#14B8A6" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
              {errors.handedness && (
                <View style={styles.errorTooltip}>
                  <View style={styles.errorTooltipArrow} />
                  <View style={styles.errorTooltipContent}>
                    <View style={styles.errorIconContainer}>
                      <AlertCircle size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.errorTooltipText}>{errors.handedness}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.inputLabel}>Password</Text>
              </View>
              <View style={[
                styles.passwordContainer,
                focusedField === 'password' && styles.inputWrapperFocused
              ]}>
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
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
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

          {/* Date Picker Modal */}
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.datePickerModal}>
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerTitle}>Select Birthday</Text>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                        style={styles.datePickerCloseButton}
                      >
                        <Text style={styles.datePickerCloseText}>Done</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.datePickerContent}>
                      {/* Year Picker */}
                      <View style={styles.datePickerColumn}>
                        <Text style={styles.datePickerLabel}>Year</Text>
                        <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                          {Array.from({ length: 100 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
                            return (
                              <TouchableOpacity
                                key={year}
                                style={[
                                  styles.datePickerOption,
                                  selectedDate.getFullYear() === year && styles.datePickerOptionSelected
                                ]}
                                onPress={() => {
                                  const newDate = new Date(selectedDate);
                                  newDate.setFullYear(year);
                                  setSelectedDate(newDate);
                                }}
                              >
                                <Text style={[
                                  styles.datePickerOptionText,
                                  selectedDate.getFullYear() === year && styles.datePickerOptionTextSelected
                                ]}>
                                  {year}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* Month Picker */}
                      <View style={styles.datePickerColumn}>
                        <Text style={styles.datePickerLabel}>Month</Text>
                        <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.datePickerOption,
                                selectedDate.getMonth() === index && styles.datePickerOptionSelected
                              ]}
                              onPress={() => {
                                const newDate = new Date(selectedDate);
                                newDate.setMonth(index);
                                setSelectedDate(newDate);
                              }}
                            >
                              <Text style={[
                                styles.datePickerOptionText,
                                selectedDate.getMonth() === index && styles.datePickerOptionTextSelected
                              ]}>
                                {month}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      {/* Day Picker */}
                      <View style={styles.datePickerColumn}>
                        <Text style={styles.datePickerLabel}>Day</Text>
                        <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                          {Array.from({ length: 31 }, (_, i) => {
                            const day = i + 1;
                            const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                            if (day > daysInMonth) return null;
                            return (
                              <TouchableOpacity
                                key={day}
                                style={[
                                  styles.datePickerOption,
                                  selectedDate.getDate() === day && styles.datePickerOptionSelected
                                ]}
                                onPress={() => {
                                  const newDate = new Date(selectedDate);
                                  newDate.setDate(day);
                                  setSelectedDate(newDate);
                                }}
                              >
                                <Text style={[
                                  styles.datePickerOptionText,
                                  selectedDate.getDate() === day && styles.datePickerOptionTextSelected
                                ]}>
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.datePickerConfirmButton}
                      onPress={() => {
                        const formattedDate = selectedDate.toISOString().split('T')[0];
                        setBirthday(formattedDate);
                        setShowDatePicker(false);
                        setFocusedField(null);
                        if (errors.birthday) {
                          setErrors({ ...errors, birthday: undefined });
                        }
                      }}
                    >
                      <Text style={styles.datePickerConfirmText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.createAccountButton, loading && styles.createAccountButtonDisabled]}
            onPress={handleCreateAccount}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createAccountButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Sign In Section */}
          <View style={styles.signInSection}>
            <Text style={styles.signInText}>Already have an account?</Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text style={styles.signInLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

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
    paddingTop: 20,
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
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
  dropdownContainer: {
    position: 'relative',
    zIndex: 1,
  },
  dateInputText: {
    fontSize: 16,
    color: '#0F172A',
    flex: 1,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#0F172A',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#94A3B8',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#0F172A',
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
  backButton: {
    padding: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
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
    zIndex: 1,
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
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
    flex: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
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
  createAccountButton: {
    backgroundColor: '#14B8A6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  createAccountButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  createAccountButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  signInSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  signInText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  signInLink: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '70%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  datePickerCloseButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  datePickerCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14B8A6',
  },
  datePickerContent: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    height: 300,
  },
  datePickerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  datePickerScroll: {
    flex: 1,
  },
  datePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 2,
    alignItems: 'center',
  },
  datePickerOptionSelected: {
    backgroundColor: '#E0F2F1',
  },
  datePickerOptionText: {
    fontSize: 16,
    color: '#64748B',
  },
  datePickerOptionTextSelected: {
    color: '#14B8A6',
    fontWeight: '600',
  },
  datePickerConfirmButton: {
    backgroundColor: '#14B8A6',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

