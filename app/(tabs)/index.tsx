import { View, Text, StyleSheet, ScrollView, Pressable, Platform, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Redirect } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useAuth, getRoleLabel, getRoleBadgeColor, UserRole } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, Avatar, SectionHeader } from '@/components/ui';
import { useState, useCallback, useMemo } from 'react';

const { width } = Dimensions.get('window');
const P = Pressable as any;

interface Action {
  id: string;
  icon: string;
  label: string;
  color: string;
  route: string;
  roles?: UserRole[];
}

const ALL_ACTIONS: Action[] = [
  { id: 'leave', icon: 'calendar', label: 'Leave', color: '#38BDF8', route: '/new-leave' },
  { id: 'ticket', icon: 'headphones', label: 'Support', color: '#34D399', route: '/new-ticket' },
  { id: 'expense', icon: 'credit-card', label: 'Expense', color: '#FBBF24', route: '/new-expense' },
  { id: 'directory', icon: 'users', label: 'Teams', color: '#818CF8', route: '/directory' },
  { id: 'hr', icon: 'heart', label: 'HR Hub', color: '#FB7185', route: '/(tabs)/hr', roles: ['HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'] },
  { id: 'finance', icon: 'dollar-sign', label: 'Finance', color: '#FBBF24', route: '/(tabs)/expenses', roles: ['FINANCE_ADMIN', 'SUPER_ADMIN'] },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { leaves, tickets, expenses, leaveBalance, unreadCount, refreshData } = useData();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const roleActions = useMemo(() => {
    return ALL_ACTIONS.filter(a => !a.roles || (user?.role && a.roles.includes(user.role))).slice(0, 4);
  }, [user?.role]);

  const pendingLeaves = leaves.filter(l => l.status.startsWith('Pending'));
  const activeTickets = tickets.filter(t => !['Resolved', 'Closed'].includes(t.status));
  const pendingExpenses = expenses.filter(e => e.status.startsWith('Pending'));

  const isManagement = ['MANAGER', 'HR_ADMIN', 'IT_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.gradients.background as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.topBarRight}>
            <P onPress={() => router.push('/notifications')} style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </P>
            <P onPress={() => router.push('/profile')}>
              <Avatar initials={user?.name?.substring(0, 2).toUpperCase() || 'U'} size={44} color="rgba(255,255,255,0.1)" />
            </P>
          </Animated.View>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInUp.delay(300).duration(600)} style={styles.roleRow}>
            <View style={[styles.roleChip, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <View style={[styles.roleDot, { backgroundColor: getRoleBadgeColor(user?.role || 'EMPLOYEE') }]} />
              <Text style={styles.roleChipText}>{getRoleLabel(user?.role || 'EMPLOYEE')}</Text>
            </View>
          </Animated.View>

          <SectionHeader title="Quick Actions" />
          <View style={styles.quickGrid}>
            {roleActions.map((action, index) => (
              <Animated.View
                key={action.id}
                entering={FadeInUp.delay(400 + (index * 100)).duration(500)}
                style={{ width: (width - 60) / 4 }}
              >
                <P
                  onPress={() => router.push(action.route as any)}
                  style={({ pressed }: any) => [styles.quickCard, pressed && { transform: [{ scale: 0.94 }] }]}
                >
                  <LinearGradient
                    colors={[(action.color + '30'), (action.color + '10')] as [string, string, ...string[]]}
                    style={styles.quickIcon}
                  >
                    <Feather name={action.icon as any} size={20} color={action.color} />
                  </LinearGradient>
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </P>
              </Animated.View>
            ))}
          </View>

          {isManagement ? (
            <>
              <SectionHeader title="Management Overview" />
              <View style={styles.summaryRow}>
                {[
                  { icon: 'users', value: pendingLeaves.length, label: 'Approvals', color: Colors.accent },
                  { icon: 'alert-circle', value: activeTickets.length, label: 'Active Issues', color: Colors.success },
                  { icon: 'trending-up', value: pendingExpenses.length, label: 'Pending Payouts', color: Colors.warning },
                ].map((s, index) => (
                  <Card key={s.label} style={styles.summaryCard} delay={600 + (index * 100)}>
                    <View style={styles.summaryHeader}>
                      <Feather name={s.icon as any} size={14} color={s.color} />
                    </View>
                    <Text style={styles.summaryValue}>{s.value}</Text>
                    <Text style={styles.summaryLabel}>{s.label}</Text>
                  </Card>
                ))}
              </View>
            </>
          ) : (
            <>
              <SectionHeader title="Your Balance" />
              <View style={styles.balanceRow}>
                {[
                  { label: 'Annual', value: leaveBalance.annual, color: Colors.accent },
                  { label: 'Sick', value: leaveBalance.sick, color: Colors.success },
                  { label: 'Personal', value: leaveBalance.personal, color: Colors.secondary },
                ].map((b, index) => (
                  <Card key={b.label} style={styles.balanceCard} delay={500 + (index * 100)}>
                    <Text style={[styles.balanceValue, { color: b.color }]}>{b.value}</Text>
                    <Text style={styles.balanceLabel}>{b.label}</Text>
                  </Card>
                ))}
              </View>
            </>
          )}

          <SectionHeader title="Active Tracks" />
          <View style={styles.summaryRow}>
            {[
              { icon: 'calendar', value: leaves.filter(l => l.employeeId === user?.id && l.status === 'Pending_Manager').length, label: 'My Leaves', color: Colors.accent },
              { icon: 'headphones', value: tickets.filter(t => t.createdBy === user?.id && t.status !== 'Resolved').length, label: 'My Tickets', color: Colors.success },
              { icon: 'credit-card', value: expenses.filter(e => e.submittedBy === user?.id && e.status === 'Pending_Manager').length, label: 'My Expenses', color: Colors.warning },
            ].map((s, index) => (
              <Card key={s.label} style={styles.summaryCard} delay={800 + (index * 100)}>
                <View style={styles.summaryHeader}>
                  <Feather name={s.icon as any} size={14} color={s.color} />
                  <Text style={[styles.summaryStatus, { color: s.color }]}>Live</Text>
                </View>
                <Text style={styles.summaryValue}>{s.value}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </Card>
            ))}
          </View>

          {leaves.length > 0 && (
            <>
              <SectionHeader title="Recent Activity" actionLabel="History" onAction={() => router.push('/(tabs)/hr')} />
              {(isManagement ? leaves : leaves.filter(l => l.employeeId === user?.id)).slice(0, 2).map((leave, index) => (
                <Card key={leave.id} onPress={() => { }} delay={1000 + (index * 100)}>
                  <View style={styles.activityRow}>
                    <View style={styles.activityIconCircle}>
                      <Feather name="calendar" size={18} color={Colors.accent} />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{leave.leaveType} Leave</Text>
                      <Text style={styles.activityMeta}>{leave.employeeName} • {leave.startDate}</Text>
                    </View>
                    <StatusBadge label={formatStatus(leave.status)} type={getStatusType(leave.status)} />
                  </View>
                </Card>
              ))}
            </>
          )}

          {tickets.length > 0 && (
            <>
              <SectionHeader title="Support Tickets" actionLabel="See all" onAction={() => router.push('/(tabs)/tickets')} />
              {(user?.role === 'IT_ADMIN' ? tickets : tickets.filter(t => t.createdBy === user?.id)).slice(0, 2).map((ticket, index) => (
                <Card key={ticket.id} onPress={() => { }} delay={1200 + (index * 100)}>
                  <View style={styles.activityRow}>
                    <View style={[styles.activityIconCircle, { backgroundColor: Colors.successLight }]}>
                      <Feather name="headphones" size={18} color={Colors.success} />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{ticket.title}</Text>
                      <Text style={styles.activityMeta}>{ticket.createdByName} • {ticket.priority}</Text>
                    </View>
                    <StatusBadge label={formatStatus(ticket.status)} type={getStatusType(ticket.status)} />
                  </View>
                </Card>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 10 },
  content: { gap: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  userName: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 2, letterSpacing: -1 },
  notifBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  notifBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.background },
  notifBadgeText: { fontSize: 10, fontWeight: '900', color: '#fff' },
  roleRow: { marginBottom: 12 },
  roleChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  roleDot: { width: 6, height: 6, borderRadius: 3 },
  roleChipText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  quickCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20, padding: 12, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  balanceRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  balanceCard: { flex: 1, padding: 16, alignItems: 'center' },
  balanceValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  balanceLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, padding: 14 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  summaryStatus: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 22, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  summaryLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },
  activityRow: { flexDirection: 'row', alignItems: 'center' },
  activityIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  activityMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
