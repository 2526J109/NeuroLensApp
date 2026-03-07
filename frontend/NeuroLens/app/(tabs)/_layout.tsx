import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { House, Clock, Activity, User } from 'lucide-react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#14B8A6', // Teal 500 for active state matching design
        tabBarInactiveTintColor: '#94A3B8', // Slate 400
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: Colors[colorScheme ?? 'light'].background, // Use theme background
          },
          default: {
            backgroundColor: Colors[colorScheme ?? 'light'].background,
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <House size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="results"
        options={{
          title: t('tabs.results'),
          tabBarIcon: ({ color }) => <Activity size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />

      {/* Hide the explore tab if it still exists in file system */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
