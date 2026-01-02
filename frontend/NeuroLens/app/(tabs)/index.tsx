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

export default function HomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header />

        <ProgressCard />

        <Text style={styles.sectionTitle}>Assessment Tests</Text>

        <AssessmentTestItem
          title="Wearable Device"
          description="Connect & collect movement data"
          icon={Watch}
          color="#14B8A6" // Teal
          isCompleted={true}
          onPress={() => router.push('/wearable')}
        />

        <AssessmentTestItem
          title="Voice Analysis"
          description="Record voice samples"
          icon={Mic}
          color="#A855F7" // Purple
          isCompleted={false}
          onPress={() => router.push('/voice-analysis')}
        />

        <AssessmentTestItem
          title="Drawing Test"
          description="Trace patterns & shapes"
          icon={PenTool}
          color="#F97316" // Orange
          isCompleted={false}
          onPress={() => router.push('/drawing-test')}
        />

        <AssessmentTestItem
          title="Brain Games"
          description="Cognitive activity tests"
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
