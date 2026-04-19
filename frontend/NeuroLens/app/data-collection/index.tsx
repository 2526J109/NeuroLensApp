import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, User, CheckCircle, LogOut, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCollection, Participant } from '@/contexts/DataCollectionContext';
import { listParticipants } from '@/services/adminService';

export default function DataCollectionHome() {
  const { user, logout } = useAuth();
  const { setActiveParticipant } = useDataCollection();
  const router = useRouter();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = await user!.getIdToken();
      const list = await listParticipants(token);
      setParticipants(list);
    } catch (e) {
      console.error('[DataCollection] Failed to load participants', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSelect = (p: Participant) => {
    setActiveParticipant(p);
    router.push('/data-collection/tasks' as any);
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  const allDone = (p: Participant) =>
    ['drawing', 'voice', 'cognitive'].every(t => p.tasks_completed.includes(t));

  const renderParticipant = ({ item }: { item: Participant }) => {
    const done = allDone(item);
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)} activeOpacity={0.7}>
        <View style={[styles.statusDot, done ? styles.dotGreen : styles.dotAmber]} />
        <View style={styles.cardBody}>
          <Text style={styles.code}>{item.participant_code}</Text>
          <Text style={styles.meta}>
            {item.pd_status === 'pd' ? "Parkinson\u2019s" : 'Healthy Control'} · {item.age}y · {item.gender}
          </Text>
          <Text style={styles.tasks}>
            {['drawing', 'voice', 'cognitive'].filter(t => item.tasks_completed.includes(t)).length}/3 tasks done
          </Text>
        </View>
        {done
          ? <CheckCircle size={20} color="#10B981" />
          : <ChevronRight size={20} color="#CBD5E1" />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Data Collection</Text>
          <Text style={styles.headerSub}>Admin Mode</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{participants.length}</Text>
          <Text style={styles.statLab}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{participants.filter(allDone).length}</Text>
          <Text style={styles.statLab}>Complete</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{participants.filter(p => p.pd_status === 'pd').length}</Text>
          <Text style={styles.statLab}>PD</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{participants.filter(p => p.pd_status === 'control').length}</Text>
          <Text style={styles.statLab}>HC</Text>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#14B8A6" size="large" />
      ) : (
        <FlatList
          data={participants}
          keyExtractor={p => p.id}
          renderItem={renderParticipant}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <User size={40} color="#CBD5E1" />
              <Text style={styles.emptyText}>No participants yet</Text>
              <Text style={styles.emptyHint}>Tap + to register the first participant</Text>
            </View>
          }
          onRefresh={load}
          refreshing={loading}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/data-collection/new-participant' as any)}
        activeOpacity={0.85}
      >
        <Plus size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  headerSub:    { fontSize: 12, color: '#14B8A6', fontWeight: '600', marginTop: 2 },
  logoutBtn:    { padding: 8 },
  statRow:      { flexDirection: 'row', marginHorizontal: 24, marginVertical: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  stat:         { flex: 1, alignItems: 'center' },
  statVal:      { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  statLab:      { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statDivider:  { width: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  list:         { paddingHorizontal: 24, paddingBottom: 100 },
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  statusDot:    { width: 10, height: 10, borderRadius: 5 },
  dotGreen:     { backgroundColor: '#10B981' },
  dotAmber:     { backgroundColor: '#F59E0B' },
  cardBody:     { flex: 1 },
  code:         { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  meta:         { fontSize: 12, color: '#64748B', marginTop: 2 },
  tasks:        { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  empty:        { alignItems: 'center', marginTop: 80, gap: 10 },
  emptyText:    { fontSize: 18, fontWeight: '600', color: '#94A3B8' },
  emptyHint:    { fontSize: 13, color: '#CBD5E1' },
  fab:          { position: 'absolute', bottom: 32, right: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: '#14B8A6', alignItems: 'center', justifyContent: 'center', elevation: 6 },
});
