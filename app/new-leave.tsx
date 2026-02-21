import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, LeaveType } from '@/contexts/DataContext';

const LEAVE_TYPES: LeaveType[] = ['Annual', 'Sick', 'Personal', 'Maternity', 'Paternity', 'Bereavement'];

export default function NewLeaveScreen() {
  const { user } = useAuth();
  const { createLeave } = useData();
  const [leaveType, setLeaveType] = useState<LeaveType>('Annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = leaveType && startDate.length >= 8 && endDate.length >= 8;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createLeave({
      employeeId: user.id,
      employeeName: user.name,
      managerId: user.managerId,
      leaveType,
      startDate,
      endDate,
      reason,
      status: 'Submitted',
    });
    router.back();
  };

  const formatDateInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Leave Type</Text>
      <View style={styles.typeGrid}>
        {LEAVE_TYPES.map(type => (
          <Pressable
            key={type}
            onPress={() => { setLeaveType(type); Haptics.selectionAsync(); }}
            style={[styles.typeChip, leaveType === type && styles.typeChipActive]}
          >
            <Text style={[styles.typeText, leaveType === type && styles.typeTextActive]}>{type}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Start Date</Text>
      <View style={styles.inputWrap}>
        <Feather name="calendar" size={16} color={Colors.textSecondary} />
        <TextInput
          value={startDate}
          onChangeText={t => setStartDate(formatDateInput(t))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={10}
        />
      </View>

      <Text style={styles.label}>End Date</Text>
      <View style={styles.inputWrap}>
        <Feather name="calendar" size={16} color={Colors.textSecondary} />
        <TextInput
          value={endDate}
          onChangeText={t => setEndDate(formatDateInput(t))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={10}
        />
      </View>

      <Text style={styles.label}>Reason (Optional)</Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Brief reason for leave..."
        placeholderTextColor={Colors.textTertiary}
        style={styles.textArea}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <Pressable
        onPress={handleSubmit}
        disabled={!isValid || submitting}
        style={({ pressed }) => [
          styles.submitBtn,
          (!isValid || submitting) && styles.submitBtnDisabled,
          pressed && isValid && !submitting && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Leave Request'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  typeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  typeText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  typeTextActive: { color: '#fff' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.inputBorder },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: Colors.text },
  textArea: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.inputBorder },
  submitBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
