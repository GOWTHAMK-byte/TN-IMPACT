import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, ZoomIn } from 'react-native-reanimated';
import Colors from '@/constants/colors';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const statusColors: Record<StatusType, { bg: string; text: string }> = {
  success: { bg: 'rgba(52, 211, 153, 0.15)', text: '#34D399' },
  warning: { bg: 'rgba(251, 191, 36, 0.15)', text: '#FBBF24' },
  error: { bg: 'rgba(251, 113, 133, 0.15)', text: '#FB7185' },
  info: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38BDF8' },
  neutral: { bg: 'rgba(255, 255, 255, 0.05)', text: '#94A3B8' },
};

const P = Pressable as any;

export function StatusBadge({ label, type = 'neutral' }: { label: string; type?: StatusType }) {
  const colors = statusColors[type];
  return (
    <Animated.View
      entering={FadeInRight.delay(200).duration(400)}
      style={[styles.badge, { backgroundColor: colors.bg }]}
    >
      <View style={[styles.badgeDot, { backgroundColor: colors.text }]} />
      <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
    </Animated.View>
  );
}

export function getStatusType(status: string): StatusType {
  if (['Approved', 'Resolved', 'Closed', 'Paid'].includes(status)) return 'success';
  if (['Rejected', 'Escalated'].includes(status)) return 'error';
  if (['Pending_Manager', 'Pending_HR', 'Pending_Finance', 'In_Progress', 'Assigned'].includes(status)) return 'warning';
  if (['Submitted', 'Open'].includes(status)) return 'info';
  return 'neutral';
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

export function Card({ children, style, onPress, delay = 0 }: { children: React.ReactNode; style?: any; onPress?: () => void; delay?: number }) {
  const Wrapper = (onPress ? P : View) as any;
  const animatedProps = delay > 0 ? { entering: FadeInUp.delay(delay).duration(500) } : {};

  return (
    <Animated.View
      {...animatedProps}
      style={[styles.cardContainer, style]}
    >
      <Wrapper
        onPress={onPress}
        style={({ pressed }: any) => [
          styles.card,
          onPress && pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
        ]}
      >
        {children}
      </Wrapper>
    </Animated.View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Feather name={icon as any} size={32} color={Colors.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <P onPress={onAction} hitSlop={8} style={({ pressed }: any) => [pressed && { opacity: 0.7 }]}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </P>
      )}
    </View>
  );
}

export function Avatar({ initials, size = 40, color }: { initials: string; size?: number; color?: string }) {
  const bg = color || Colors.accent;
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export function PriorityIndicator({ priority }: { priority: string }) {
  const color = priority === 'Critical' ? Colors.error : priority === 'High' ? Colors.warning : priority === 'Medium' ? Colors.accent : Colors.textTertiary;
  return (
    <View style={[styles.priorityDot, { backgroundColor: color }]} />
  );
}

export function FAB({ onPress, icon = 'plus' }: { onPress: () => void; icon?: string }) {
  return (
    <Animated.View entering={ZoomIn.delay(600)} style={styles.fabContainer}>
      <P
        onPress={onPress}
        style={({ pressed }: any) => [styles.fab, pressed && { transform: [{ scale: 0.9 }] }]}
      >
        <LinearGradient
          colors={Colors.gradients.accent as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabInner}
        >
          <Feather name={icon as any} size={24} color="#fff" />
        </LinearGradient>
      </P>
    </Animated.View>
  );
}

export function GradientButton({ title, onPress, colors, icon, style }: { title: string; onPress: () => void; colors?: string[]; icon?: string; style?: any }) {
  return (
    <View style={[styles.gradientBtn, style]}>
      <P onPress={onPress} style={({ pressed }: any) => [pressed && { opacity: 0.85 }]}>
        <LinearGradient
          colors={(colors || Colors.gradients.accent) as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBtnInner}
        >
          {icon && <Feather name={icon as any} size={18} color="#fff" style={{ marginRight: 8 }} />}
          <Text style={styles.gradientBtnText}>{title}</Text>
        </LinearGradient>
      </P>
    </View>
  );
}

export function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <Feather name={icon as any} size={16} color={Colors.textSecondary} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardContainer: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.divider,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'web' ? 40 : 20,
    zIndex: 100,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradientBtnInner: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});
