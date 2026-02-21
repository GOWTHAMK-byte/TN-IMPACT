import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import Colors from '@/app/components/constants/colors';
type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const statusColors: Record<StatusType, { bg: string; text: string }> = {
  success: { bg: Colors.successLight, text: '#047857' },
  warning: { bg: Colors.warningLight, text: '#92400E' },
  error: { bg: Colors.errorLight, text: '#991B1B' },
  info: { bg: Colors.accentLight, text: '#0369A1' },
  neutral: { bg: '#F1F5F9', text: '#475569' },
};

export function StatusBadge({ label, type = 'neutral' }: { label: string; type?: StatusType }) {
  const colors = statusColors[type];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{label}</Text>
    </View>
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

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: object; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
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
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.92 }] }]}
    >
      <Feather name={icon as any} size={24} color="#fff" />
    </Pressable>
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
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    backgroundColor: Colors.background,
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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'web' ? 100 : 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
});
