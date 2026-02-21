import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth, getRoleLabel, getRoleBadgeColor } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Avatar, Card } from '@/components/ui';

const MENU_ITEMS = [
  { id: 'profile', icon: 'user', label: 'My Profile', route: '/profile', color: Colors.accent },
  { id: 'notifications', icon: 'bell', label: 'Notifications', route: '/notifications', color: '#6366F1' },
  { id: 'directory', icon: 'book', label: 'Employee Directory', route: '/directory', color: '#10B981' },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { unreadCount } = useData();

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>More</Text>

        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar initials={user?.avatar || 'U'} size={52} color={getRoleBadgeColor(user?.role || 'EMPLOYEE')} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileTitle}>{user?.title}</Text>
              <View style={[styles.roleChip, { backgroundColor: getRoleBadgeColor(user?.role || 'EMPLOYEE') + '18' }]}>
                <Text style={[styles.roleChipText, { color: getRoleBadgeColor(user?.role || 'EMPLOYEE') }]}>{getRoleLabel(user?.role || 'EMPLOYEE')}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => { Haptics.selectionAsync(); router.push('/profile'); }}
              hitSlop={8}
            >
              <Feather name="chevron-right" size={20} color={Colors.textTertiary} />
            </Pressable>
          </View>
        </Card>

        <View style={styles.menuSection}>
          {MENU_ITEMS.map(item => (
            <Pressable
              key={item.id}
              onPress={() => { Haptics.selectionAsync(); router.push(item.route as any); }}
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#F1F5F9' }]}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '14' }]}>
                <Feather name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <View style={styles.menuRight}>
                {item.id === 'notifications' && unreadCount > 0 && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{unreadCount}</Text>
                  </View>
                )}
                <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#F1F5F9' }]}>
              <Feather name="info" size={18} color={Colors.textSecondary} />
            </View>
            <Text style={styles.menuLabel}>App Version</Text>
            <Text style={styles.menuMeta}>1.0.0</Text>
          </View>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
        >
          <Feather name="log-out" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 20 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, fontFamily: 'Inter_700Bold' },
  profileCard: { padding: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.text, fontFamily: 'Inter_700Bold' },
  profileTitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  roleChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 },
  roleChipText: { fontSize: 11, fontWeight: '600' },
  menuSection: { backgroundColor: Colors.card, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.cardBorder },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  menuBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  menuMeta: { fontSize: 13, color: Colors.textTertiary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.errorLight, paddingVertical: 14, borderRadius: 14 },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.error },
});
