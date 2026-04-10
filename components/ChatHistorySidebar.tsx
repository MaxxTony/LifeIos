import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  Dimensions, 
  Platform,
  Alert
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';
import { chatService, ChatConversation } from '@/services/chatService';

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

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this conversation?",
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
      'Older': []
    };

    conversations.forEach(conv => {
      const date = conv.updatedAt?.toDate() || new Date(conv.updatedAt);
      if (isToday(date)) {
        groups['Today'].push(conv);
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(conv);
      } else {
        groups['Older'].push(conv);
      }
    });

    return groups;
  };

  const groups = groupConversations();

  if (!shouldRender) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isVisible ? 'auto' : 'none'}>
      {/* Backdrop */}
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <View style={styles.backdropInner} />
      </TouchableOpacity>

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <BlurView intensity={80} tint="dark" style={styles.blur}>
          <View style={styles.header}>
            <Text style={styles.title}>History</Text>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="chevron.right" size={24} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.newChatButton} onPress={() => { onNewChat(); onClose(); }}>
            <LinearGradient 
              colors={Colors.dark.gradient} 
              style={styles.newChatGradient}
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 1}}
            >
              <Text style={styles.newChatText}>+ New Chat</Text>
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
                        <Text style={styles.chatTitle} numberOfLines={1}>{conv.title}</Text>
                        <Text style={styles.chatLastMsg} numberOfLines={1}>{conv.lastMessage}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(conv.id)} style={styles.deleteButton}>
                        <IconSymbol name="chevron.left" size={16} color={Colors.dark.textSecondary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            ))}
            {conversations.length === 0 && !loading && (
              <Text style={styles.emptyText}>No chat history yet</Text>
            )}
          </ScrollView>
        </BlurView>
      </Animated.View>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropInner: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: 'transparent',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  blur: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h2,
    color: Colors.dark.text,
  },
  newChatButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  newChatGradient: {
    paddingVertical: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatText: {
    ...Typography.body,
    fontWeight: '600',
    color: '#FFF',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  group: {
    marginBottom: Spacing.xl,
  },
  groupTitle: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chatItemActive: {
    borderColor: Colors.dark.primary,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  chatInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  chatTitle: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.dark.text,
    marginBottom: 2,
  },
  chatLastMsg: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
