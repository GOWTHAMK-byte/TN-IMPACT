import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform, TextInput, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { Card, EmptyState, FAB, GradientButton } from '@/components/ui';
import { Project } from '@shared/schema';
import { ALL_USERS } from '@/contexts/AuthContext';

export default function AdminProjectsScreen() {
    const insets = useSafeAreaInsets();
    const { projects, createProject, isLoading } = useData();
    const [isModalVisible, setModalVisible] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '', managerId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const webTopInset = Platform.OS === 'web' ? 67 : 0;

    const handleCreateProject = async () => {
        if (!newProject.name.trim()) {
            Alert.alert('Error', 'Project name is required');
            return;
        }
        setIsSubmitting(true);
        try {
            await createProject({
                name: newProject.name,
                description: newProject.description,
                managerId: newProject.managerId || undefined,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setModalVisible(false);
            setNewProject({ name: '', description: '', managerId: '' });
        } catch (error) {
            Alert.alert('Error', 'Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getManagerName = (managerId: string | null) => {
        if (!managerId) return "No manager assigned";
        const manager = ALL_USERS.find(u => u.id === managerId);
        return manager ? manager.name : "Unknown Manager";
    };

    const renderProject = ({ item }: { item: Project }) => (
        <Card style={styles.projectCard}>
            <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{item.name}</Text>
            </View>
            {item.description ? <Text style={styles.projectDesc} numberOfLines={2}>{item.description}</Text> : null}
            <View style={styles.managerRow}>
                <Feather name="user" size={14} color={Colors.textSecondary} />
                <Text style={styles.managerText}>{getManagerName(item.managerId)}</Text>
            </View>
        </Card>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.headerArea, { paddingTop: insets.top + webTopInset + 12 }]}>
                <View style={styles.headerTitleRow}>
                    <Pressable onPress={() => router.back()} hitSlop={10}>
                        <Feather name="arrow-left" size={24} color={Colors.text} />
                    </Pressable>
                    <Text style={styles.pageTitle}>Manage Projects</Text>
                </View>
            </View>

            <FlatList
                data={projects}
                renderItem={renderProject}
                keyExtractor={item => item.id}
                contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === 'web' ? 54 : 34 }]}
                scrollEnabled={!!projects.length}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={<EmptyState icon="briefcase" title="No projects found" subtitle="Tap + to create a new project" />}
            />

            <FAB onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setModalVisible(true); }} />

            <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Project</Text>
                        <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                            <Feather name="x" size={24} color={Colors.text} />
                        </Pressable>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Project Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={newProject.name}
                            onChangeText={t => setNewProject(p => ({ ...p, name: t }))}
                            placeholder="e.g. Website Redesign"
                            placeholderTextColor={Colors.textTertiary}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={newProject.description}
                            onChangeText={t => setNewProject(p => ({ ...p, description: t }))}
                            placeholder="What is this project about?"
                            placeholderTextColor={Colors.textTertiary}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Project Manager ID (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={newProject.managerId}
                            onChangeText={t => setNewProject(p => ({ ...p, managerId: t }))}
                            placeholder="Enter User ID of Manager"
                            placeholderTextColor={Colors.textTertiary}
                        />
                    </View>

                    <GradientButton title={isSubmitting ? "Creating..." : "Create Project"} onPress={handleCreateProject} style={{ marginTop: 20 }} />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerArea: { paddingHorizontal: 20, paddingBottom: 16 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pageTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, fontFamily: 'Inter_800ExtraBold' },
    list: { paddingHorizontal: 20, gap: 12 },
    projectCard: { gap: 8 },
    projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    projectName: { fontSize: 16, fontWeight: '700', color: Colors.text },
    projectDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
    managerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    managerText: { fontSize: 13, color: Colors.accent, fontWeight: '600' },
    modalContent: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: Platform.OS === 'ios' ? 40 : 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
    formGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: Colors.text },
    textArea: { minHeight: 100 },
});
