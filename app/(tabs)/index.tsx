import { View, Text, StyleSheet, ScrollView, Pressable, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth, getRoleLabel, getRoleBadgeColor } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, Avatar, SectionHeader } from '@/components/ui';
import { useState, useCallback } from 'react';

const QUICK_ACTIONS = [
  { id: 'leave', icon: 'calendar', label: 'Leave', color: '#6366F1', route: '/new-leave' },
  { id: 'ticket', icon: 'headphones', label: 'IT Ticket', color: '#10B981', route: '/new-ticket' },
  { id: 'expense', icon: 'credit-card', label: 'Expense', color: '#F59E0B', route: '/new-expense' },
  { id: 'directory', icon: 'book', label: 'Directory', color: '#0EA5E9', route: '/directory' },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { leaves, tickets, expenses, notifications, leaveBalance, unreadCount, refreshData, isLoading } = useData();
  const [refreshing, setRefreshing] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const pendingLeaves = leaves.filter(l => l.status.startsWith('Pending'));
  const activeTickets = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status));
  const pendingExpenses = expenses.filter(e => e.status.startsWith('Pending'));

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          </View>
          <Pressable onPress={() => { Haptics.selectionAsync(); router.push('/notifications'); }} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={[styles.roleChip, { backgroundColor: getRoleBadgeColor(user?.role || 'EMPLOYEE') + '18' }]}>
          <View style={[styles.roleDot, { backgroundColor: getRoleBadgeColor(user?.role || 'EMPLOYEE') }]} />
          <Text style={[styles.roleChipText, { color: getRoleBadgeColor(user?.role || 'EMPLOYEE') }]}>{getRoleLabel(user?.role || 'EMPLOYEE')}</Text>
        </View>

        <SectionHeader title="Quick Actions" />
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map(action => (
            <Pressable
              key={action.id}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(action.route as any); }}
              style={({ pressed }) => [styles.quickCard, pressed && { transform: [{ scale: 0.96 }] }]}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + '14' }]}>
                <Feather name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader title="Leave Balance" />
        <View style={styles.balanceRow}>
          {[
            { label: 'Annual', value: leaveBalance.annual, color: Colors.accent },
            { label: 'Sick', value: leaveBalance.sick, color: Colors.warning },
            { label: 'Personal', value: leaveBalance.personal, color: Colors.secondary },
          ].map(b => (
            <Card key={b.label} style={styles.balanceCard}>
              <Text style={[styles.balanceValue, { color: b.color }]}>{b.value}</Text>
              <Text style={styles.balanceLabel}>{b.label}</Text>
            </Card>
          ))}
        </View>

        <SectionHeader title="Summary" />
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { borderLeftColor: '#6366F1', borderLeftWidth: 3 }]}>
            <Text style={styles.summaryValue}>{pendingLeaves.length}</Text>
            <Text style={styles.summaryLabel}>Pending Leaves</Text>
          </Card>
          <Card style={[styles.summaryCard, { borderLeftColor: '#10B981', borderLeftWidth: 3 }]}>
            <Text style={styles.summaryValue}>{activeTickets.length}</Text>
            <Text style={styles.summaryLabel}>Active Tickets</Text>
          </Card>
          <Card style={[styles.summaryCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 3 }]}>
            <Text style={styles.summaryValue}>{pendingExpenses.length}</Text>
            <Text style={styles.summaryLabel}>Pending Expenses</Text>
          </Card>
        </View>

        {leaves.length > 0 && (
          <>
            <SectionHeader title="Recent Leaves" actionLabel="See all" onAction={() => router.push('/(tabs)/hr')} />
            {leaves.slice(0, 2).map(leave => (
              <Card key={leave.id} style={styles.activityCard}>
                <View style={styles.activityRow}>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{leave.leaveType} Leave</Text>
                    <Text style={styles.activityMeta}>{leave.startDate} to {leave.endDate}</Text>
                  </View>
                  <StatusBadge label={formatStatus(leave.status)} type={getStatusType(leave.status)} />
                </View>
              </Card>
            ))}
          </>
        )}

        {tickets.length > 0 && (
          <>
            <SectionHeader title="Recent Tickets" actionLabel="See all" onAction={() => router.push('/(tabs)/tickets')} />
            {tickets.slice(0, 2).map(ticket => (
              <Card key={ticket.id} style={styles.activityCard}>
                <View style={styles.activityRow}>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{ticket.title}</Text>
                    <Text style={styles.activityMeta}>{ticket.category} | {ticket.priority}</Text>
                  </View>
                  <StatusBadge label={formatStatus(ticket.status)} type={getStatusType(ticket.status)} />
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, gap: 16, paddingTop: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 14, color: Colors.textSecondary, fontFamily: 'Inter_400Regular' },
  userName: { fontSize: 24, fontWeight: '700', color: Colors.text, fontFamily: 'Inter_700Bold', marginTop: 2 },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  notifBadge: { position: 'absolute', top: 6, right: 6, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  notifBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  roleChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleChipText: { fontSize: 12, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  quickCard: {
    flex: 1, minWidth: '22%', backgroundColor: Colors.card,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '600', color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  balanceRow: { flexDirection: 'row', gap: 10 },
  balanceCard: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  balanceValue: { fontSize: 28, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  balanceLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontFamily: 'Inter_500Medium' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, paddingVertical: 14 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: Colors.text, fontFamily: 'Inter_700Bold' },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  activityCard: { marginBottom: 8 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityInfo: { flex: 1, marginRight: 12 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  activityMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
});
