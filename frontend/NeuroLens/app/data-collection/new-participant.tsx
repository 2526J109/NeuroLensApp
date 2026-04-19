import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useDataCollection } from '@/contexts/DataCollectionContext';
import { createParticipant } from '@/services/adminService';

type Gender = 'male' | 'female' | 'other';
type Hand = 'right' | 'left' | 'ambidextrous';
type PDStatus = 'pd' | 'control';

function Chip<T extends string>({
  value, current, label, onPress, activeColor,
}: { value: T; current: T; label: string; onPress: (v: T) => void; activeColor?: string }) {
  const active = value === current;
  const color = activeColor ?? '#14B8A6';
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: color + '18', borderColor: color }]}
      onPress={() => onPress(value)}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function NewParticipantScreen() {
  const { user } = useAuth();
  const { setActiveParticipant } = useDataCollection();
  const router = useRouter();

  const [code, setCode]           = useState('');
  const [age, setAge]             = useState('');
  const [gender, setGender]       = useState<Gender>('male');
  const [hand, setHand]           = useState<Hand>('right');
  const [pdStatus, setPdStatus]   = useState<PDStatus>('control');
  const [updrs, setUpdrs]         = useState('');
  const [yearsDx, setYearsDx]     = useState('');
  const [medication, setMedication] = useState('');
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);

  const canSave = code.trim().length > 0 && age.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const token = await user!.getIdToken();
      const participant = await createParticipant(token, {
        participant_code:       code.trim().toUpperCase(),
        age:                    parseInt(age, 10),
        gender,
        handedness:             hand,
        pd_status:              pdStatus,
        updrs_score:            updrs ? parseFloat(updrs) : undefined,
        years_since_diagnosis:  yearsDx ? parseFloat(yearsDx) : undefined,
        medication_status:      medication.trim() || undefined,
        notes:                  notes.trim() || undefined,
      });
      setActiveParticipant(participant);
      router.replace('/data-collection/tasks' as any);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create participant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <Text style={styles.section}>Required</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Participant Code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="e.g. PD001 or HC003"
              placeholderTextColor="#CBD5E1"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Age</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 65"
              placeholderTextColor="#CBD5E1"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.chips}>
              <Chip value="male"   current={gender} label="Male"   onPress={setGender} />
              <Chip value="female" current={gender} label="Female" onPress={setGender} />
              <Chip value="other"  current={gender} label="Other"  onPress={setGender} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Dominant Hand</Text>
            <View style={styles.chips}>
              <Chip value="right"        current={hand} label="Right"        onPress={setHand} />
              <Chip value="left"         current={hand} label="Left"         onPress={setHand} />
              <Chip value="ambidextrous" current={hand} label="Ambidextrous" onPress={setHand} />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Diagnosis Status</Text>
            <View style={styles.chips}>
              <Chip value="pd"      current={pdStatus} label="Parkinson's"    onPress={setPdStatus} activeColor="#F97316" />
              <Chip value="control" current={pdStatus} label="Healthy Control" onPress={setPdStatus} activeColor="#10B981" />
            </View>
          </View>

          {pdStatus === 'pd' && (
            <>
              <Text style={styles.section}>PD Details (optional)</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>UPDRS Score</Text>
                <TextInput style={styles.input} value={updrs} onChangeText={setUpdrs} placeholder="e.g. 24.5" placeholderTextColor="#CBD5E1" keyboardType="decimal-pad" />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Years Since Diagnosis</Text>
                <TextInput style={styles.input} value={yearsDx} onChangeText={setYearsDx} placeholder="e.g. 3.5" placeholderTextColor="#CBD5E1" keyboardType="decimal-pad" />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Medication</Text>
                <TextInput style={styles.input} value={medication} onChangeText={setMedication} placeholder="e.g. Levodopa 100mg" placeholderTextColor="#CBD5E1" />
              </View>
            </>
          )}

          <Text style={styles.section}>Notes (optional)</Text>
          <View style={styles.field}>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes..."
              placeholderTextColor="#CBD5E1"
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, !canSave && styles.btnDisabled]}
            onPress={handleSave}
            disabled={!canSave || saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.btnText}>Register &amp; Start Tasks</Text>}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#FFFFFF' },
  scroll:         { padding: 24 },
  section:        { fontSize: 11, fontWeight: '700', color: '#14B8A6', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 12 },
  field:          { marginBottom: 16 },
  fieldLabel:     { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
  input:          { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', color: '#0F172A', fontSize: 15, paddingHorizontal: 16, paddingVertical: 12 },
  inputMulti:     { height: 80, textAlignVertical: 'top' },
  chips:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  btn:            { backgroundColor: '#14B8A6', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnDisabled:    { backgroundColor: '#E2E8F0' },
  btnText:        { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
