import { View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, LeaveRequest } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, EmptyState, FAB, SectionHeader } from '@/components/ui';
import { useState, useCallback, useMemo } from 'react';

type FilterType = 'All' | 'Pending' | 'Approved' | 'Rejected';

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
          <Feather name="calendar" size={14} color={Colors.secondary} />
          <Text style={styles.leaveType}>{item.leaveType} Leave</Text>
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
        <Text style={styles.pageTitle}>Leave Management</Text>
        <View style={styles.balanceStrip}>
          <View style={styles.balItem}><Text style={[styles.balVal, { color: Colors.accent }]}>{leaveBalance.annual}</Text><Text style={styles.balLabel}>Annual</Text></View>
          <View style={styles.balDivider} />
          <View style={styles.balItem}><Text style={[styles.balVal, { color: Colors.warning }]}>{leaveBalance.sick}</Text><Text style={styles.balLabel}>Sick</Text></View>
          <View style={styles.balDivider} />
          <View style={styles.balItem}><Text style={[styles.balVal, { color: Colors.secondary }]}>{leaveBalance.personal}</Text><Text style={styles.balLabel}>Personal</Text></View>
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
        data={filteredLeaves}
        renderItem={renderLeave}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        scrollEnabled={!!filteredLeaves.length}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        ListEmptyComponent={<EmptyState icon="calendar" title="No leave requests" subtitle="Tap + to submit a new leave request" />}
      />

      <FAB onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/new-leave'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerArea: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, fontFamily: 'Inter_700Bold' },
  balanceStrip: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  balItem: { flex: 1, alignItems: 'center' },
  balVal: { fontSize: 22, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  balLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  balDivider: { width: 1, backgroundColor: Colors.divider },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, gap: 10 },
  leaveCard: { gap: 8 },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leaveTypeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaveType: { fontSize: 13, fontWeight: '600', color: Colors.secondary },
  leaveName: { fontSize: 15, fontWeight: '600', color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  leaveDates: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaveDateText: { fontSize: 13, color: Colors.textSecondary },
  leaveReason: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  approveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.errorLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  rejectBtnText: { fontSize: 13, fontWeight: '600', color: Colors.error },
});
