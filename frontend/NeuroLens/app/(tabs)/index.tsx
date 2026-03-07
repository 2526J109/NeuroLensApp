import React from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Watch,
  Mic,
  PenTool,
  Brain,
} from 'lucide-react-native';

import { Header } from '@/components/Header';
import { ProgressCard } from '@/components/ProgressCard';
import { AssessmentTestItem } from '@/components/AssessmentTestItem';
import { TipCard } from '@/components/TipCard';

import { useRouter } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header />

        <ProgressCard />

        <Text style={styles.sectionTitle}>{t('home.assessmentTests')}</Text>

        <AssessmentTestItem
          title={t('home.tests.wearable.title')}
          description={t('home.tests.wearable.description')}
          icon={Watch}
          color="#14B8A6" // Teal
          isCompleted={true}
          onPress={() => router.push('/wearable')}
        />

        <AssessmentTestItem
          title={t('home.tests.voice.title')}
          description={t('home.tests.voice.description')}
          icon={Mic}
          color="#A855F7" // Purple
          isCompleted={false}
          onPress={() => router.push('/voice-analysis')}
        />

        <AssessmentTestItem
          title={t('home.tests.drawing.title')}
          description={t('home.tests.drawing.description')}
          icon={PenTool}
          color="#F97316" // Orange
          isCompleted={false}
          onPress={() => router.push('/drawing-test')}
        />

        <AssessmentTestItem
          title={t('home.tests.cognitive.title')}
          description={t('home.tests.cognitive.description')}
          icon={Brain}
          color="#10B981" // Green
          isCompleted={false}
          onPress={() => router.push('/cognitive-test')}
        />

        <TipCard />

        {/* Bottom padding for tab bar */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate 50
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
});
