import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Dimensions, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
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

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, register, loginWithGoogle, isAuthenticated, loginWithMfa } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  // Authentication routing is now handled globally in app/_layout.tsx

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (Platform.OS === 'web') {
        alert(err.message || 'Google Sign-In failed. Please try again.');
      } else {
        Alert.alert('Sign-In Failed', err.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAction = async () => {
    setLoading(true);
    try {
      if (mode === 'LOGIN') {
        if (!email || !password) return;
        const res = await login(email, password);
        if (res?.mfaRequired) {
          setMfaPending(true);
          setMfaToken(res.mfaToken || null);
          setLoading(false);
          return; // Stop here, wait for MFA code to be submitted
        }
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

  const handleMfaSubmit = async () => {
    if (!mfaToken || mfaCode.length < 6) return;
    setLoading(true);
    try {
      await loginWithMfa(mfaToken, mfaCode);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('MFA submit failed:', err);
      if (Platform.OS === 'web') {
        alert(err.message || 'MFA validation failed.');
      } else {
        Alert.alert('Error', err.message || 'MFA validation failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = mode === 'LOGIN'
    ? (!!email && !!password)
    : (!!name && !!email && !!password && !!selectedRole);

  const isMfaValid = mfaCode.length === 6;

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
            <Ionicons name={mfaPending ? "shield-checkmark" : "sparkles"} size={32} color={Colors.background} />
          </View>
          <Text style={styles.title}>{mfaPending ? 'Email Verification' : 'Impact Hub'}</Text>
          <Text style={styles.subtitle}>{mfaPending ? 'Enter the OTP sent to your email' : (mode === 'LOGIN' ? 'Welcome back' : 'Join the team')}</Text>
        </View>

        {mfaPending ? (
          <View style={styles.mfaContainer}>
            <Text style={styles.inputLabel}>6-Digit Code</Text>
            <View style={styles.inputWrap}>
              <Feather name="shield" size={16} color={Colors.textTertiary} />
              <TextInput
                value={mfaCode}
                onChangeText={setMfaCode}
                placeholder="000000"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
                keyboardType="numeric"
                maxLength={6}
                autoFocus
              />
            </View>
            <P
              onPress={handleMfaSubmit}
              disabled={!isMfaValid || loading}
              style={({ pressed }: any) => [
                styles.actionBtn,
                { marginTop: 12 },
                !isMfaValid && styles.actionBtnDisabled,
                pressed && isMfaValid && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <LinearGradient
                colors={(isMfaValid ? Colors.gradients.accent : ['#1E293B', '#0F172A']) as any}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.actionBtnText}>{loading ? 'Verifying...' : 'Verify & Sign In'}</Text>
              {!loading && <Feather name="arrow-right" size={20} color={isMfaValid ? Colors.background : Colors.textSecondary} />}
            </P>
            <P style={{ alignItems: 'center', marginTop: 16 }} onPress={() => setMfaPending(false)}>
              <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Back to login</Text>
            </P>
          </View>
        ) : (
          <>
            {/* Google Sign-In Button */}
            <P
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              style={({ pressed }: any) => [
                styles.googleBtn,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
                googleLoading && { opacity: 0.6 },
              ]}
            >
              {!googleLoading && <GoogleLogo size={22} />}
              <Text style={styles.googleBtnText}>
                {googleLoading ? 'Signing in...' : 'Sign in with Google'}
              </Text>
            </P>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.dividerLine} />
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
          </>
        )}
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

  // Google Sign-In Button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  googleBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f1f1f',
    letterSpacing: 0.2,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 4, gap: 4 },
  mfaContainer: { gap: 16, marginTop: 16 },
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

