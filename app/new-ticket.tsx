import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, TicketCategory, TicketPriority } from '@/contexts/DataContext';

const CATEGORIES: TicketCategory[] = ['Hardware', 'Software', 'Network', 'Access', 'Other'];
const PRIORITIES: { value: TicketPriority; color: string }[] = [
  { value: 'Low', color: Colors.textSecondary },
  { value: 'Medium', color: Colors.accent },
  { value: 'High', color: Colors.warning },
  { value: 'Critical', color: Colors.error },
];

export default function NewTicketScreen() {
  const { user } = useAuth();
  const { createTicket } = useData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Software');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [submitting, setSubmitting] = useState(false);

  const isValid = title.trim().length >= 3 && description.trim().length >= 5;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createTicket({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'Open',
      createdBy: user.id,
      createdByName: user.name,
    });
    router.back();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Title</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Brief description of the issue..."
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
        />
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.typeGrid}>
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat}
            onPress={() => { setCategory(cat); Haptics.selectionAsync(); }}
            style={[styles.typeChip, category === cat && styles.typeChipActive]}
          >
            <Text style={[styles.typeText, category === cat && styles.typeTextActive]}>{cat}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map(p => (
          <Pressable
            key={p.value}
            onPress={() => { setPriority(p.value); Haptics.selectionAsync(); }}
            style={[
              styles.priorityChip,
              priority === p.value && { backgroundColor: p.color, borderColor: p.color },
            ]}
          >
            <View style={[styles.priorityDot, { backgroundColor: priority === p.value ? '#fff' : p.color }]} />
            <Text style={[styles.priorityText, priority === p.value && { color: '#fff' }]}>{p.value}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Detailed description of the issue..."
        placeholderTextColor={Colors.textTertiary}
        style={styles.textArea}
        multiline
        numberOfLines={4}
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
        <Text style={styles.submitBtnText}>{submitting ? 'Creating...' : 'Create Ticket'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  inputWrap: { backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.inputBorder },
  input: { paddingVertical: 14, fontSize: 15, color: Colors.text },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  typeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  typeText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  typeTextActive: { color: '#fff' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  textArea: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, minHeight: 100, borderWidth: 1, borderColor: Colors.inputBorder },
  submitBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
