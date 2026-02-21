import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData, Notification, NotificationType } from '@/contexts/DataContext';
import { EmptyState } from '@/components/ui';

const typeConfig: Record<NotificationType, { icon: string; color: string }> = {
  action_required: { icon: 'alert-circle', color: Colors.warning },
  status_update: { icon: 'refresh-cw', color: Colors.accent },
  announcement: { icon: 'volume-2', color: Colors.secondary },
  escalation: { icon: 'alert-triangle', color: Colors.error },
};

export default function NotificationsScreen() {
  const { notifications, markNotificationRead } = useData();

  const handlePress = async (notif: Notification) => {
    if (!notif.isRead) {
      Haptics.selectionAsync();
      await markNotificationRead(notif.id);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const config = typeConfig[item.type];
    return (
      <Pressable
        onPress={() => handlePress(item)}
        style={({ pressed }) => [styles.notifItem, !item.isRead && styles.unread, pressed && { opacity: 0.9 }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: config.color + '14' }]}>
          <Feather name={config.icon as any} size={18} color={config.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>{item.title}</Text>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.dot} />}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 54 : 34 }]}
        scrollEnabled={!!notifications.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState icon="bell" title="No notifications" subtitle="You're all caught up" />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: 0 },
  notifItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12, backgroundColor: Colors.card },
  unread: { backgroundColor: Colors.accentLight + '44' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: Colors.text },
  notifTitleUnread: { fontWeight: '700' },
  notifBody: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.textTertiary, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  separator: { height: 1, backgroundColor: Colors.divider },
});
