import { View, Text, StyleSheet, ScrollView, Pressable, Platform, RefreshControl, TextInput, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, Ticket, TicketStatus } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, EmptyState, PriorityIndicator } from '@/components/ui';
import { useState, useCallback, useMemo } from 'react';

// ─── Service Catalogue Data ───────────────────────────────────────────────────

interface ServiceItem {
  id: string;
  label: string;
  icon: string;
  description: string;
}

interface CatalogueCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  items: ServiceItem[];
}

const CATALOGUE: CatalogueCategory[] = [
  {
    id: 'Hardware',
    label: 'Hardware',
    icon: 'hardware-chip-outline',
    color: '#F59E0B',
    items: [
      { id: 'request_laptop', label: 'Request Laptop', icon: 'laptop-outline', description: 'New or replacement laptop' },
      { id: 'request_monitor', label: 'Request Monitor', icon: 'desktop-outline', description: 'External display setup' },
      { id: 'request_phone', label: 'Request Phone', icon: 'phone-portrait-outline', description: 'Work mobile device' },
      { id: 'repair_replace', label: 'Repair / Replace', icon: 'build-outline', description: 'Fix or swap broken equipment' },
    ],
  },
  {
    id: 'Software',
    label: 'Software',
    icon: 'apps-outline',
    color: '#6366F1',
    items: [
      { id: 'adobe_license', label: 'Adobe CC License', icon: 'color-palette-outline', description: 'Creative Cloud suite' },
      { id: 'ms_office', label: 'Microsoft Office', icon: 'document-text-outline', description: 'Office 365 license' },
      { id: 'dev_tools', label: 'Dev Tools', icon: 'code-slash-outline', description: 'IDEs, SDKs & dev software' },
      { id: 'other_software', label: 'Other Software', icon: 'cube-outline', description: 'Any other application' },
    ],
  },
  {
    id: 'Access',
    label: 'Access & Permissions',
    icon: 'key-outline',
    color: '#06B6D4',
    items: [
      { id: 'vpn_access', label: 'VPN Access', icon: 'shield-checkmark-outline', description: 'Remote network access' },
      { id: 'shared_drive', label: 'Shared Drive Access', icon: 'folder-open-outline', description: 'Team drive permissions' },
      { id: 'system_account', label: 'System Account', icon: 'person-add-outline', description: 'New account or role change' },
      { id: 'password_reset', label: 'Password Reset', icon: 'lock-open-outline', description: 'Unlock or reset password' },
    ],
  },
  {
    id: 'Network',
    label: 'Network',
    icon: 'wifi-outline',
    color: '#10B981',
    items: [
      { id: 'connectivity', label: 'Connectivity Issue', icon: 'cloud-offline-outline', description: 'Internet or intranet down' },
      { id: 'wifi_setup', label: 'Wi-Fi Setup', icon: 'wifi-outline', description: 'Connect new device to network' },
      { id: 'firewall_request', label: 'Port / Firewall', icon: 'git-network-outline', description: 'Open port or firewall rule' },
    ],
  },
  {
    id: 'Other',
    label: 'Other',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#8B5CF6',
    items: [
      { id: 'general_request', label: 'General IT Request', icon: 'chatbox-ellipses-outline', description: 'Anything not listed above' },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

type FilterType = 'All' | 'Open' | 'In Progress' | 'Resolved';
const P = Pressable as any;

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { tickets, updateTicketStatus, addTicketComment, refreshData, projects } = useData();
  const [filter, setFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showMyTickets, setShowMyTickets] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const isITAdmin = user?.role === 'IT_ADMIN' || user?.role === 'SUPER_ADMIN';

  // Filter catalogue items by search
  const filteredCatalogue = useMemo(() => {
    if (!searchQuery.trim()) return CATALOGUE;
    const q = searchQuery.toLowerCase();
    return CATALOGUE.map(cat => ({
      ...cat,
      items: cat.items.filter(
        item => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)
      ),
    })).filter(cat => cat.items.length > 0);
  }, [searchQuery]);

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (filter === 'Open') result = tickets.filter(t => t.status === 'Open');
    else if (filter === 'In Progress') result = tickets.filter(t => ['Assigned', 'In_Progress'].includes(t.status));
    else if (filter === 'Resolved') result = tickets.filter(t => ['Resolved', 'Closed'].includes(t.status));
    return result;
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

  const handleItemPress = (category: string, itemId: string, itemLabel: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/new-ticket', params: { category, item: itemId, itemLabel } });
  };

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

  const renderTicket = (item: Ticket) => {
    const project = projects.find(p => p.id === item.projectId);
    return (
      <Card
        key={item.id}
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
          {project && (
            <View style={[styles.metaChip, { backgroundColor: Colors.accent + '20' }]}>
              <Feather name="briefcase" size={11} color={Colors.accent} />
              <Text style={[styles.metaText, { color: Colors.accent }]}>{project.name}</Text>
            </View>
          )}
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
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* ── Header ── */}
        <View style={[styles.headerArea, { paddingTop: insets.top + webTopInset + 12 }]}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>IT Services</Text>
              <Text style={styles.pageSubtitle}>Browse & request IT support</Text>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.headerStatPill}>
                <View style={[styles.statDot, { backgroundColor: Colors.accent }]} />
                <Text style={styles.headerStatText}>{tickets.filter(t => t.status === 'Open').length} open</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color={Colors.textTertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search services..."
            placeholderTextColor={Colors.textTertiary}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <P onPress={() => setSearchQuery('')} hitSlop={8}>
              <Feather name="x" size={16} color={Colors.textTertiary} />
            </P>
          )}
        </View>

        {/* ── Catalogue ── */}
        {filteredCatalogue.map((category, catIndex) => {
          const isCatExpanded = expandedCategory === category.id || searchQuery.length > 0;
          return (
            <Animated.View
              key={category.id}
              entering={FadeInUp.delay(catIndex * 80).duration(500)}
              style={styles.categorySection}
            >
              {/* Category Header */}
              <P
                onPress={() => {
                  Haptics.selectionAsync();
                  setExpandedCategory(isCatExpanded && !searchQuery ? null : category.id);
                }}
                style={({ pressed }: any) => [styles.categoryHeader, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: category.color + '18' }]}>
                  <Ionicons name={category.icon as any} size={20} color={category.color} />
                </View>
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <Text style={styles.categoryCount}>{category.items.length} service{category.items.length !== 1 ? 's' : ''}</Text>
                </View>
                <Animated.View style={{ transform: [{ rotate: isCatExpanded ? '90deg' : '0deg' }] }}>
                  <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
                </Animated.View>
              </P>

              {/* Service Items Grid */}
              {isCatExpanded && (
                <View style={styles.itemsGrid}>
                  {category.items.map((item, itemIndex) => (
                    <Animated.View
                      key={item.id}
                      entering={FadeInRight.delay(itemIndex * 60).duration(400)}
                      style={styles.itemCardWrapper}
                    >
                      <P
                        onPress={() => handleItemPress(category.id, item.id, item.label)}
                        style={({ pressed }: any) => [
                          styles.itemCard,
                          { borderColor: category.color + '25' },
                          pressed && { transform: [{ scale: 0.96 }], borderColor: category.color + '60' },
                        ]}
                      >
                        <View style={[styles.itemIconWrap, { backgroundColor: category.color + '12' }]}>
                          <Ionicons name={item.icon as any} size={22} color={category.color} />
                        </View>
                        <Text style={styles.itemLabel} numberOfLines={2}>{item.label}</Text>
                        <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                        <View style={[styles.itemArrow, { backgroundColor: category.color + '15' }]}>
                          <Feather name="arrow-right" size={12} color={category.color} />
                        </View>
                      </P>
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          );
        })}

        {filteredCatalogue.length === 0 && searchQuery.length > 0 && (
          <EmptyState icon="search" title="No services found" subtitle={`No results for "${searchQuery}"`} />
        )}

        {/* ── My Tickets Section ── */}
        <View style={styles.myTicketsSection}>
          <P
            onPress={() => { Haptics.selectionAsync(); setShowMyTickets(!showMyTickets); }}
            style={({ pressed }: any) => [styles.myTicketsHeader, pressed && { opacity: 0.8 }]}
          >
            <View style={styles.myTicketsHeaderLeft}>
              <Ionicons name="receipt-outline" size={20} color={Colors.accent} />
              <Text style={styles.myTicketsTitle}>My Tickets</Text>
              <View style={styles.ticketCountBadge}>
                <Text style={styles.ticketCountText}>{tickets.length}</Text>
              </View>
            </View>
            <Animated.View style={{ transform: [{ rotate: showMyTickets ? '90deg' : '0deg' }] }}>
              <Feather name="chevron-right" size={18} color={Colors.textTertiary} />
            </Animated.View>
          </P>

          {showMyTickets && (
            <View style={styles.ticketsContent}>
              {/* Filters */}
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

              {/* Ticket List */}
              {filteredTickets.length > 0 ? (
                filteredTickets.map(ticket => renderTicket(ticket))
              ) : (
                <EmptyState icon="headphones" title="Tidied up!" subtitle="All support tickets are settled." />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: 20, gap: 4 },

  // Header
  headerArea: { paddingBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pageTitle: { fontSize: 28, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
  pageSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, fontWeight: '500' },
  headerStats: { flexDirection: 'row', gap: 8, marginTop: 4 },
  headerStatPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.accent + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  headerStatText: { fontSize: 12, fontWeight: '700', color: Colors.accent },

  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
    marginTop: 12, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },

  // Category
  categorySection: {
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  categoryIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryInfo: { flex: 1 },
  categoryLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  categoryCount: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600', marginTop: 1 },

  // Items Grid
  itemsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, paddingBottom: 14, gap: 10,
  },
  itemCardWrapper: { width: '47%', flexGrow: 1 },
  itemCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: Colors.cardBorder,
    minHeight: 130,
  },
  itemIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  itemLabel: { fontSize: 13, fontWeight: '700', color: Colors.text, lineHeight: 18 },
  itemDesc: { fontSize: 11, color: Colors.textTertiary, lineHeight: 15, flex: 1 },
  itemArrow: {
    alignSelf: 'flex-end',
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  // My Tickets
  myTicketsSection: {
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  myTicketsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  myTicketsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  myTicketsTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  ticketCountBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.accent + '20',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  ticketCountText: { fontSize: 11, fontWeight: '800', color: Colors.accent },
  ticketsContent: { paddingHorizontal: 14, paddingBottom: 14 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
  filterTextActive: { color: Colors.background },

  // Ticket Card (kept from original)
  ticketCard: { gap: 10 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  ticketTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ticketTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  ticketMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
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
