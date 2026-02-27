import { View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, Expense } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, EmptyState, FAB } from '@/components/ui';
import { useState, useCallback, useMemo } from 'react';

type FilterType = 'All' | 'Pending' | 'Approved' | 'Rejected';
const P = Pressable as any;

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
    if (cat.includes('Travel')) return 'map';
    if (cat.includes('Meal') || cat.includes('Entertainment')) return 'coffee';
    if (cat.includes('Office')) return 'briefcase';
    return 'file-text';
  };

  const renderExpense = ({ item }: { item: Expense }) => (
    <Card style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseIconWrap}>
          <Feather name={getCategoryIcon(item.category) as any} size={18} color={Colors.accent} />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseTitle}>{item.title}</Text>
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
          <P onPress={() => handleApprove(item)} style={({ pressed }: any) => [styles.approveBtn, pressed && { opacity: 0.8 }]}>
            <Text style={styles.approveBtnText}>Approve</Text>
          </P>
          <P onPress={() => handleReject(item)} style={({ pressed }: any) => [styles.rejectBtn, pressed && { opacity: 0.8 }]}>
            <Text style={styles.rejectBtnText}>Reject</Text>
          </P>
        </View>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]}
      />
      <View style={[styles.headerArea, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.pageTitle}>Finance</Text>
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalValue}>${totalPending.toFixed(2)}</Text>
            <Text style={styles.totalLabel}>Pending</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={[styles.totalValue, { color: Colors.success }]}>${totalApproved.toFixed(2)}</Text>
            <Text style={styles.totalLabel}>Settled</Text>
          </View>
          <View style={[styles.totalItem, { flex: 0.6 }]}>
            <Text style={[styles.totalValue, { color: Colors.secondary }]}>{expenses.length}</Text>
            <Text style={styles.totalLabel}>Total</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <P
            key={f}
            onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </P>
        ))}
      </View>

      <FlatList
        data={filteredExpenses}
        renderItem={renderExpense}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        scrollEnabled={!!filteredExpenses.length}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={<EmptyState icon="credit-card" title="All clear!" subtitle="No expenses found for this filter." />}
      />

      <FAB onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/new-expense'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerArea: { paddingHorizontal: 20, paddingBottom: 8 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: Colors.text, letterSpacing: -1, marginBottom: 16 },
  totalsRow: { flexDirection: 'row', gap: 12 },
  totalItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  totalValue: { fontSize: 22, fontWeight: '900', color: Colors.warning, letterSpacing: -0.5 },
  totalLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  filterTextActive: { color: Colors.background },
  list: { paddingHorizontal: 20, gap: 12 },
  expenseCard: { gap: 12 },
  expenseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expenseIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  expenseCategory: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  expenseRight: { alignItems: 'flex-end', gap: 6 },
  expenseAmount: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  expenseMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  expenseBy: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  expenseDate: { fontSize: 12, color: Colors.textTertiary },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.success, paddingVertical: 12, borderRadius: 12 },
  approveBtnText: { fontSize: 14, fontWeight: '800', color: Colors.background, textTransform: 'uppercase' },
  rejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251, 113, 133, 0.1)', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.2)' },
  rejectBtnText: { fontSize: 14, fontWeight: '800', color: Colors.error, textTransform: 'uppercase' },
});
