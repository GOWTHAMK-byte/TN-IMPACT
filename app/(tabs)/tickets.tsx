import { View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, Ticket, TicketStatus } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, EmptyState, FAB, PriorityIndicator } from '@/components/ui';
import { useState, useCallback, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

type FilterType = 'All' | 'Open' | 'In Progress' | 'Resolved';
const P = Pressable as any;

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
    if (hours < 1) return `${Math.floor(remaining / 60000)}m left`;
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d left`;
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
        <View style={styles.metaChip}><Feather name="tag" size={11} color={Colors.textSecondary} /><Text style={styles.metaText}>{item.category}</Text></View>
        <View style={[styles.metaChip, { backgroundColor: getSLAColor(item.slaDeadline) + '30' }]}>
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
                <P onPress={() => handleStatusChange(item.id, 'In_Progress')} style={[styles.statusBtn, { backgroundColor: Colors.accent }]}>
                  <Text style={styles.statusBtnText}>Start Work</Text>
                </P>
              )}
              {item.status === 'In_Progress' && (
                <P onPress={() => handleStatusChange(item.id, 'Resolved')} style={[styles.statusBtn, { backgroundColor: Colors.success }]}>
                  <Text style={styles.statusBtnText}>Resolve</Text>
                </P>
              )}
            </View>
          )}

          {item.comments.length > 0 && (
            <View style={styles.commentsSection}>
              <Text style={styles.commentsTitle}>Updates ({item.comments.length})</Text>
              {item.comments.map(c => (
                <View key={c.id} style={styles.commentItem}>
                  <Text style={styles.commentAuthor}>{c.authorName}</Text>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.addCommentRow}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Type update..."
              placeholderTextColor={Colors.textTertiary}
              style={styles.commentInput}
            />
            <P
              onPress={() => handleAddComment(item.id)}
              disabled={!commentText.trim()}
              style={({ pressed }: any) => [styles.sendBtn, pressed && { opacity: 0.7 }, !commentText.trim() && { opacity: 0.3 }]}
            >
              <Ionicons name="send" size={18} color={Colors.accent} />
            </P>
          </View>
        </View>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={Colors.gradients.background as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.headerArea, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.pageTitle}>IT Support</Text>
        <View style={styles.statsRow}>
          {[
            { lab: 'Open', val: tickets.filter(t => t.status === 'Open').length, col: Colors.accent },
            { lab: 'Active', val: tickets.filter(t => ['Assigned', 'In_Progress'].includes(t.status)).length, col: Colors.warning },
            { lab: 'Fixed', val: tickets.filter(t => t.status === 'Resolved').length, col: Colors.success },
          ].map(s => (
            <View key={s.lab} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.col }]}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.lab}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <P
            key={f}
            onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </P>
        ))}
      </View>

      <FlatList
        data={filteredTickets}
        renderItem={renderTicket}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        scrollEnabled={!!filteredTickets.length}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={<EmptyState icon="headphones" title="Tidied up!" subtitle="All support tickets are settled." />}
      />

      <FAB onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/new-ticket'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerArea: { paddingHorizontal: 20, paddingBottom: 8 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  filterTextActive: { color: Colors.background },
  list: { paddingHorizontal: 20, gap: 12 },
  ticketCard: { gap: 10 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  ticketTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ticketTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  ticketMeta: { flexDirection: 'row', gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  metaText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '700' },
  expandedContent: { gap: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  descLabel: { fontSize: 10, fontWeight: '800', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1 },
  descText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assignedText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  statusActions: { flexDirection: 'row', gap: 10 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  statusBtnText: { fontSize: 14, fontWeight: '800', color: Colors.background, textTransform: 'uppercase' },
  commentsSection: { gap: 10 },
  commentsTitle: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, textTransform: 'uppercase' },
  commentItem: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12, padding: 12, gap: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  commentContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  addCommentRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8 },
  commentInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  sendBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
});
