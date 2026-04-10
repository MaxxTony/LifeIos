import React, { useRef, useState, useEffect } from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  ActivityIndicator 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { getAIResponse } from '@/services/ai';
import { chatService, ChatMessage } from '@/services/chatService';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useStore } from '@/store/useStore';
import { LinearGradient } from 'expo-linear-gradient';

const QUICK_PROMPTS = [
  "Plan my day",
  "I feel stressed",
  "Help me focus",
];

export default function AIChatScreen() {
  const { userId } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  // Load initial welcome message or current chat
  useEffect(() => {
    if (!currentConversationId && messages.length === 0) {
      setMessages([{ 
        id: 'welcome', 
        role: 'assistant', 
        content: "Hello! I'm LifeOS. How can I help you today?",
        createdAt: Date.now()
      }]);
    }
  }, [currentConversationId]);

  const loadConversation = async (id: string) => {
    if (!userId) return;
    setInitialLoading(true);
    setCurrentConversationId(id);
    const history = await chatService.getMessages(userId, id);
    setMessages(history);
    setInitialLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([{ 
      id: 'welcome', 
      role: 'assistant', 
      content: "Hello! I'm LifeOS. How can I help you today?",
      createdAt: Date.now()
    }]);
  };

  const handleSend = async (content?: string) => {
    const text = content || input;
    if (!text.trim() || loading || !userId) return;

    let convId = currentConversationId;
    
    // Create new conversation document if it's the first real message
    if (!convId) {
      convId = await chatService.createConversation(userId, text);
      setCurrentConversationId(convId);
    }

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: text,
      createdAt: Date.now()
    };
    
    const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Save user message to Firestore
    await chatService.addMessage(userId, convId, 'user', text);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    const aiText = await getAIResponse(newMessages.map(m => ({
      role: m.role,
      content: m.content
    })));

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiText || 'Error',
      createdAt: Date.now()
    };

    setMessages([...newMessages, assistantMsg]);
    setLoading(false);

    // Save AI response to Firestore
    await chatService.addMessage(userId, convId, 'assistant', assistantMsg.content);

    // Scroll to bottom again
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => setIsHistoryVisible(true)}
              style={styles.historyHeaderButton}
            >
              <IconSymbol name="sparkles" size={22} color={Colors.dark.primary} />
            </TouchableOpacity>
          )
        }} 
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {initialLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={Colors.dark.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.scrollContent}
          >
            {messages.map((m) => (
              <View key={m.id} style={[styles.messageWrapper, m.role === 'user' ? styles.userWrapper : styles.aiWrapper]}>
                <View style={[styles.messageBubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                  <Text style={[styles.messageText, m.role === 'user' ? styles.userText : styles.aiText]}>
                    {m.content}
                  </Text>
                </View>
              </View>
            ))}
            {loading && (
              <View style={styles.aiWrapper}>
                <View style={[styles.messageBubble, styles.aiBubble]}>
                  <Text style={styles.aiText}>Claude is thinking...</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          {messages.length <= 1 && !loading && (
            <View style={styles.promptsContainer}>
              {QUICK_PROMPTS.map((p, i) => (
                <TouchableOpacity key={i} style={styles.prompt} onPress={() => handleSend(p)}>
                  <Text style={styles.promptText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Message LifeOS..."
              placeholderTextColor={Colors.dark.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend()}
              multiline
            />
            <TouchableOpacity onPress={() => handleSend()}>
              <LinearGradient colors={Colors.dark.gradient} style={styles.sendButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <IconSymbol name="paperplane.fill" size={20} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {userId && (
        <ChatHistorySidebar 
          userId={userId}
          isVisible={isHistoryVisible}
          onClose={() => setIsHistoryVisible(false)}
          onSelectChat={loadConversation}
          onNewChat={handleNewChat}
          currentConversationId={currentConversationId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  keyboardView: {
    flex: 1,
  },
  headerBackground: {
    height: Platform.OS === 'ios' ? 100 : 80,
    backgroundColor: 'rgba(11, 11, 15, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyHeaderButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 120 : 100, // Space for transparent header
  },
  messageWrapper: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  userBubble: {
    backgroundColor: Colors.dark.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.dark.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  messageText: {
    ...Typography.body,
    fontSize: 15,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: Colors.dark.text,
  },
  footer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.dark.background,
  },
  promptsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  prompt: {
    backgroundColor: Colors.dark.card,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  promptText: {
    ...Typography.caption,
    color: Colors.dark.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    paddingTop: Spacing.md,
    color: Colors.dark.text,
    maxHeight: 100,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
