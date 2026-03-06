import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Dimensions, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Authentication routing is now handled globally in app/_layout.tsx

  const handleAction = async () => {
    setLoading(true);
    try {
      if (mode === 'LOGIN') {
        if (!email || !password) return;
        await login(email, password);
      } else {
        if (!name || !email || !password || !selectedRole) return;
        await register(name, email, password, selectedRole);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(`${mode} failed:`, err);
      if (Platform.OS === 'web') {
        alert(err.message || `${mode === 'LOGIN' ? 'Login' : 'Registration'} failed.`);
      } else {
        Alert.alert('Error', err.message || `${mode === 'LOGIN' ? 'Login' : 'Registration'} failed.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = mode === 'LOGIN'
    ? (!!email && !!password)
    : (!!name && !!email && !!password && !!selectedRole);

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 20, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View
            style={[styles.logoWrap, { backgroundColor: Colors.accent }]}
          >
            <Ionicons name="sparkles" size={32} color={Colors.background} />
          </View>
          <Text style={styles.title}>Impact Hub</Text>
          <Text style={styles.subtitle}>{mode === 'LOGIN' ? 'Welcome back' : 'Join the team'}</Text>
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

        {/* Signup: Name field */}
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
          </View>
        )}

        {/* Email field (both modes) */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Email</Text>
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

          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={16} color={Colors.textTertiary} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'SIGNUP' ? 'Min 6 characters' : 'Enter your password'}
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
              secureTextEntry
            />
          </View>
        </View>

        {/* Role picker — only for signup */}
        {mode === 'SIGNUP' && (
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
        )}

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
            colors={(isFormValid ? Colors.gradients.accent : ['#1E293B', '#0F172A']) as any}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <Text style={styles.actionBtnText}>
            {loading ? 'Processing...' : mode === 'LOGIN' ? 'Sign In' : 'Create Account'}
          </Text>
          {!loading && <Feather name="arrow-right" size={20} color={isFormValid ? Colors.background : Colors.textSecondary} />}
        </P>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 28, gap: 24 },
  header: { alignItems: 'center' },
  logoWrap: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  title: { fontSize: 32, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },

  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 4, gap: 4 },
  modeBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  modeBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  modeText: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  modeTextActive: { color: Colors.text },
  form: { gap: 16 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: -4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  input: { flex: 1, height: 52, color: Colors.text, fontSize: 15 },
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
