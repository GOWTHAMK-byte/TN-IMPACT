import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth, UserRole, getRoleLabel, getRoleBadgeColor } from '@/contexts/AuthContext';

const ROLES: { role: UserRole; icon: string; desc: string }[] = [
  { role: 'EMPLOYEE', icon: 'user', desc: 'View leaves, tickets & expenses' },
  { role: 'MANAGER', icon: 'users', desc: 'Approve team requests' },
  { role: 'HR_ADMIN', icon: 'heart', desc: 'Manage HR operations' },
  { role: 'IT_ADMIN', icon: 'monitor', desc: 'Handle IT support tickets' },
  { role: 'FINANCE_ADMIN', icon: 'dollar-sign', desc: 'Process expenses & payroll' },
  { role: 'SUPER_ADMIN', icon: 'shield', desc: 'Full system access' },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, isAuthenticated } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const handleLogin = async () => {
    if (!selectedRole) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await login('demo@company.com', selectedRole);
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <Ionicons name="shield-checkmark" size={36} color="#fff" />
          </View>
          <Text style={styles.title}>ServiceHub</Text>
          <Text style={styles.subtitle}>Unified Employee Service Platform</Text>
        </View>

        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>Select your role to continue</Text>
          {ROLES.map(({ role, icon, desc }) => {
            const isSelected = selectedRole === role;
            const badgeColor = getRoleBadgeColor(role);
            return (
              <Pressable
                key={role}
                onPress={() => {
                  setSelectedRole(role);
                  Haptics.selectionAsync();
                }}
                style={[styles.roleCard, isSelected && { borderColor: badgeColor, borderWidth: 2 }]}
              >
                <View style={[styles.roleIcon, { backgroundColor: badgeColor + '18' }]}>
                  <Feather name={icon as any} size={20} color={badgeColor} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>{getRoleLabel(role)}</Text>
                  <Text style={styles.roleDesc}>{desc}</Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: badgeColor }]}>
                    <Feather name="check" size={14} color="#fff" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleLogin}
          disabled={!selectedRole || loading}
          style={({ pressed }) => [
            styles.loginBtn,
            !selectedRole && styles.loginBtnDisabled,
            pressed && selectedRole && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={[styles.loginBtnText, !selectedRole && { opacity: 0.5 }]}>
            {loading ? 'Signing in...' : 'Continue'}
          </Text>
          {!loading && <Feather name="arrow-right" size={18} color="#fff" style={!selectedRole ? { opacity: 0.5 } : undefined} />}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 32 },
  header: { alignItems: 'center', paddingTop: 32 },
  logoWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(14,165,233,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  roleSection: { gap: 10 },
  roleLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 14, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  roleIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  roleDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  checkCircle: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, gap: 8,
  },
  loginBtnDisabled: { backgroundColor: 'rgba(14,165,233,0.3)' },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
