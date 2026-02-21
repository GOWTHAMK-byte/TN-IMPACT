import { View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, Expense } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, EmptyState, FAB, SectionHeader } from '@/components/ui';
import { useState, useCallback, useMemo } from 'react';

type FilterType = 'All' | 'Pending' | 'Approved' | 'Rejected';

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { expenses, updateExpenseStatus, refreshData } = useData();
  const [filter, setFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const isApprover = user?.role === 'MANAGER' || user?.role === 'FINANCE_ADMIN' || user?.role === 'SUPER_ADMIN';

  const filteredExpenses = useMemo(() => {
    if (filter === 'Pending') return expenses.filter(e => e.status.startsWith('Pending'));
    if (filter === 'Approved') return expenses.filter(e => ['Approved', 'Paid'].includes(e.status));
    if (filter === 'Rejected') return expenses.filter(e => e.status === 'Rejected');
    return expenses;
  }, [expenses, filter]);

  const totalPending = useMemo(() =>
    expenses.filter(e => e.status.startsWith('Pending')).reduce((s, e) => s + e.amount, 0)
  , [expenses]);

  const totalApproved = useMemo(() =>
    expenses.filter(e => ['Approved', 'Paid'].includes(e.status)).reduce((s, e) => s + e.amount, 0)
  , [expenses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleApprove = useCallback(async (expense: Expense) => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newStatus = user.role === 'FINANCE_ADMIN' ? 'Approved' : 'Pending_Finance';
    await updateExpenseStatus(expense.id, newStatus, user.id, user.name, 'Approved');
  }, [user, updateExpenseStatus]);

  const handleReject = useCallback(async (expense: Expense) => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await updateExpenseStatus(expense.id, 'Rejected', user.id, user.name, 'Rejected');
  }, [user, updateExpenseStatus]);

  const FILTERS: FilterType[] = ['All', 'Pending', 'Approved', 'Rejected'];

  const getCategoryIcon = (cat: string) => {
    if (cat.includes('Travel')) return 'navigation';
    if (cat.includes('Meal') || cat.includes('Entertainment')) return 'coffee';
    if (cat.includes('Office')) return 'package';
    return 'file-text';
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <Card style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseIconWrap}>
          <Feather name={getCategoryIcon(item.category) as any} size={18} color={Colors.accent} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.expenseCategory}>{item.category}</Text>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>${item.amount.toFixed(2)}</Text>
          <StatusBadge label={formatStatus(item.status)} type={getStatusType(item.status)} />
        </View>
      </View>
      <View style={styles.expenseMeta}>
        <Text style={styles.expenseBy}>{item.submittedByName}</Text>
        <Text style={styles.expenseDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      {isApprover && item.status.startsWith('Pending') && (
        <View style={styles.actionRow}>
          <Pressable onPress={() => handleApprove(item)} style={({ pressed }) => [styles.approveBtn, pressed && { opacity: 0.8 }]}>
            <Feather name="check" size={16} color="#fff" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </Pressable>
          <Pressable onPress={() => handleReject(item)} style={({ pressed }) => [styles.rejectBtn, pressed && { opacity: 0.8 }]}>
            <Feather name="x" size={16} color={Colors.error} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>Expenses</Text>
        <View style={styles.totalsRow}>
          <Card style={[styles.totalCard, { borderLeftColor: Colors.warning, borderLeftWidth: 3 }]}>
            <Text style={styles.totalLabel}>Pending</Text>
            <Text style={[styles.totalValue, { color: Colors.warning }]}>${totalPending.toFixed(2)}</Text>
          </Card>
          <Card style={[styles.totalCard, { borderLeftColor: Colors.success, borderLeftWidth: 3 }]}>
            <Text style={styles.totalLabel}>Approved</Text>
            <Text style={[styles.totalValue, { color: Colors.success }]}>${totalApproved.toFixed(2)}</Text>
          </Card>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredExpenses}
        renderItem={renderExpense}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        scrollEnabled={!!filteredExpenses.length}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        ListEmptyComponent={<EmptyState icon="credit-card" title="No expenses" subtitle="Tap + to submit a new expense report" />}
      />

      <FAB onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/new-expense'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerArea: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, fontFamily: 'Inter_700Bold' },
  totalsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  totalCard: { flex: 1, paddingVertical: 12 },
  totalLabel: { fontSize: 12, color: Colors.textSecondary },
  totalValue: { fontSize: 20, fontWeight: '800', fontFamily: 'Inter_700Bold', marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, gap: 10 },
  expenseCard: { gap: 10 },
  expenseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expenseIconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  expenseCategory: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', gap: 4 },
  expenseAmount: { fontSize: 16, fontWeight: '700', color: Colors.text, fontFamily: 'Inter_700Bold' },
  expenseMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  expenseBy: { fontSize: 12, color: Colors.textSecondary },
  expenseDate: { fontSize: 12, color: Colors.textTertiary },
  actionRow: { flexDirection: 'row', gap: 10 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  approveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.errorLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: Colors.error },
});
