import { View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, LeaveRequest } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, EmptyState, FAB } from '@/components/ui';
import { useState, useCallback, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

type FilterType = 'All' | 'Pending' | 'Approved' | 'Rejected';

const P = Pressable as any;

export default function HRScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { leaves, leaveBalance, updateLeaveStatus, refreshData } = useData();
  const [filter, setFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const isApprover = user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';

  const filteredLeaves = useMemo(() => {
    let filtered = leaves;
    if (filter === 'Pending') filtered = leaves.filter(l => l.status.startsWith('Pending'));
    if (filter === 'Approved') filtered = leaves.filter(l => l.status === 'Approved');
    if (filter === 'Rejected') filtered = leaves.filter(l => l.status === 'Rejected');
    return filtered;
  }, [leaves, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleApprove = useCallback(async (leave: LeaveRequest) => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateLeaveStatus(leave.id, 'Approved', user.id, user.name, 'Approved');
  }, [user, updateLeaveStatus]);

  const handleReject = useCallback(async (leave: LeaveRequest) => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await updateLeaveStatus(leave.id, 'Rejected', user.id, user.name, 'Rejected');
  }, [user, updateLeaveStatus]);

  const FILTERS: FilterType[] = ['All', 'Pending', 'Approved', 'Rejected'];

  const renderLeave = ({ item }: { item: LeaveRequest }) => (
    <Card style={styles.leaveCard}>
      <View style={styles.leaveHeader}>
        <View style={styles.leaveTypeWrap}>
          <Feather name="calendar" size={14} color={Colors.accent} />
          <Text style={styles.leaveType}>{item.leaveType}</Text>
        </View>
        <StatusBadge label={formatStatus(item.status)} type={getStatusType(item.status)} />
      </View>
      <Text style={styles.leaveName}>{item.employeeName}</Text>
      <View style={styles.leaveDates}>
        <Feather name="clock" size={13} color={Colors.textTertiary} />
        <Text style={styles.leaveDateText}>{item.startDate} to {item.endDate}</Text>
      </View>
      {item.reason ? <Text style={styles.leaveReason} numberOfLines={2}>{item.reason}</Text> : null}
      {isApprover && item.status.startsWith('Pending') && (
        <View style={styles.actionRow}>
          <P onPress={() => handleApprove(item)} style={({ pressed }: any) => [styles.approveBtn, pressed && { opacity: 0.8 }]}>
            <Feather name="check" size={16} color="#fff" />
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
      <LinearGradient
        colors={Colors.gradients.background as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.headerArea, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.pageTitle}>Leaves</Text>
        <View style={styles.balanceStrip}>
          {[
            { label: 'Annual', val: leaveBalance.annual, color: Colors.accent },
            { label: 'Sick', val: leaveBalance.sick, color: Colors.success },
            { label: 'Personal', val: leaveBalance.personal, color: Colors.secondary },
          ].map((b, i) => (
            <View key={b.label} style={styles.balItem}>
              <Text style={[styles.balVal, { color: b.color }]}>{b.val}</Text>
              <Text style={styles.balLabel}>{b.label}</Text>
            </View>
          ))}
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
        data={filteredLeaves}
        renderItem={renderLeave}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        scrollEnabled={!!filteredLeaves.length}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={<EmptyState icon="calendar" title="No leave requests" subtitle="Tap + to submit a new leave request" />}
      />

      <FAB onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/new-leave'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerArea: { paddingHorizontal: 20, paddingBottom: 8 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 12 },
  balanceStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 12 },
  balItem: { flex: 1, alignItems: 'center' },
  balVal: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  balLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  filterTextActive: { color: Colors.background },
  list: { paddingHorizontal: 20, gap: 12 },
  leaveCard: { gap: 8 },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leaveTypeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaveType: { fontSize: 13, fontWeight: '800', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  leaveName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  leaveDates: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaveDateText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  leaveReason: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, paddingVertical: 12, borderRadius: 12 },
  approveBtnText: { fontSize: 14, fontWeight: '800', color: Colors.background, textTransform: 'uppercase' },
  rejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251, 113, 133, 0.1)', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.2)' },
  rejectBtnText: { fontSize: 14, fontWeight: '800', color: Colors.error, textTransform: 'uppercase' },
});
