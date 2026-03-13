import { View, Text, StyleSheet, FlatList, Pressable, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useData, LeaveRequest } from '@/contexts/DataContext';
import { Card, StatusBadge, getStatusType, formatStatus, EmptyState, FAB } from '@/components/ui';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

type FilterType = 'All' | 'Pending' | 'Approved' | 'Rejected';

const P = Pressable as any;

// ── Workload Analysis Types ──────────────────────────────────────────────────

interface WorkloadAnalysis {
  recommendation: 'Approve Leave' | 'Review Carefully';
  workloadScore: number;
  workloadLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  explanation: string;
  factors: {
    teamSize: number;
    overlappingLeaves: number;
    overlapRatio: number;
    leaveDurationDays: number;
    recentLeaveCount: number;
    pendingApprovals: number;
  };
}

// ── AI Insight Card Component ────────────────────────────────────────────────

function AIInsightCard({ leaveId }: { leaveId: string }) {
  const [analysis, setAnalysis] = useState<WorkloadAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        setLoading(true);
        const data = await apiClient.getLeaveWorkloadAnalysis(leaveId);
        setAnalysis(data);
      } catch (err) {
        console.error('Workload analysis failed:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [leaveId]);

  if (error) return null;

  if (loading) {
    return (
      <View style={aiStyles.card}>
        <View style={aiStyles.shimmerRow}>
          <View style={aiStyles.shimmerIcon} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={[aiStyles.shimmerLine, { width: '60%' }]} />
            <View style={[aiStyles.shimmerLine, { width: '80%' }]} />
            <View style={[aiStyles.shimmerLine, { width: '40%' }]} />
          </View>
        </View>
      </View>
    );
  }

  if (!analysis) return null;

  const isApprove = analysis.recommendation === 'Approve Leave';
  const recColor = isApprove ? Colors.success : Colors.warning;

  const levelColors: Record<string, string> = {
    Low: Colors.success,
    Moderate: Colors.accent,
    High: Colors.warning,
    Critical: Colors.error,
  };
  const levelColor = levelColors[analysis.workloadLevel] || Colors.accent;

  return (
    <View style={aiStyles.card}>
      {/* Header */}
      <View style={aiStyles.header}>
        <View style={aiStyles.aiIconWrap}>
          <Text style={aiStyles.aiIcon}>🤖</Text>
        </View>
        <Text style={aiStyles.headerTitle}>AI Workload Insight</Text>
        <View style={[aiStyles.levelBadge, { backgroundColor: levelColor + '20', borderColor: levelColor + '40' }]}> 
          <Text style={[aiStyles.levelText, { color: levelColor }]}>{analysis.workloadLevel}</Text>
        </View>
      </View>

      {/* Recommendation */}
      <View style={[aiStyles.recRow, { backgroundColor: recColor + '10', borderColor: recColor + '25' }]}>
        <Feather name={isApprove ? 'check-circle' : 'alert-triangle'} size={16} color={recColor} />
        <Text style={[aiStyles.recText, { color: recColor }]}>{analysis.recommendation}</Text>
      </View>

      {/* Score Bar */}
      <View style={aiStyles.scoreSection}>
        <View style={aiStyles.scoreLabelRow}>
          <Text style={aiStyles.scoreLabel}>Workload Score</Text>
          <Text style={[aiStyles.scoreValue, { color: levelColor }]}>{analysis.workloadScore}/100</Text>
        </View>
        <View style={aiStyles.barTrack}>
          <View
            style={[
              aiStyles.barFill,
              {
                width: `${Math.max(analysis.workloadScore, 3)}%`,
                backgroundColor: levelColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Factors */}
      <View style={aiStyles.factorsRow}>
        <View style={aiStyles.factorChip}>
          <Feather name="users" size={11} color={Colors.textSecondary} />
          <Text style={aiStyles.factorText}>{analysis.factors.teamSize} team</Text>
        </View>
        <View style={aiStyles.factorChip}>
          <Feather name="layers" size={11} color={Colors.textSecondary} />
          <Text style={aiStyles.factorText}>{analysis.factors.overlappingLeaves} overlap</Text>
        </View>
        <View style={aiStyles.factorChip}>
          <Feather name="clock" size={11} color={Colors.textSecondary} />
          <Text style={aiStyles.factorText}>{analysis.factors.leaveDurationDays}d</Text>
        </View>
        <View style={aiStyles.factorChip}>
          <Feather name="activity" size={11} color={Colors.textSecondary} />
          <Text style={aiStyles.factorText}>{analysis.factors.recentLeaveCount} recent</Text>
        </View>
      </View>

      {/* Explanation */}
      <Text style={aiStyles.explanation}>{analysis.explanation}</Text>
    </View>
  );
}

// ── AI Insight Card Styles ───────────────────────────────────────────────────

const aiStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(6, 182, 212, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIcon: { fontSize: 15 },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  recText: {
    fontSize: 15,
    fontWeight: '800',
  },
  scoreSection: { gap: 6 },
  scoreLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  factorsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  factorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  factorText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  explanation: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  // Shimmer / skeleton loading styles
  shimmerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  shimmerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  shimmerLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});

// ── Main HR Screen ───────────────────────────────────────────────────────────

export default function HRScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { leaves, leaveBalance, updateLeaveStatus, refreshData, projects } = useData();
  const [filter, setFilter] = useState<FilterType>('All');
  const [refreshing, setRefreshing] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const isApprover = user?.role === 'MANAGER' || user?.role === 'HR_ADMIN' || user?.role === 'SUPER_ADMIN';
  const isManager = user?.role === 'MANAGER';

  const filteredLeaves = useMemo(() => {
    let filtered = leaves;
    if (filter === 'Pending') filtered = leaves.filter(l => l.status.startsWith('Pending'));
    if (filter === 'Approved') filtered = leaves.filter(l => l.status === 'Approved');
    if (filter === 'Rejected') filtered = leaves.filter(l => l.status === 'Rejected');
    return filtered;
  }, [leaves, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleApprove = useCallback(async (leave: LeaveRequest) => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateLeaveStatus(leave.id, 'Approved', user.id, user.name, 'Approved');
  }, [user, updateLeaveStatus]);

  const handleReject = useCallback(async (leave: LeaveRequest) => {
    if (!user) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await updateLeaveStatus(leave.id, 'Rejected', user.id, user.name, 'Rejected');
  }, [user, updateLeaveStatus]);

  const FILTERS: FilterType[] = ['All', 'Pending', 'Approved', 'Rejected'];

  const renderLeave = ({ item }: { item: LeaveRequest }) => {
    const project = projects.find(p => p.id === item.projectId);
    const showAICard = isManager && item.status.startsWith('Pending');
    return (
      <Card style={styles.leaveCard}>
        <View style={styles.leaveHeader}>
          <View style={styles.leaveTypeWrap}>
            <Feather name="calendar" size={14} color={Colors.accent} />
            <Text style={styles.leaveType}>{item.leaveType}</Text>
          </View>
          <StatusBadge label={formatStatus(item.status)} type={getStatusType(item.status)} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <Text style={styles.leaveName}>{item.employeeName}</Text>
          {project && (
            <View style={{ backgroundColor: Colors.accent + '14', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, color: Colors.accent, fontWeight: '700' }}>{project.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.leaveDates}>
          <Feather name="clock" size={13} color={Colors.textTertiary} />
          <Text style={styles.leaveDateText}>{item.startDate} to {item.endDate}</Text>
        </View>
        {item.reason ? <Text style={styles.leaveReason} numberOfLines={2}>{item.reason}</Text> : null}

        {/* AI Workload Insight Card — Manager only, pending leaves */}
        {showAICard && <AIInsightCard leaveId={item.id} />}

        {isApprover && item.status.startsWith('Pending') && (
          <View style={styles.actionRow}>
            <P onPress={() => handleApprove(item)} style={({ pressed }: any) => [styles.approveBtn, pressed && { opacity: 0.8 }]}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </P>
            <P onPress={() => handleReject(item)} style={({ pressed }: any) => [styles.rejectBtn, pressed && { opacity: 0.8 }]}>
              <Text style={styles.rejectBtnText}>Reject</Text>
            </P>
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: Colors.background }]}
      />
      <View style={[styles.headerArea, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.pageTitle}>Leaves</Text>
        <View style={styles.balanceStrip}>
          {[
            { label: 'Annual', val: leaveBalance.annual, color: Colors.accent },
            { label: 'Sick', val: leaveBalance.sick, color: Colors.success },
            { label: 'Personal', val: leaveBalance.personal, color: Colors.secondary },
          ].map((b, i) => (
            <View key={b.label} style={styles.balItem}>
              <Text style={[styles.balVal, { color: b.color }]}>{b.val}</Text>
              <Text style={styles.balLabel}>{b.label}</Text>
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
        data={filteredLeaves}
        renderItem={({ item }: { item: LeaveRequest }) => renderLeave({ item })}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 118 : 100 }]}
        scrollEnabled={!!filteredLeaves.length}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ListEmptyComponent={<EmptyState icon="calendar" title="No leave requests" subtitle="Tap + to submit a new leave request" />}
      />

      <FAB onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/new-leave'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerArea: { paddingHorizontal: 20, paddingBottom: 8 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: Colors.text, letterSpacing: -1, marginBottom: 12 },
  balanceStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 12 },
  balItem: { flex: 1, alignItems: 'center' },
  balVal: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  balLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: '700', textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
  filterTextActive: { color: Colors.background },
  list: { paddingHorizontal: 20, gap: 12 },
  leaveCard: { gap: 8 },
  leaveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  leaveTypeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaveType: { fontSize: 13, fontWeight: '800', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  leaveName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  leaveDates: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leaveDateText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  leaveReason: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, paddingVertical: 12, borderRadius: 12 },
  approveBtnText: { fontSize: 14, fontWeight: '800', color: Colors.background, textTransform: 'uppercase' },
  rejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251, 113, 133, 0.1)', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251, 113, 133, 0.2)' },
  rejectBtnText: { fontSize: 14, fontWeight: '800', color: Colors.error, textTransform: 'uppercase' },
});
