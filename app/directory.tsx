import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, Platform, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { ALL_USERS, User, getRoleBadgeColor, useAuth } from '@/contexts/AuthContext';
import { Avatar, EmptyState, GradientButton } from '@/components/ui';
import { apiClient } from '@/lib/api';
import { useData } from '@/contexts/DataContext';

const DEPARTMENTS = ['All', 'Engineering', 'Human Resources', 'IT', 'Finance', 'Executive'];

export default function DirectoryScreen() {
  const { user: currentUser } = useAuth();
  const { projects } = useData();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  const [users, setUsers] = useState<(User & { projectId?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<(User & { projectId?: string }) | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Super Admin, HR Admin can assign projects. 
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'HR_ADMIN';

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getUsers();
      setUsers(data);
    } catch {
      setUsers(ALL_USERS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAssignProject = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await apiClient.updateUser(selectedUser.id, { projectId: selectedProjectId });
      setModalVisible(false);
      fetchUsers(); // Refresh the list
    } catch (err) {
      Alert.alert("Error", "Failed to assign project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    let results = users;
    if (deptFilter !== 'All') results = results.filter(u => u.department === deptFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q)
      );
    }
    return results;
  }, [search, deptFilter, users]);

  const renderUser = ({ item }: { item: User & { projectId?: string } }) => {
    const project = projects.find(p => p.id === item.projectId);

    return (
      <View style={styles.userCardWrap}>
        <Pressable
          style={({ pressed }) => [styles.userCard, pressed && isAdmin && { opacity: 0.8 }]}
          onPress={() => {
            if (isAdmin) {
              setSelectedUser(item);
              setSelectedProjectId(item.projectId || null);
              setModalVisible(true);
            }
          }}
          disabled={!isAdmin}
        >
          <Avatar initials={item.avatar} size={44} color={getRoleBadgeColor(item.role)} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userTitle}>{item.title}</Text>
            <View style={styles.userMeta}>
              <View style={[styles.deptChip, { backgroundColor: getRoleBadgeColor(item.role) + '14' }]}>
                <Text style={[styles.deptText, { color: getRoleBadgeColor(item.role) }]}>{item.department}</Text>
              </View>
              {project && (
                <View style={[styles.deptChip, { backgroundColor: Colors.accent + '14', marginLeft: 6 }]}>
                  <Text style={[styles.deptText, { color: Colors.accent }]}>{project.name}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.contactIcons}>
            <Pressable style={styles.contactBtn} hitSlop={8}>
              <Feather name="mail" size={16} color={Colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.contactBtn} hitSlop={8}>
              <Feather name="phone" size={16} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={Colors.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search employees..."
          placeholderTextColor={Colors.textTertiary}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Feather name="x" size={16} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <View style={styles.filterRow}>
        {DEPARTMENTS.map(dept => (
          <Pressable
            key={dept}
            onPress={() => setDeptFilter(dept)}
            style={[styles.filterChip, deptFilter === dept && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, deptFilter === dept && styles.filterTextActive]}>{dept}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 54 : 34 }]}
          scrollEnabled={!!filtered.length}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon="users" title="No employees found" subtitle="Try adjusting your search or filter" />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Assign Project Modal */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Project: {selectedUser?.name}</Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
              <Feather name="x" size={24} color={Colors.text} />
            </Pressable>
          </View>

          <Text style={styles.label}>Select a Project</Text>
          <ScrollView style={styles.projectList}>
            <Pressable
              style={[styles.projectSelectOption, selectedProjectId === null && styles.projectSelectOptionActive]}
              onPress={() => setSelectedProjectId(null)}
            >
              <Text style={[styles.projectSelectText, selectedProjectId === null && styles.projectSelectTextActive]}>None (Unassigned)</Text>
              {selectedProjectId === null && <Feather name="check" size={18} color={Colors.accent} />}
            </Pressable>
            {projects.map(p => (
              <Pressable
                key={p.id}
                style={[styles.projectSelectOption, selectedProjectId === p.id && styles.projectSelectOptionActive]}
                onPress={() => setSelectedProjectId(p.id)}
              >
                <Text style={[styles.projectSelectText, selectedProjectId === p.id && styles.projectSelectTextActive]}>{p.name}</Text>
                {selectedProjectId === p.id && <Feather name="check" size={18} color={Colors.accent} />}
              </Pressable>
            ))}
          </ScrollView>

          <GradientButton title={isSubmitting ? "Saving..." : "Save Assignment"} onPress={handleAssignProject} style={{ marginTop: 20 }} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 12,
    backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: Colors.inputBorder,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: Colors.text },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginVertical: 12, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 20, gap: 0 },
  userCardWrap: { marginBottom: 8 },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: Colors.text, fontFamily: 'Inter_600SemiBold' },
  userTitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  userMeta: { flexDirection: 'row', marginTop: 6 },
  deptChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  deptText: { fontSize: 11, fontWeight: '600' },
  contactIcons: { gap: 8 },
  contactBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  separator: { height: 0 },
  modalContent: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: Platform.OS === 'ios' ? 40 : 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  projectList: { flex: 1, marginTop: 8 },
  projectSelectOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: Colors.card, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  projectSelectOptionActive: { borderColor: Colors.accent, backgroundColor: Colors.inputBg },
  projectSelectText: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  projectSelectTextActive: { color: Colors.accent, fontWeight: '700' },
});
