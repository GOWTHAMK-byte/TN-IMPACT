import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, Pressable,
    Platform, Modal, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth, getRoleBadgeColor, type User } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Avatar, EmptyState, GradientButton } from '@/components/ui';
import { apiClient } from '@/lib/api';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    title: string;
    avatar: string;
    managerId?: string | null;
}

export default function ManageTeamScreen() {
    const { user: currentUser } = useAuth();
    const isManager = currentUser?.role === 'MANAGER';
    const router = useRouter();

    // Resolve the team's manager ID
    const teamManagerId = isManager ? currentUser?.id : currentUser?.managerId;

    // -- My Team state --
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // -- Add Employee Modal state --
    const [isModalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<TeamMember[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [addingId, setAddingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    // ── Fetch team ──────────────────────────────────────────────────────────

    const fetchTeam = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await apiClient.getMyTeam();
            setTeamMembers(data);
        } catch (err) {
            console.error('Failed to load team:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeam();
    }, [fetchTeam]);

    const { unreadChatCounts: unreadCounts } = useData();

    // ── Search employees ───────────────────────────────────────────────────

    const handleSearch = useCallback(async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            setIsSearching(true);
            const data = await apiClient.searchEmployeesForTeam(query.trim());
            setSearchResults(data);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    }, []);

    // Filter out employees already on the team from search results
    const teamMemberIds = useMemo(() => new Set(teamMembers.map(m => m.id)), [teamMembers]);
    const filteredSearchResults = useMemo(
        () => searchResults.filter(u => !teamMemberIds.has(u.id)),
        [searchResults, teamMemberIds],
    );

    // ── Add member ─────────────────────────────────────────────────────────

    const handleAdd = useCallback(async (employeeId: string) => {
        setAddingId(employeeId);
        try {
            await apiClient.addTeamMember(employeeId);
            await fetchTeam();
            // Remove from search results
            setSearchResults(prev => prev.filter(u => u.id !== employeeId));
        } catch (err: any) {
            const msg = err?.message || 'Failed to add employee';
            Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
        } finally {
            setAddingId(null);
        }
    }, [fetchTeam]);

    // ── Remove member ──────────────────────────────────────────────────────

    const handleRemove = useCallback(async (employeeId: string) => {
        const doRemove = async () => {
            setRemovingId(employeeId);
            try {
                await apiClient.removeTeamMember(employeeId);
                setTeamMembers(prev => prev.filter(m => m.id !== employeeId));
            } catch (err: any) {
                const msg = err?.message || 'Failed to remove employee';
                Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
            } finally {
                setRemovingId(null);
            }
        };

        if (Platform.OS === 'web') {
            if (confirm('Remove this employee from your team?')) doRemove();
        } else {
            Alert.alert('Remove Team Member', 'Remove this employee from your team?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: doRemove },
            ]);
        }
    }, []);

    // ── Render helpers ─────────────────────────────────────────────────────

    const renderTeamMember = ({ item }: { item: TeamMember }) => (
        <View style={styles.memberCard}>
            <Avatar initials={item.avatar || item.name.substring(0, 2).toUpperCase()} size={44} color={getRoleBadgeColor(item.role as any)} />
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberTitle}>{item.title}</Text>
                <View style={[styles.deptChip, { backgroundColor: getRoleBadgeColor(item.role as any) + '14' }]}>
                    <Text style={[styles.deptText, { color: getRoleBadgeColor(item.role as any) }]}>{item.department}</Text>
                </View>
            </View>
            {/* Chat icon for private DM */}
            {item.id !== currentUser?.id && teamManagerId && (
                <Pressable
                    onPress={() => router.push({
                        pathname: '/private-chat',
                        params: { userId: item.id, userName: item.name, managerId: teamManagerId },
                    })}
                    style={({ pressed }) => [styles.dmBtn, pressed && { opacity: 0.6 }]}
                    hitSlop={8}
                >
                    <Feather name="message-square" size={16} color={Colors.accent} />
                    {(unreadCounts?.private?.[item.id] || 0) > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                                {unreadCounts.private[item.id] > 9 ? '9+' : unreadCounts.private[item.id]}
                            </Text>
                        </View>
                    )}
                </Pressable>
            )}
            {isManager && (
                <Pressable
                    onPress={() => handleRemove(item.id)}
                    style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.6 }]}
                    hitSlop={8}
                    disabled={removingId === item.id}
                >
                    {removingId === item.id ? (
                        <ActivityIndicator size="small" color={Colors.error} />
                    ) : (
                        <Feather name="x" size={18} color={Colors.error} />
                    )}
                </Pressable>
            )}
        </View>
    );

    const renderSearchResult = ({ item }: { item: TeamMember }) => (
        <View style={styles.searchResultCard}>
            <Avatar initials={item.avatar || item.name.substring(0, 2).toUpperCase()} size={40} color={getRoleBadgeColor(item.role as any)} />
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberTitle}>{item.title} · {item.department}</Text>
            </View>
            <Pressable
                onPress={() => handleAdd(item.id)}
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                disabled={addingId === item.id}
            >
                {addingId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={styles.addBtnText}>Add</Text>
                )}
            </Pressable>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header section */}
            <View style={styles.headerSection}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.sectionTitle}>My Team</Text>
                        <Text style={styles.sectionSubtitle}>
                            {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    {teamManagerId && teamMembers.length > 0 && (
                        <Pressable
                            onPress={() => router.push({
                                pathname: '/team-chat',
                                params: { managerId: teamManagerId, teamName: `${isManager ? 'My' : currentUser?.name?.split(' ')[0] + "'s"} Team` },
                            })}
                            style={({ pressed }) => [styles.chatBtn, pressed && { opacity: 0.7 }]}
                        >
                            <Feather name="message-circle" size={18} color="#fff" />
                            <Text style={styles.chatBtnText}>Team Chat</Text>
                            {(unreadCounts?.team || 0) > 0 && (
                                <View style={styles.unreadBadgeHero}>
                                    <Text style={styles.unreadBadgeText}>
                                        {unreadCounts.team > 9 ? '9+' : unreadCounts.team}
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Team list */}
            {isLoading ? (
                <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={teamMembers}
                    renderItem={renderTeamMember}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[styles.list, { paddingBottom: isManager ? (Platform.OS === 'web' ? 140 : 120) : (Platform.OS === 'web' ? 100 : 80) }]}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <EmptyState
                            icon="users"
                            title="No team members yet"
                            subtitle={isManager ? "Tap the button below to add employees to your team" : "You haven't been assigned to a team yet"}
                        />
                    }
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                />
            )}

            {/* + Add Employee button (Manager only) */}
            {isManager && (
                <View style={styles.fabContainer}>
                    <GradientButton
                        title="+ Add Employee"
                        onPress={() => { setModalVisible(true); setSearchQuery(''); setSearchResults([]); }}
                        style={styles.fab}
                    />
                </View>
            )}

            {/* Add Employee Modal (Manager only) */}
            {isManager && (
                <Modal
                    visible={isModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Employee</Text>
                            <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                                <Feather name="x" size={24} color={Colors.text} />
                            </Pressable>
                        </View>

                        {/* Search bar */}
                        <View style={styles.searchWrap}>
                            <Feather name="search" size={16} color={Colors.textTertiary} />
                            <TextInput
                                value={searchQuery}
                                onChangeText={handleSearch}
                                placeholder="Search employee name..."
                                placeholderTextColor={Colors.textTertiary}
                                style={styles.searchInput}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }} hitSlop={8}>
                                    <Feather name="x" size={16} color={Colors.textTertiary} />
                                </Pressable>
                            )}
                        </View>

                        {/* Search results */}
                        {isSearching ? (
                            <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 30 }} />
                        ) : searchQuery.trim().length < 2 ? (
                            <View style={styles.hintContainer}>
                                <Feather name="search" size={32} color={Colors.textTertiary} />
                                <Text style={styles.hintText}>Type at least 2 characters to search</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredSearchResults}
                                renderItem={renderSearchResult}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.searchList}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={
                                    <EmptyState
                                        icon="users"
                                        title="No employees found"
                                        subtitle="Try a different search term"
                                    />
                                }
                                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                            />
                        )}
                    </View>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    headerSection: {
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    chatBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.accent, paddingHorizontal: 16, height: 36, borderRadius: 18,
        overflow: 'visible',
    },
    chatBtnText: {
        color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: 'Inter_700Bold',
    },
    sectionTitle: {
        fontSize: 20, fontWeight: '700', color: Colors.text, fontFamily: 'Inter_700Bold',
    },
    sectionSubtitle: {
        fontSize: 13, color: Colors.textSecondary, marginTop: 4,
    },

    list: { paddingHorizontal: 20, paddingTop: 8 },

    memberCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: Colors.card, padding: 14, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.cardBorder,
    },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '600', color: Colors.text, fontFamily: 'Inter_600SemiBold' },
    memberTitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    deptChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
    deptText: { fontSize: 11, fontWeight: '600' },

    removeBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.errorLight,
        alignItems: 'center', justifyContent: 'center',
    },
    dmBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.accentLight,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'visible', zIndex: 1,
    },

    fabContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'web' ? 24 : 34,
        paddingTop: 12,
        backgroundColor: Colors.background,
        borderTopWidth: 1, borderTopColor: Colors.divider,
    },
    fab: { borderRadius: 14 },

    // Modal styles
    modalContent: {
        flex: 1, backgroundColor: Colors.background,
        padding: 20, paddingTop: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, fontFamily: 'Inter_700Bold' },

    searchWrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14,
        borderWidth: 1, borderColor: Colors.inputBorder,
    },
    searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: Colors.text },

    hintContainer: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
    },
    hintText: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },

    searchList: { paddingTop: 16, paddingBottom: 20 },

    searchResultCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: Colors.card, padding: 12, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.cardBorder,
    },

    addBtn: {
        backgroundColor: Colors.accent, paddingHorizontal: 18, paddingVertical: 8,
        borderRadius: 8,
    },
    addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    unreadBadge: {
        position: 'absolute', top: -6, right: -6, zIndex: 10, elevation: 10,
        backgroundColor: Colors.error, minWidth: 16, height: 16, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: Colors.card, paddingHorizontal: 3,
    },
    unreadBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

    unreadBadgeHero: {
        position: 'absolute', top: -6, right: -6, zIndex: 10, elevation: 10,
        backgroundColor: Colors.error, minWidth: 18, height: 18, borderRadius: 9,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.background, paddingHorizontal: 4,
    },
});
