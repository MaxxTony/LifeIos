import { Colors, Typography } from '@/constants/theme';
import { ChatConversation, chatService } from '@/services/chatService';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal
} from 'react-native';
import { IconSymbol } from './ui/icon-symbol';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

// Native helper to avoid date-fns dependency
const isToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const isYesterday = (date: Date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
};

interface ChatHistorySidebarProps {
  userId: string;
  isVisible: boolean;
  onClose: () => void;
  onSelectChat: (conversationId: string) => void;
  onNewChat: () => void;
  currentConversationId: string | null;
}

export function ChatHistorySidebar({
  userId,
  isVisible,
  onClose,
  onSelectChat,
  onNewChat,
  currentConversationId
}: ChatHistorySidebarProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [shouldRender, setShouldRender] = useState(isVisible);
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      loadConversations();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShouldRender(false);
      });
    }
  }, [isVisible]);

  const loadConversations = async () => {
    setLoading(true);
    const data = await chatService.getConversations(userId);
    setConversations(data);
    setLoading(false);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      "Delete Chat",
      `Delete "${title || 'this conversation'}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await chatService.deleteConversation(userId, id);
            loadConversations();
            if (id === currentConversationId) {
              onNewChat();
            }
          }
        }
      ]
    );
  };

  const groupConversations = () => {
    const groups: { [key: string]: ChatConversation[] } = {
      'Today': [],
      'Yesterday': [],
      'Earlier': []
    };

    conversations.forEach(conv => {
      const date = conv.updatedAt?.toDate ? conv.updatedAt.toDate() : new Date(conv.updatedAt);
      if (isToday(date)) {
        groups['Today'].push(conv);
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(conv);
      } else {
        groups['Earlier'].push(conv);
      }
    });

    return groups;
  };

  const groups = groupConversations();

  if (!shouldRender) return null;

  return (
    <Modal
      visible={shouldRender}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents={isVisible ? 'auto' : 'none'}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View style={[styles.backdropInner, { opacity: slideAnim.interpolate({ inputRange: [0, SIDEBAR_WIDTH], outputRange: [1, 0] }) }]} />
        </TouchableOpacity>

        {/* Sidebar */}
        <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>History</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <IconSymbol name="plus" size={24} color={Colors.dark.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.newChatButton} onPress={() => { onNewChat(); onClose(); }}>
              <LinearGradient
                colors={['#7C5CFF', '#5B8CFF']}
                style={styles.newChatGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <IconSymbol name="plus" size={18} color="#FFF" />
                <Text style={styles.newChatText}>New Chat</Text>
              </LinearGradient>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {Object.keys(groups).map((groupName) => (
                groups[groupName].length > 0 && (
                  <View key={groupName} style={styles.group}>
                    <Text style={styles.groupTitle}>{groupName}</Text>
                    {groups[groupName].map((conv) => (
                      <TouchableOpacity
                        key={conv.id}
                        style={[
                          styles.chatItem,
                          currentConversationId === conv.id && styles.chatItemActive
                        ]}
                        onPress={() => { onSelectChat(conv.id); onClose(); }}
                      >
                        <View style={styles.chatInfo}>
                          <Text style={styles.chatTitle} numberOfLines={1}>{conv.title || 'Untitled Chat'}</Text>
                          <Text style={styles.chatLastMsg} numberOfLines={1}>{conv.lastMessage || 'No messages'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(conv.id, conv.title || '')} style={styles.deleteButton}>
                          <IconSymbol name="trash.fill" size={16} color={Colors.dark.textSecondary} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              ))}
              {conversations.length === 0 && !loading && (
                <View style={styles.emptyContainer}>
                  <IconSymbol name="sparkles" size={40} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.emptyText}>No chat history yet</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  backdropInner: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#0A0A0A',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    zIndex: 99
  },
  content: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    ...Typography.h2,
    color: '#FFF',
    fontSize: 24,
  },
  closeBtn: {
    padding: 4,
  },
  newChatButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  newChatGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  newChatText: {
    ...Typography.body,
    fontWeight: '700',
    color: '#FFF',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  group: {
    marginBottom: 28,
  },
  groupTitle: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 10,
    fontWeight: '700',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chatItemActive: {
    borderColor: 'rgba(124, 92, 255, 0.5)',
    backgroundColor: 'rgba(124, 92, 255, 0.1)',
  },
  chatInfo: {
    flex: 1,
    marginRight: 12,
  },
  chatTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: '#E0E0E0',
    fontSize: 15,
    marginBottom: 2,
  },
  chatLastMsg: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
  },
});
