import { View, Text, StyleSheet, ScrollView, Pressable, Platform, RefreshControl, TextInput, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData, TodoPriority, TodoCategory, TodoItem } from '@/contexts/DataContext';
import { Card, EmptyState, SectionHeader } from '@/components/ui';
import { useState, useCallback, useMemo } from 'react';

const P = Pressable as any;

const CATEGORIES: { label: string; value: TodoCategory | 'All'; icon: string; color: string }[] = [
    { label: 'All', value: 'All', icon: 'layers', color: Colors.accent },
    { label: 'Work', value: 'Work', icon: 'briefcase', color: '#6366F1' },
    { label: 'Personal', value: 'Personal', icon: 'user', color: '#F472B6' },
    { label: 'Meeting', value: 'Meeting', icon: 'users', color: '#34D399' },
    { label: 'Deadline', value: 'Deadline', icon: 'clock', color: '#FBBF24' },
    { label: 'Other', value: 'Other', icon: 'tag', color: '#94A3B8' },
];

const PRIORITIES: { label: string; value: TodoPriority; color: string }[] = [
    { label: 'Low', value: 'Low', color: Colors.textTertiary },
    { label: 'Medium', value: 'Medium', color: Colors.accent },
    { label: 'High', value: 'High', color: Colors.warning },
    { label: 'Urgent', value: 'Urgent', color: Colors.error },
];

function getPriorityColor(priority: string): string {
    switch (priority) {
        case 'Urgent': return Colors.error;
        case 'High': return Colors.warning;
        case 'Medium': return Colors.accent;
        default: return Colors.textTertiary;
    }
}

function getCategoryColor(category: string): string {
    return CATEGORIES.find(c => c.value === category)?.color || Colors.textTertiary;
}

function getCategoryIcon(category: string): string {
    return CATEGORIES.find(c => c.value === category)?.icon || 'tag';
}

