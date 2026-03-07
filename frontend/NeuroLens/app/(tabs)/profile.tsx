import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Mail,
  User as UserIcon,
  Calendar,
  Bell,
  Shield,
  LogOut,
  ArrowLeft,
  Globe,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, userProfile, logout } = useAuth();
  const { locale, changeLanguage, t } = useLanguage();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dataPrivacyMode, setDataPrivacyMode] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const handleSignOut = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handlePrivacySecurity = () => {
    // TODO: Navigate to privacy & security screen
    console.log('Privacy & Security pressed');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Avatar and Info */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>
                  {userProfile?.full_name
                    ? userProfile.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                    : user?.email?.substring(0, 2).toUpperCase() || t('profile.na')[0]}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.userName}>{userProfile?.full_name || t('home.welcomeBack')}</Text>
          <Text style={styles.patientId}>{t('profile.patientId')}: {userProfile?.id || t('profile.na')}</Text>
        </View>

        {/* Personal Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.personalInfo')}</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Mail size={20} color="#14B8A6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.email')}</Text>
              <Text style={styles.infoValue}>{user?.email || userProfile?.email || t('profile.na')}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <UserIcon size={20} color="#14B8A6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.gender')}</Text>
              <Text style={styles.infoValue}>{userProfile?.gender ? t(`auth.genderOptions.${userProfile.gender}`) : t('profile.na')}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Calendar size={20} color="#14B8A6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t('profile.dob')}</Text>
              <Text style={styles.infoValue}>{userProfile?.birthday || t('profile.na')}</Text>
            </View>
          </View>
        </View>

        {/* Settings Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.settings')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Bell size={20} color="#64748B" style={styles.settingIcon} />
              <Text style={styles.settingLabel}>{t('profile.pushNotifications')}</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: '#E2E8F0', true: '#14B8A6' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E2E8F0"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Shield size={20} color="#64748B" style={styles.settingIcon} />
              <Text style={styles.settingLabel}>{t('profile.dataPrivacyMode')}</Text>
            </View>
            <Switch
              value={dataPrivacyMode}
              onValueChange={setDataPrivacyMode}
              trackColor={{ false: '#E2E8F0', true: '#14B8A6' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E2E8F0"
            />
          </View>

          {/* Language Switcher */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <Globe size={20} color="#64748B" style={styles.settingIcon} />
              <Text style={styles.settingLabel}>{t('profile.language')}</Text>
            </View>
            <Text style={styles.currentLanguageValue}>
              {t(`profile.languages.${locale}`)}
            </Text>
          </TouchableOpacity>

          {showLanguagePicker && (
            <View style={styles.languageOptionsContainer}>
              {['en', 'si', 'ta'].map((langCode) => (
                <TouchableOpacity
                  key={langCode}
                  style={[
                    styles.languageOption,
                    locale === langCode && styles.languageOptionActive
                  ]}
                  onPress={() => {
                    changeLanguage(langCode);
                    setShowLanguagePicker(false);
                  }}
                >
                  <Text style={[
                    styles.languageOptionText,
                    locale === langCode && styles.languageOptionTextActive
                  ]}>
                    {t(`profile.languages.${langCode}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

        </View>

        {/* Privacy & Security Button */}
        <TouchableOpacity
          style={styles.privacyButton}
          onPress={handlePrivacySecurity}
          activeOpacity={0.8}
        >
          <Shield size={20} color="#14B8A6" />
          <Text style={styles.privacyButtonText}>{t('profile.privacyAndSecurity')}</Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <LogOut size={20} color="#FFFFFF" />
          <Text style={styles.signOutButtonText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'left',
  },
  scrollContent: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#14B8A6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  patientId: {
    fontSize: 14,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#64748B',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  currentLanguageValue: {
    fontSize: 14,
    color: '#14B8A6',
    fontWeight: '600',
  },
  languageOptionsContainer: {
    marginTop: -10,
    marginBottom: 20,
    paddingLeft: 32,
    gap: 12,
  },
  languageOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageOptionActive: {
    backgroundColor: '#F0FDFA',
    borderColor: '#14B8A6',
  },
  languageOptionText: {
    fontSize: 14,
    color: '#64748B',
  },
  languageOptionTextActive: {
    color: '#14B8A6',
    fontWeight: '600',
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  privacyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
