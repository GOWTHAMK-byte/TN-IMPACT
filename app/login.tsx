import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Dimensions, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth, UserRole, getRoleLabel, getRoleBadgeColor } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const P = Pressable as any;

const ROLES: { role: UserRole; icon: string; desc: string }[] = [
  { role: 'EMPLOYEE', icon: 'user', desc: 'Manage your leaves and expenses' },
  { role: 'MANAGER', icon: 'users', desc: 'Review and approve team requests' },
  { role: 'HR_ADMIN', icon: 'heart', desc: 'Oversee HR and policy operations' },
  { role: 'IT_ADMIN', icon: 'monitor', desc: 'Resolve technical support tickets' },
  { role: 'FINANCE_ADMIN', icon: 'briefcase', desc: 'Authorize expenses and payroll' },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  const handleAction = async () => {
    if (mode === 'LOGIN') {
      if (!selectedRole) return;
      setLoading(true);
      await login('demo@company.com', selectedRole);
    } else {
      if (!name || !email || !selectedRole) return;
      setLoading(true);
      await register(name, email, selectedRole);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const isFormValid = mode === 'LOGIN' ? !!selectedRole : (!!name && !!email && !!selectedRole);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.gradients.background as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 20, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <LinearGradient
            colors={Colors.gradients.accent as [string, string, ...string[]]}
            style={styles.logoWrap}
          >
            <Ionicons name="sparkles" size={32} color={Colors.background} />
          </LinearGradient>
          <Text style={styles.title}>Impact Hub</Text>
          <Text style={styles.subtitle}>{mode === 'LOGIN' ? 'Welcome back' : 'Join the elite team'}</Text>
        </View>

        <View style={styles.modeToggle}>
          <P
            onPress={() => { setMode('LOGIN'); Haptics.selectionAsync(); }}
            style={[styles.modeBtn, mode === 'LOGIN' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeText, mode === 'LOGIN' && styles.modeTextActive]}>Sign In</Text>
          </P>
          <P
            onPress={() => { setMode('SIGNUP'); Haptics.selectionAsync(); }}
            style={[styles.modeBtn, mode === 'SIGNUP' && styles.modeBtnActive]}
          >
            <Text style={[styles.modeText, mode === 'SIGNUP' && styles.modeTextActive]}>Create Account</Text>
          </P>
        </View>

        {mode === 'SIGNUP' && (
          <View style={styles.form}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrap}>
              <Feather name="user" size={16} color={Colors.textTertiary} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
            </View>

            <Text style={styles.inputLabel}>Work Email</Text>
            <View style={styles.inputWrap}>
              <Feather name="mail" size={16} color={Colors.textTertiary} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@company.com"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        )}

        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>Select Role</Text>
          <View style={styles.roleGrid}>
            {ROLES.map(({ role, icon, desc }) => {
              const isSelected = selectedRole === role;
              const accentColor = getRoleBadgeColor(role);
              return (
                <P
                  key={role}
                  onPress={() => {
                    setSelectedRole(role);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    styles.roleCard,
                    isSelected && { borderColor: accentColor, backgroundColor: accentColor + '10' }
                  ]}
                >
                  <View style={[styles.roleIcon, { backgroundColor: isSelected ? accentColor : 'rgba(255,255,255,0.05)' }]}>
                    <Feather name={icon as any} size={20} color={isSelected ? Colors.background : Colors.textSecondary} />
                  </View>
                  <View style={styles.roleInfo}>
                    <Text style={[styles.roleName, isSelected && { color: accentColor }]}>{getRoleLabel(role)}</Text>
                    <Text style={styles.roleDesc}>{desc}</Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkIndicator, { backgroundColor: accentColor }]}>
                      <Feather name="check" size={12} color={Colors.background} />
                    </View>
                  )}
                </P>
              );
            })}
          </View>
        </View>

        <P
          onPress={handleAction}
          disabled={!isFormValid || loading}
          style={({ pressed }: any) => [
            styles.actionBtn,
            !isFormValid && styles.actionBtnDisabled,
            pressed && isFormValid && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <LinearGradient
            colors={(selectedRole ? [getRoleBadgeColor(selectedRole), getRoleBadgeColor(selectedRole)] : ['#475569', '#1E293B']) as any}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={styles.actionBtnText}>
            {loading ? 'Processing...' : mode === 'LOGIN' ? 'Enter Dashboard' : 'Create & Enter'}
          </Text>
          {!loading && <Feather name="arrow-right" size={20} color={selectedRole ? Colors.background : Colors.textSecondary} />}
        </P>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 28, gap: 32 },
  header: { alignItems: 'center' },
  logoWrap: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  modeBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  modeText: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  modeTextActive: { color: '#fff' },
  form: { gap: 16 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: -4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  input: { flex: 1, height: 52, color: '#fff', fontSize: 15 },
  roleSection: { gap: 16 },
  roleLabel: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 2 },
  roleGrid: { gap: 12 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20, padding: 16, gap: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  roleIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  roleDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
  checkIndicator: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtn: {
    height: 60, borderRadius: 20, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    marginTop: 10,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontSize: 16, fontWeight: '900', color: Colors.background, zIndex: 1 },
});
