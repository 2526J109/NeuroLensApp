import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';

import '@/utils/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { toastConfig } from '@/constants/toastConfig';
import { LanguageProvider } from '@/contexts/LanguageContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="voice-test-results" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
          <Toast config={toastConfig} />
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
