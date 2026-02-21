import { View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, Ticket, TicketStatus } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, EmptyState, FAB, PriorityIndicator } from '@/components/ui';
import { useState, useCallback, useMemo } from 'react';

type FilterType = 'All' | 'Open' | 'In Progress' | 'Resolved';

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { tickets, updateTicketStatus, addTicketComment, refreshData } = useData();
  const [filter, setFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const isITAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPER_ADMIN';

  const filteredTickets = useMemo(() => {
    if (filter === 'Open') return tickets.filter(t => t.status === 'Open');
    if (filter === 'In Progress') return tickets.filter(t => ['Assigned', 'In_Progress'].includes(t.status));
    if (filter === 'Resolved') return tickets.filter(t => ['Resolved', 'Closed'].includes(t.status));
    return tickets;
  }, [tickets, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleStatusChange = useCallback(async (ticketId: string, newStatus: TicketStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await updateTicketStatus(ticketId, newStatus);
  }, [updateTicketStatus]);

  const handleAddComment = useCallback(async (ticketId: string) => {
    if (!commentText.trim() || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addTicketComment(ticketId, { authorId: user.id, authorName: user.name, content: commentText.trim() });
    setCommentText('');
  }, [commentText, user, addTicketComment]);

  const FILTERS: FilterType[] = ['All', 'Open', 'In Progress', 'Resolved'];

  const getSLAColor = (deadline: string) => {
    const remaining = new Date(deadline).getTime() - Date.now();
    if (remaining < 0) return Colors.error;
    if (remaining < 4 * 3600000) return Colors.warning;
    return Colors.success;
  };

  const formatSLA = (deadline: string) => {
    const remaining = new Date(deadline).getTime() - Date.now();
    if (remaining < 0) return 'SLA breached';
    const hours = Math.floor(remaining / 3600000);
    if (hours < 1) return `${Math.floor(remaining / 60000)}m remaining`;
    if (hours < 24) return `${hours}h remaining`;
    return `${Math.floor(hours / 24)}d remaining`;
  };

  const isExpanded = (id: string) => expandedTicket === id;

  const renderTicket = ({ item }: { item: Ticket }) => (
    <Card
      style={styles.ticketCard}
      onPress={() => {
        Haptics.selectionAsync();
        setExpandedTicket(isExpanded(item.id) ? null : item.id);
      }}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketTitleRow}>
          <PriorityIndicator priority={item.priority} />
          <Text style={styles.ticketTitle} numberOfLines={isExpanded(item.id) ? undefined : 1}>{item.title}</Text>
        </View>
        <StatusBadge label={formatStatus(item.status)} type={getStatusType(item.status)} />
      </View>

      <View style={styles.ticketMeta}>
        <View style={styles.metaChip}><Feather name="tag" size={11} color={Colors.textTertiary} /><Text style={styles.metaText}>{item.category}</Text></View>
        <View style={styles.metaChip}><Feather name="flag" size={11} color={Colors.textTertiary} /><Text style={styles.metaText}>{item.priority}</Text></View>
        <View style={[styles.metaChip, { backgroundColor: getSLAColor(item.slaDeadline) + '14' }]}>
          <Feather name="clock" size={11} color={getSLAColor(item.slaDeadline)} />
          <Text style={[styles.metaText, { color: getSLAColor(item.slaDeadline) }]}>{formatSLA(item.slaDeadline)}</Text>
        </View>
      </View>

      {isExpanded(item.id) && (
        <View style={styles.expandedContent}>
          <Text style={styles.descLabel}>Description</Text>
          <Text style={styles.descText}>{item.description}</Text>

          {item.assignedToName && (
            <View style={styles.assignedRow}>
              <Feather name="user" size={13} color={Colors.textSecondary} />
              <Text style={styles.assignedText}>Assigned to {item.assignedToName}</Text>
            </View>
          )}

          {isITAdmin && !['Resolved', 'Closed'].includes(item.status) && (
            <View style={styles.statusActions}>
              {item.status === 'Open' && (
                <Pressable onPress={() => handleStatusChange(item.id, 'In_Progress')} style={[styles.statusBtn, { backgroundColor: Colors.accent }]}>
                  <Text style={styles.statusBtnText}>Start Work</Text>
                </Pressable>
              )}
              {item.status === 'In_Progress' && (
                <Pressable onPress={() => handleStatusChange(item.id, 'Resolved')} style={[styles.statusBtn, { backgroundColor: Colors.success }]}>
                  <Text style={styles.statusBtnText}>Resolve</Text>
                </Pressable>
              )}
              {item.status === 'Assigned' && (
                <Pressable onPress={() => handleStatusChange(item.id, 'In_Progress')} style={[styles.statusBtn, { backgroundColor: Colors.accent }]}>
                  <Text style={styles.statusBtnText}>Start Work</Text>
                </Pressable>
              )}
            </View>
          )}

          {item.comments.length > 0 && (
            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>Comments ({item.comments.length})</Text>
              {item.comments.map(c => (
                <View key={c.id} style={styles.commentItem}>
                  <Text style={styles.commentAuthor}>{c.authorName}</Text>
                  <Text style={styles.commentContent}>{c.content}</Text>
                  <Text style={styles.commentTime}>{new Date(c.createdAt).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.addCommentRow}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.textTertiary}
              style={styles.commentInput}
            />
            <Pressable
              onPress={() => handleAddComment(item.id)}
              disabled={!commentText.trim()}
              style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.7 }, !commentText.trim() && { opacity: 0.3 }]}
            >
              <Feather name="send" size={16} color={Colors.accent} />
            </Pressable>
          </View>
        </View>
      )}
    </Card>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>IT Support</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{tickets.filter(t => t.status === 'Open').length}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{tickets.filter(t => ['Assigned', 'In_Progress'].includes(t.status)).length}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.success }]}>{tickets.filter(t => t.status === 'Resolved').length}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f}
            onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredTickets}
        renderItem={renderTicket}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        scrollEnabled={!!filteredTickets.length}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        ListEmptyComponent={<EmptyState icon="headphones" title="No tickets" subtitle="Tap + to create a new IT support ticket" />}
      />

      <FAB onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/new-ticket'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerArea: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, fontFamily: 'Inter_700Bold' },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  statItem: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.accent, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, gap: 10 },
  ticketCard: { gap: 8 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  ticketTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ticketTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1, fontFamily: 'Inter_600SemiBold' },
  ticketMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  metaText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  expandedContent: { gap: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 12 },
  descLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assignedText: { fontSize: 13, color: Colors.textSecondary },
  statusActions: { flexDirection: 'row', gap: 10 },
  statusBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  statusBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  commentsSection: { gap: 8 },
  commentsTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  commentItem: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 4 },
  commentAuthor: { fontSize: 12, fontWeight: '600', color: Colors.text },
  commentContent: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  commentTime: { fontSize: 11, color: Colors.textTertiary },
  addCommentRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  commentInput: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: Colors.inputBorder },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
