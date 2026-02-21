import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';

const CATEGORIES = ['Meals & Entertainment', 'Travel', 'Office Supplies', 'Software', 'Training', 'Other'];

export default function NewExpenseScreen() {
  const { user } = useAuth();
  const { createExpense } = useData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Meals & Entertainment');
  const [submitting, setSubmitting] = useState(false);

  const isValid = title.trim().length >= 3 && parseFloat(amount) > 0;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await createExpense({
      title: title.trim(),
      description: description.trim(),
      amount: parseFloat(amount),
      currency: 'USD',
      category,
      status: 'Submitted',
      submittedBy: user.id,
      submittedByName: user.name,
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
          placeholder="What is this expense for?"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
        />
      </View>

      <Text style={styles.label}>Amount (USD)</Text>
      <View style={styles.inputWrap}>
        <Text style={styles.currencySymbol}>$</Text>
        <TextInput
          value={amount}
          onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          keyboardType="decimal-pad"
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

      <Text style={styles.label}>Description (Optional)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Additional details..."
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
        <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Expense'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.inputBorder },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: Colors.text },
  currencySymbol: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  typeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  typeText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  typeTextActive: { color: '#fff' },
  textArea: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, fontSize: 15, color: Colors.text, minHeight: 80, borderWidth: 1, borderColor: Colors.inputBorder },
  submitBtn: { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
