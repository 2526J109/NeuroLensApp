import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle, Circle, PenLine, Mic, Brain, ArrowLeft } from 'lucide-react-native';
import { useDataCollection } from '@/contexts/DataCollectionContext';

const TASKS = [
  {
    id: 'drawing',
    label: 'Drawing Test',
    description: 'Spiral + wave drawing — captures motor tremor',
    icon: PenLine,
    route: '/drawing-test',
    color: '#F97316',
  },
  {
    id: 'voice',
    label: 'Voice Analysis',
    description: 'Sustained phonation + speech tasks',
    icon: Mic,
    route: '/voice-analysis',
    color: '#6366F1',
  },
  {
    id: 'cognitive',
    label: 'Cognitive Test',
    description: 'SDMT · TMT-A · Letter-Number Sequencing',
    icon: Brain,
    route: '/cognitive-test',
    color: '#14B8A6',
  },
] as const;

export default function TasksScreen() {
  const { activeParticipant, setActiveParticipant } = useDataCollection();
  const router = useRouter();

  useEffect(() => {
    if (!activeParticipant) {
      router.replace('/data-collection' as any);
    }
  }, [activeParticipant, router]);

  if (!activeParticipant) return null;

  const completed = activeParticipant.tasks_completed;
  const relevantDone = completed.filter(t => TASKS.some(task => task.id === t)).length;
  const allDone = TASKS.every(t => completed.includes(t.id));

  const handleTask = (task: typeof TASKS[number]) => {
    if (completed.includes(task.id)) {
      Alert.alert(
        'Already done',
        `${task.label} was already recorded. Re-run to overwrite?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Re-run', onPress: () => router.push(task.route as any) },
        ],
      );
    } else {
      router.push(task.route as any);
    }
  };

  const handleFinish = () => {
    Alert.alert(
      'Session complete',
      `All tasks done for ${activeParticipant.participant_code}. Go back to participant list?`,
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Finish',
          onPress: () => {
            setActiveParticipant(null);
            router.replace('/data-collection' as any);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Participant banner */}
        <View style={styles.banner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              setActiveParticipant(null);
              router.replace('/data-collection' as any);
            }}
          >
            <ArrowLeft size={18} color="#64748B" />
          </TouchableOpacity>
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerCode}>{activeParticipant.participant_code}</Text>
            <Text style={styles.bannerMeta}>
              {activeParticipant.pd_status === 'pd' ? "Parkinson\u2019s" : 'Healthy Control'}
              {' · '}{activeParticipant.age}y{' · '}{activeParticipant.gender}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: activeParticipant.pd_status === 'pd' ? '#FFF7ED' : '#F0FDF4' },
          ]}>
            <Text style={[
              styles.statusBadgeText,
              { color: activeParticipant.pd_status === 'pd' ? '#F97316' : '#10B981' },
            ]}>
              {activeParticipant.pd_status === 'pd' ? 'PD' : 'HC'}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>{relevantDone} / {TASKS.length} tasks complete</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(relevantDone / TASKS.length) * 100}%` as any }]} />
          </View>
        </View>

        {/* Task cards */}
        {TASKS.map(task => {
          const done = completed.includes(task.id);
          const Icon = task.icon;
          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.card, done && styles.cardDone]}
              onPress={() => handleTask(task)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: task.color + '18' }]}>
                <Icon size={22} color={done ? '#10B981' : task.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardLabel, done && styles.cardLabelDone]}>{task.label}</Text>
                <Text style={styles.cardDesc}>{task.description}</Text>
              </View>
              {done
                ? <CheckCircle size={22} color="#10B981" />
                : <Circle size={22} color="#CBD5E1" />}
            </TouchableOpacity>
          );
        })}

        {allDone && (
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
            <Text style={styles.finishBtnText}>Finish Session</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:          { padding: 24 },
  banner:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  backBtn:         { padding: 4 },
  bannerInfo:      { flex: 1 },
  bannerCode:      { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  bannerMeta:      { fontSize: 12, color: '#64748B', marginTop: 2 },
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  progressRow:     { marginBottom: 20 },
  progressText:    { fontSize: 13, color: '#94A3B8', marginBottom: 8 },
  progressTrack:   { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3 },
  progressFill:    { height: 6, backgroundColor: '#14B8A6', borderRadius: 3 },
  card:            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, gap: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  cardDone:        { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  iconWrap:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody:        { flex: 1 },
  cardLabel:       { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cardLabelDone:   { color: '#94A3B8' },
  cardDesc:        { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  finishBtn:       { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  finishBtnText:   { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
