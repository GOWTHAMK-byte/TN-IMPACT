import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert, Image, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth, getRoleLabel, getRoleBadgeColor } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Avatar, Card, InfoRow } from '@/components/ui';
import { apiClient } from '@/lib/api';

const P = Pressable as any;

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { leaves, tickets, expenses } = useData();
  const insets = useSafeAreaInsets();

  const stats = {
    leavesThisYear: leaves.filter(l => l.employeeId === user?.id).length,
    activeTickets: tickets.filter(t => t.createdBy === user?.id && !['Resolved', 'Closed'].includes(t.status)).length,
    totalExpenses: expenses.filter(e => e.submittedBy === user?.id).reduce((s, e) => s + e.amount, 0),
  };



  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (confirm('Sign out of your account?')) {
        logout();
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); logout(); } },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + (Platform.OS === 'web' ? 70 : 20), paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarOutline}>
            <Avatar initials={user?.avatar || 'U'} size={88} color={getRoleBadgeColor(user?.role || 'EMPLOYEE')} />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.title}>{user?.title}</Text>
          <View style={[styles.roleChip, { backgroundColor: getRoleBadgeColor(user?.role || 'EMPLOYEE') + '20', borderColor: getRoleBadgeColor(user?.role || 'EMPLOYEE') + '40' }]}>
            <Text style={[styles.roleText, { color: getRoleBadgeColor(user?.role || 'EMPLOYEE') }]}>{getRoleLabel(user?.role || 'EMPLOYEE')}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.secondary }]}>{stats.leavesThisYear}</Text>
            <Text style={styles.statLabel}>Leave</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.accent }]}>{stats.activeTickets}</Text>
            <Text style={styles.statLabel}>Tickets</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: Colors.success }]}>${stats.totalExpenses.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </Card>
        </View>

        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Identity & Role</Text>
          <InfoRow icon="mail" label="Work Email" value={user?.email || ''} />
          <InfoRow icon="phone" label="Phone" value={user?.phone || ''} />
          <InfoRow icon="briefcase" label="Department" value={user?.department || ''} />
          <InfoRow icon="shield" label="Permission" value={getRoleLabel(user?.role || 'EMPLOYEE')} />
          <InfoRow icon="hash" label="Internal ID" value={user?.id || ''} />
        </Card>



        <P
          onPress={handleLogout}
          style={({ pressed }: { pressed: boolean }) => [styles.logoutBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
        >
          <LinearGradient
            colors={[Colors.error + '20', Colors.error + '05'] as [string, string, ...string[]]}
            style={StyleSheet.absoluteFill}
          />
          <Feather name="log-out" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </P>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 24, gap: 24 },
  profileHeader: { alignItems: 'center', gap: 10 },
  avatarOutline: {
    padding: 6, borderRadius: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  name: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
  title: { fontSize: 16, color: Colors.textSecondary, fontWeight: '500' },
  roleChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  statValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 4, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoCard: { padding: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12, marginLeft: 16, textTransform: 'uppercase', letterSpacing: 1, color: Colors.textSecondary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 56, borderRadius: 18, borderWidth: 1, borderColor: Colors.error + '30',
    overflow: 'hidden',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: Colors.error },
  mfaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginBottom: 16, backgroundColor: Colors.text, paddingVertical: 14, borderRadius: 12 },
  mfaBtnText: { color: Colors.background, fontSize: 13, fontWeight: '700' },
  mfaSetupBox: { paddingHorizontal: 16, paddingBottom: 16 },
  mfaSetupDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  qrCodeWrapper: { backgroundColor: '#fff', padding: 8, borderRadius: 12, alignSelf: 'center', marginVertical: 16 },
  qrCode: { width: 140, height: 140 },
  mfaSecretText: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 1 },
  mfaInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, height: 48, color: '#fff', fontSize: 20, letterSpacing: 6, textAlign: 'center', marginTop: 12 },
  mfaActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  mfaCancelBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  mfaCancelText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  mfaVerifyBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent },
  mfaVerifyText: { color: Colors.background, fontWeight: '700', fontSize: 13 },
});
