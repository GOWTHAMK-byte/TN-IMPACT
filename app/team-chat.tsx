import { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, Pressable,
    Platform, ActivityIndicator, KeyboardAvoidingView, Animated as RNAnimated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth, getRoleBadgeColor } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Avatar } from '@/components/ui';
import { apiClient } from '@/lib/api';

interface ChatMsg {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    senderRole: string;
    content: string;
    createdAt: string;
}

interface ToastData {
    senderName: string;
    content: string;
}

export default function TeamChatScreen() {
    const { managerId, teamName } = useLocalSearchParams<{ managerId: string; teamName: string }>();
    const { user } = useAuth();
    const { refreshData } = useData();
    const router = useRouter();

    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const knownIdsRef = useRef<Set<string>>(new Set());
    const isFirstLoadRef = useRef(true);

    // Toast state
    const [toast, setToast] = useState<ToastData | null>(null);
    const toastAnim = useRef(new RNAnimated.Value(-80)).current;
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((data: ToastData) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast(data);
        RNAnimated.spring(toastAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
        toastTimerRef.current = setTimeout(() => {
            RNAnimated.timing(toastAnim, { toValue: -80, duration: 250, useNativeDriver: true }).start(() => {
                setToast(null);
            });
        }, 3000);
    }, [toastAnim]);

    const fetchMessages = useCallback(async () => {
        if (!managerId) return;
        try {
            const data: ChatMsg[] = await apiClient.getTeamChat(managerId);
            setMessages(data);

            // Mark chat as read to clear badges
            await apiClient.markChatRead(`team_${managerId}`).catch(console.error);
            await refreshData();

            // Detect new messages from others (not on first load)
            if (!isFirstLoadRef.current && user) {
                for (const msg of data) {
                    if (!knownIdsRef.current.has(msg.id) && msg.senderId !== user.id) {
                        showToast({ senderName: msg.senderName, content: msg.content });
                        break; // Show toast for the newest one only
                    }
                }
            }
            isFirstLoadRef.current = false;

            // Update known IDs
            knownIdsRef.current = new Set(data.map(m => m.id));
        } catch (err) {
            console.error('Failed to load team chat:', err);
        } finally {
            setIsLoading(false);
        }
    }, [managerId, user, showToast, refreshData]);

    useEffect(() => {
        fetchMessages();
        pollRef.current = setInterval(fetchMessages, 5000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [fetchMessages]);

    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || !managerId || isSending) return;

        setIsSending(true);
        setInputText('');
        try {
            await apiClient.sendTeamChat(managerId, text);
            await fetchMessages();
        } catch (err) {
            console.error('Failed to send message:', err);
            setInputText(text);
        } finally {
            setIsSending(false);
        }
    }, [inputText, managerId, isSending, fetchMessages]);

    const openPrivateChat = useCallback((memberId: string, memberName: string) => {
        if (memberId === user?.id) return;
        router.push({
            pathname: '/private-chat',
            params: { userId: memberId, userName: memberName, managerId },
        });
    }, [managerId, user]);

    const renderMessage = ({ item }: { item: ChatMsg }) => {
        const isMe = item.senderId === user?.id;
        return (
            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                {!isMe && (
                    <Pressable onPress={() => openPrivateChat(item.senderId, item.senderName)}>
                        <Avatar
                            initials={item.senderAvatar || item.senderName.substring(0, 2).toUpperCase()}
                            size={34}
                            color={getRoleBadgeColor(item.senderRole as any)}
                        />
                    </Pressable>
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    {!isMe && (
                        <Text style={styles.senderName}>{item.senderName}</Text>
                    )}
                    <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
                    <Text style={[styles.time, isMe && styles.timeMe]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header info */}
            <View style={styles.chatHeader}>
                <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
                    <Feather name="arrow-left" size={20} color={Colors.text} />
                </Pressable>
                <View style={styles.headerDot} />
                <Text style={styles.chatHeaderText}>{teamName || 'Team Chat'}</Text>
                <Text style={styles.chatHeaderSub}>Group Chat</Text>
            </View>

            {/* In-chat toast notification */}
            {toast && (
                <RNAnimated.View style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}>
                    <View style={styles.toastDot} />
                    <View style={styles.toastContent}>
                        <Text style={styles.toastSender} numberOfLines={1}>{toast.senderName}</Text>
                        <Text style={styles.toastMsg} numberOfLines={1}>{toast.content}</Text>
                    </View>
                    <Feather name="message-circle" size={16} color={Colors.accent} />
                </RNAnimated.View>
            )}

            {/* Messages */}
            {isLoading ? (
                <ActivityIndicator size="large" color={Colors.accent} style={{ flex: 1 }} />
            ) : (
                <FlatList
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    inverted
                    contentContainerStyle={styles.msgList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="message-circle" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyText}>No messages yet</Text>
                            <Text style={styles.emptySubtext}>Start the conversation with your team!</Text>
                        </View>
                    }
                />
            )}

            {/* Input bar */}
            <View style={styles.inputBar}>
                <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Type a message..."
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                    multiline
                    maxLength={2000}
                    onSubmitEditing={handleSend}
                    blurOnSubmit={false}
                />
                <Pressable
                    onPress={handleSend}
                    style={({ pressed }) => [
                        styles.sendBtn,
                        (!inputText.trim() || isSending) && styles.sendBtnDisabled,
                        pressed && { opacity: 0.7 },
                    ]}
                    disabled={!inputText.trim() || isSending}
                >
                    {isSending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Feather name="send" size={18} color="#fff" />
                    )}
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },

    chatHeader: {
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: Colors.divider,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingTop: Platform.OS === 'web' ? 24 : 12, // More padding for web safely
    },
    backBtn: { paddingRight: 4 },
    headerDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: Colors.success,
    },
    chatHeaderText: {
        fontSize: 16, fontWeight: '700', color: Colors.text,
        fontFamily: 'Inter_700Bold',
    },
    chatHeaderSub: {
        fontSize: 12, color: Colors.textTertiary, marginLeft: 'auto',
    },

    // Toast notification
    toast: {
        position: 'absolute', top: 56, left: 16, right: 16, zIndex: 100,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.accent + '40',
        borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
        shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
    },
    toastDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent,
    },
    toastContent: { flex: 1 },
    toastSender: {
        fontSize: 13, fontWeight: '700', color: Colors.accent,
        fontFamily: 'Inter_700Bold',
    },
    toastMsg: {
        fontSize: 12, color: Colors.textSecondary, marginTop: 1,
    },

    msgList: { paddingHorizontal: 16, paddingVertical: 12 },

    msgRow: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 8,
        marginBottom: 12, maxWidth: '85%',
    },
    msgRowMe: {
        alignSelf: 'flex-end', flexDirection: 'row-reverse',
    },

    bubble: {
        paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 18, maxWidth: '100%',
    },
    bubbleOther: {
        backgroundColor: Colors.card,
        borderWidth: 1, borderColor: Colors.cardBorder,
        borderBottomLeftRadius: 4,
    },
    bubbleMe: {
        backgroundColor: Colors.accent,
        borderBottomRightRadius: 4,
    },

    senderName: {
        fontSize: 12, fontWeight: '700', color: Colors.accent,
        marginBottom: 2, fontFamily: 'Inter_600SemiBold',
    },
    msgText: {
        fontSize: 15, color: Colors.text, lineHeight: 20,
    },
    msgTextMe: { color: '#fff' },

    time: {
        fontSize: 10, color: Colors.textTertiary,
        alignSelf: 'flex-end', marginTop: 4,
    },
    timeMe: { color: 'rgba(255,255,255,0.7)' },

    emptyContainer: {
        alignItems: 'center', justifyContent: 'center', paddingVertical: 60,
        transform: [{ scaleY: -1 }],
    },
    emptyText: {
        fontSize: 16, fontWeight: '600', color: Colors.textSecondary,
        marginTop: 12, fontFamily: 'Inter_600SemiBold',
    },
    emptySubtext: {
        fontSize: 13, color: Colors.textTertiary, marginTop: 4,
    },

    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        borderTopWidth: 1, borderTopColor: Colors.divider,
        backgroundColor: Colors.surface,
    },
    input: {
        flex: 1, minHeight: 40, maxHeight: 120,
        backgroundColor: Colors.inputBg,
        borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
        fontSize: 15, color: Colors.text,
        borderWidth: 1, borderColor: Colors.inputBorder,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.accent,
        alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
});
