import { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, Pressable,
    Platform, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth, getRoleBadgeColor } from '@/contexts/AuthContext';
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

export default function PrivateChatScreen() {
    const { userId, userName, managerId } = useLocalSearchParams<{
        userId: string; userName: string; managerId: string;
    }>();
    const { user } = useAuth();

    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchMessages = useCallback(async () => {
        if (!userId || !managerId) return;
        try {
            const data = await apiClient.getPrivateChat(userId, managerId);
            setMessages(data);
        } catch (err) {
            console.error('Failed to load private chat:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId, managerId]);

    useEffect(() => {
        fetchMessages();
        pollRef.current = setInterval(fetchMessages, 5000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchMessages]);

    const handleSend = useCallback(async () => {
        const text = inputText.trim();
        if (!text || !userId || !managerId || isSending) return;

        setIsSending(true);
        setInputText('');
        try {
            await apiClient.sendPrivateChat(userId, managerId, text);
            // Fetch fresh list instead of optimistic add to avoid duplicates
            await fetchMessages();
        } catch (err) {
            console.error('Failed to send message:', err);
            setInputText(text);
        } finally {
            setIsSending(false);
        }
    }, [inputText, userId, managerId, isSending, fetchMessages]);

    const renderMessage = ({ item }: { item: ChatMsg }) => {
        const isMe = item.senderId === user?.id;
        return (
            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                {!isMe && (
                    <Avatar
                        initials={item.senderAvatar || item.senderName.substring(0, 2).toUpperCase()}
                        size={34}
                        color={getRoleBadgeColor(item.senderRole as any)}
                    />
                )}
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
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
            {/* Header */}
            <View style={styles.chatHeader}>
                <Avatar
                    initials={(userName || 'U').substring(0, 2).toUpperCase()}
                    size={36}
                    color={Colors.secondary}
                />
                <View>
                    <Text style={styles.chatHeaderText}>{userName || 'Private Chat'}</Text>
                    <Text style={styles.chatHeaderSub}>Direct Message</Text>
                </View>
            </View>

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
                            <Feather name="message-square" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyText}>No messages yet</Text>
                            <Text style={styles.emptySubtext}>Say hi to {userName}!</Text>
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
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    chatHeaderText: {
        fontSize: 16, fontWeight: '700', color: Colors.text,
        fontFamily: 'Inter_700Bold',
    },
    chatHeaderSub: {
        fontSize: 12, color: Colors.textTertiary,
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