export default function TodosScreen() {
    const insets = useSafeAreaInsets();
    const { todos, createTodo, toggleTodo, deleteTodo, refreshTodos } = useData();
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<TodoCategory | 'All'>('All');
    const [showCompleted, setShowCompleted] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newPriority, setNewPriority] = useState<TodoPriority>('Medium');
    const [newCategory, setNewCategory] = useState<TodoCategory>('Work');
    const [newDueDate, setNewDueDate] = useState('');

    const webTopInset = Platform.OS === 'web' ? 67 : 0;

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshTodos();
        setRefreshing(false);
    }, [refreshTodos]);

    const filteredTodos = useMemo(() => {
        let filtered = todos;
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(t => t.category === selectedCategory);
        }
        if (showCompleted) {
            filtered = filtered.filter(t => t.isCompleted);
        } else {
            filtered = filtered.filter(t => !t.isCompleted);
        }
        return filtered;
    }, [todos, selectedCategory, showCompleted]);

    const completedCount = todos.filter(t => t.isCompleted).length;
    const totalCount = todos.length;
    const progress = totalCount > 0 ? completedCount / totalCount : 0;

    const handleToggle = useCallback(async (id: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await toggleTodo(id);
        } catch (err) {
            Alert.alert('Error', 'Failed to update task');
        }
    }, [toggleTodo]);

    const handleDelete = useCallback(async (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteTodo(id);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete task');
                    }
                },
            },
        ]);
    }, [deleteTodo]);

    const handleCreate = useCallback(async () => {
        if (!newTitle.trim()) return;
        try {
            await createTodo({
                title: newTitle.trim(),
                description: newDescription.trim(),
                priority: newPriority,
                category: newCategory,
                dueDate: newDueDate ? newDueDate : undefined,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setNewTitle('');
            setNewDescription('');
            setNewPriority('Medium');
            setNewCategory('Work');
            setNewDueDate('');
            setModalVisible(false);
        } catch (err) {
            Alert.alert('Error', 'Failed to create task');
        }
    }, [newTitle, newDescription, newPriority, newCategory, newDueDate, createTodo]);

    const renderTodoCard = (todo: TodoItem, index: number) => {
        const priorityColor = getPriorityColor(todo.priority);
        const categoryColor = getCategoryColor(todo.category);

        return (
            <Animated.View key={todo.id} entering={FadeInUp.delay(index * 80).duration(400)}>
                <P
                    onPress={() => handleToggle(todo.id)}
                    onLongPress={() => handleDelete(todo.id)}
                    style={({ pressed }: any) => [styles.todoCard, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                >
                    {/* Priority indicator bar */}
                    <View style={[styles.priorityBar, { backgroundColor: priorityColor }]} />

                    <View style={styles.todoContent}>
                        <View style={styles.todoTop}>
                            {/* Checkbox */}
                            <P onPress={() => handleToggle(todo.id)} hitSlop={8}>
                                <View style={[styles.checkbox, todo.isCompleted && { backgroundColor: Colors.success, borderColor: Colors.success }]}>
                                    {todo.isCompleted && <Feather name="check" size={14} color="#fff" />}
                                </View>
                            </P>

                            <View style={styles.todoMain}>
                                <Text
                                    style={[styles.todoTitle, todo.isCompleted && styles.todoTitleCompleted]}
                                    numberOfLines={1}
                                >
                                    {todo.title}
                                </Text>
                                {todo.description ? (
                                    <Text style={styles.todoDescription} numberOfLines={1}>{todo.description}</Text>
                                ) : null}
                            </View>

                            {/* Delete button */}
                            <P onPress={() => handleDelete(todo.id)} hitSlop={8} style={styles.deleteBtn}>
                                <Feather name="trash-2" size={16} color={Colors.textTertiary} />
                            </P>
                        </View>

                        <View style={styles.todoMeta}>
                            {/* Category chip */}
                            <View style={[styles.categoryChip, { backgroundColor: categoryColor + '18' }]}>
                                <Feather name={getCategoryIcon(todo.category) as any} size={10} color={categoryColor} />
                                <Text style={[styles.categoryChipText, { color: categoryColor }]}>{todo.category}</Text>
                            </View>

                            {/* Priority chip */}
                            <View style={[styles.priorityChip, { backgroundColor: priorityColor + '18' }]}>
                                <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
                                <Text style={[styles.priorityChipText, { color: priorityColor }]}>{todo.priority}</Text>
                            </View>

                            {/* Due date */}
                            {todo.dueDate && (
                                <View style={styles.dueDateChip}>
                                    <Feather name="calendar" size={10} color={Colors.textTertiary} />
                                    <Text style={styles.dueDateText}>
                                        {new Date(todo.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </P>
            </Animated.View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {/* Header */}
                <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
                    <View>
                        <Text style={styles.pageTitle}>Tasks</Text>
                        <Text style={styles.pageSubtitle}>
                            {completedCount}/{totalCount} completed
                        </Text>
                    </View>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressRing}>
                            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Progress Bar */}
                <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                        <Animated.View entering={FadeInRight.delay(400).duration(800)}>
                            <LinearGradient
                                colors={Colors.gradients.accent as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressBarFill, { width: `${Math.max(progress * 100, 2)}%` }]}
                            />
                        </Animated.View>
                    </View>
                </Animated.View>

                {/* Category Filter */}
                <Animated.View entering={FadeInUp.delay(300).duration(500)}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryRow}
                    >
                        {CATEGORIES.map((cat) => {
                            const isActive = selectedCategory === cat.value;
                            return (
                                <P
                                    key={cat.value}
                                    onPress={() => { Haptics.selectionAsync(); setSelectedCategory(cat.value); }}
                                    style={({ pressed }: any) => [
                                        styles.categoryPill,
                                        isActive && { backgroundColor: cat.color + '20', borderColor: cat.color },
                                        pressed && { opacity: 0.8 },
                                    ]}
                                >
                                    <Feather name={cat.icon as any} size={14} color={isActive ? cat.color : Colors.textTertiary} />
                                    <Text style={[styles.categoryPillText, isActive && { color: cat.color }]}>{cat.label}</Text>
                                </P>
                            );
                        })}
                    </ScrollView>
                </Animated.View>

                {/* Active / Completed Toggle */}
                <Animated.View entering={FadeInUp.delay(350).duration(500)} style={styles.toggleRow}>
                    <P
                        onPress={() => { Haptics.selectionAsync(); setShowCompleted(false); }}
                        style={({ pressed }: any) => [styles.toggleBtn, !showCompleted && styles.toggleBtnActive, pressed && { opacity: 0.8 }]}
                    >
                        <Feather name="circle" size={14} color={!showCompleted ? Colors.accent : Colors.textTertiary} />
                        <Text style={[styles.toggleText, !showCompleted && styles.toggleTextActive]}>Active</Text>
                    </P>
                    <P
                        onPress={() => { Haptics.selectionAsync(); setShowCompleted(true); }}
                        style={({ pressed }: any) => [styles.toggleBtn, showCompleted && styles.toggleBtnActive, pressed && { opacity: 0.8 }]}
                    >
                        <Feather name="check-circle" size={14} color={showCompleted ? Colors.success : Colors.textTertiary} />
                        <Text style={[styles.toggleText, showCompleted && { color: Colors.success }]}>Completed</Text>
                    </P>
                </Animated.View>

                {/* Todo List */}
                <View style={styles.listSection}>
                    {filteredTodos.length === 0 ? (
                        <EmptyState
                            icon={showCompleted ? 'check-circle' : 'clipboard'}
                            title={showCompleted ? 'No completed tasks' : 'No tasks yet'}
                            subtitle={showCompleted ? 'Complete some tasks to see them here' : 'Tap + to create your first task'}
                        />
                    ) : (
                        filteredTodos.map((todo, index) => renderTodoCard(todo, index))
                    )}
                </View>
                {/* Add Task Button */}
                <View style={styles.addBtnWrap}>
                    <Pressable
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setModalVisible(true); }}
                        style={({ pressed }) => [pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                    >
                        <LinearGradient
                            colors={Colors.gradients.accent as [string, string, ...string[]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.addBtn}
                        >
                            <Feather name="plus" size={20} color="#fff" />
                            <Text style={styles.addBtnText}>Add Task</Text>
                        </LinearGradient>
                    </Pressable>
                </View>

            </ScrollView>

            {/* Create Todo Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <P style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>New Task</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Task title"
                            placeholderTextColor={Colors.textTertiary}
                            value={newTitle}
                            onChangeText={setNewTitle}
                            autoFocus
                        />

                        <TextInput
                            style={[styles.modalInput, styles.modalInputMulti]}
                            placeholder="Description (optional)"
                            placeholderTextColor={Colors.textTertiary}
                            value={newDescription}
                            onChangeText={setNewDescription}
                            multiline
                            numberOfLines={3}
                        />

                        {/* Due Date String Input (Web Datetime Fallback) */}
                        <Text style={styles.modalLabel}>Due Date & Time (Optional)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="YYYY-MM-DD HH:MM (e.g. 2026-03-07 14:00)"
                            placeholderTextColor={Colors.textTertiary}
                            value={newDueDate}
                            onChangeText={setNewDueDate}
                        />

                        {/* Priority Picker */}
                        <Text style={styles.modalLabel}>Priority</Text>
                        <View style={styles.pickerRow}>
                            {PRIORITIES.map(p => (
                                <P
                                    key={p.value}
                                    onPress={() => { Haptics.selectionAsync(); setNewPriority(p.value); }}
                                    style={[
                                        styles.pickerChip,
                                        newPriority === p.value && { backgroundColor: p.color + '20', borderColor: p.color },
                                    ]}
                                >
                                    <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                                    <Text style={[styles.pickerChipText, newPriority === p.value && { color: p.color }]}>{p.label}</Text>
                                </P>
                            ))}
                        </View>

                        {/* Category Picker */}
                        <Text style={styles.modalLabel}>Category</Text>
                        <View style={styles.pickerRow}>
                            {CATEGORIES.filter(c => c.value !== 'All').map(c => (
                                <P
                                    key={c.value}
                                    onPress={() => { Haptics.selectionAsync(); setNewCategory(c.value as TodoCategory); }}
                                    style={[
                                        styles.pickerChip,
                                        newCategory === c.value && { backgroundColor: c.color + '20', borderColor: c.color },
                                    ]}
                                >
                                    <Feather name={c.icon as any} size={12} color={newCategory === c.value ? c.color : Colors.textTertiary} />
                                    <Text style={[styles.pickerChipText, newCategory === c.value && { color: c.color }]}>{c.label}</Text>
                                </P>
                            ))}
                        </View>

                        {/* Create Button */}
                        <P
                            onPress={handleCreate}
                            style={({ pressed }: any) => [pressed && { opacity: 0.85 }]}
                        >
                            <LinearGradient
                                colors={Colors.gradients.accent as [string, string, ...string[]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.createBtn}
                            >
                                <Feather name="plus" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.createBtnText}>Create Task</Text>
                            </LinearGradient>
                        </P>

                        <P onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </P>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { paddingHorizontal: 20, paddingTop: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    pageTitle: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, fontWeight: '500' },
    progressContainer: { alignItems: 'center', justifyContent: 'center' },
    progressRing: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 3, borderColor: Colors.accent,
        alignItems: 'center', justifyContent: 'center',
    },
    progressText: { fontSize: 13, fontWeight: '800', color: Colors.accent },
    progressBarContainer: { marginBottom: 20 },
    progressBarBg: {
        height: 6, borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    progressBarFill: { height: '100%', borderRadius: 3 },
    categoryRow: { paddingVertical: 4, gap: 8, marginBottom: 16 },
    categoryPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    categoryPillText: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3 },
    toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    toggleBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 10, borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    toggleBtnActive: { backgroundColor: 'rgba(6, 182, 212, 0.08)', borderColor: 'rgba(6, 182, 212, 0.2)' },
    toggleText: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary },
    toggleTextActive: { color: Colors.accent },
    listSection: { gap: 12 },
    todoCard: {
        flexDirection: 'row',
        backgroundColor: Colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        overflow: 'hidden',
        marginBottom: 10,
    },
    priorityBar: { width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
    todoContent: { flex: 1, padding: 14, gap: 10 },
    todoTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkbox: {
        width: 24, height: 24, borderRadius: 8,
        borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    todoMain: { flex: 1 },
    todoTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, letterSpacing: -0.2 },
    todoTitleCompleted: { textDecorationLine: 'line-through', color: Colors.textTertiary },
    todoDescription: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
    deleteBtn: { padding: 4 },
    todoMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingLeft: 36 },
    categoryChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    categoryChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    priorityChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    priorityDot: { width: 6, height: 6, borderRadius: 3 },
    priorityChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
    dueDateChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    dueDateText: { fontSize: 10, fontWeight: '600', color: Colors.textTertiary },

    // Add Task Button
    addBtnWrap: { marginTop: 8, marginBottom: 12 },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        paddingVertical: 16, borderRadius: 16,
        shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
        elevation: 6,
    },
    addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
        maxHeight: '80%',
    },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 20, letterSpacing: -0.5 },
    modalInput: {
        backgroundColor: Colors.inputBg,
        borderWidth: 1, borderColor: Colors.inputBorder,
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 15, color: Colors.text, marginBottom: 14,
    },
    modalInputMulti: { height: 80, textAlignVertical: 'top' },
    modalLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    pickerChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    pickerChipText: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary },
    createBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: 14, marginTop: 4,
    },
    createBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    cancelBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textTertiary },
});
