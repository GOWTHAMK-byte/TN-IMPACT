import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth, getRoleLabel, getRoleBadgeColor } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Avatar, Card, InfoRow } from '@/components/ui';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { leaves, tickets, expenses } = useData();

  const stats = {
    leavesThisYear: leaves.filter(l => l.employeeId === user?.id).length,
    activeTickets: tickets.filter(t => t.createdBy === user?.id && !['Resolved', 'Closed'].includes(t.status)).length,
    totalExpenses: expenses.filter(e => e.submittedBy === user?.id).reduce((s, e) => s + e.amount, 0),
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 54 : 34 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <Avatar initials={user?.avatar || 'U'} size={72} color={getRoleBadgeColor(user?.role || 'EMPLOYEE')} />
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.title}>{user?.title}</Text>
        <View style={[styles.roleChip, { backgroundColor: getRoleBadgeColor(user?.role || 'EMPLOYEE') + '18' }]}>
          <Text style={[styles.roleText, { color: getRoleBadgeColor(user?.role || 'EMPLOYEE') }]}>{getRoleLabel(user?.role || 'EMPLOYEE')}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.secondary }]}>{stats.leavesThisYear}</Text>
          <Text style={styles.statLabel}>Leave Requests</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.accent }]}>{stats.activeTickets}</Text>
          <Text style={styles.statLabel}>Active Tickets</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.success }]}>${stats.totalExpenses.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Expenses</Text>
        </Card>
      </View>

      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <InfoRow icon="mail" label="Email" value={user?.email || ''} />
        <InfoRow icon="phone" label="Phone" value={user?.phone || ''} />
        <InfoRow icon="briefcase" label="Department" value={user?.department || ''} />
        <InfoRow icon="shield" label="Role" value={getRoleLabel(user?.role || 'EMPLOYEE')} />
        <InfoRow icon="hash" label="Employee ID" value={user?.id || ''} />
      </Card>

      <Pressable
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); logout(); } },
          ]);
        }}
        style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
      >
        <Feather name="log-out" size={18} color={Colors.error} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 20 },
  profileHeader: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.text, fontFamily: 'Inter_700Bold' },
  title: { fontSize: 14, color: Colors.textSecondary },
  roleChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16 },
  roleText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 20, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  infoCard: { gap: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 8, fontFamily: 'Inter_700Bold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.errorLight, paddingVertical: 14, borderRadius: 14 },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.error },
});
