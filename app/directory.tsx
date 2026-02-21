import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { ALL_USERS, User, getRoleLabel, getRoleBadgeColor } from '@/contexts/AuthContext';
import { Avatar, EmptyState } from '@/components/ui';

const DEPARTMENTS = ['All', 'Engineering', 'Human Resources', 'IT', 'Finance', 'Executive'];

export default function DirectoryScreen() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  const filtered = useMemo(() => {
    let results = ALL_USERS;
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
  }, [search, deptFilter]);

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <Avatar initials={item.avatar} size={44} color={getRoleBadgeColor(item.role)} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userTitle}>{item.title}</Text>
        <View style={styles.userMeta}>
          <View style={[styles.deptChip, { backgroundColor: getRoleBadgeColor(item.role) + '14' }]}>
            <Text style={[styles.deptText, { color: getRoleBadgeColor(item.role) }]}>{item.department}</Text>
          </View>
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
    </View>
  );

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
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
    marginBottom: 8,
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
});
