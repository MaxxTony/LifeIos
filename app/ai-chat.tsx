import { AIAttachmentSheet } from '@/components/AIAttachmentSheet';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getAIResponse } from '@/services/ai';
import { ChatMessage, chatService } from '@/services/chatService';
import { useStore } from '@/store/useStore';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useHeaderHeight } from '@react-navigation/elements';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ACTION_CHIPS = [
  { label: 'Plan my day', icon: 'sparkles' },
  { label: 'Add a habit', icon: 'plus' },
  { label: 'Analyze my mood', icon: 'waveform' },
  { label: 'Give me advice', icon: 'paperplane.fill' },   // M-10 FIX: was "Look something up" — AI doesn't browse the web
];

export default function AIChatScreen() {
  const userId = useStore(s => s.userId);
  const userName = useStore(s => s.userName);
  const proactivePrompt = useStore(s => s.proactivePrompt);
  const dismissProactive = useStore(s => s.actions.dismissProactive);
  const colors = useThemeColors();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ uri: string, base64: string, mimeType: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const attachmentSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    if (!currentConversationId && messages.length === 0) {
      const welcomeContent = proactivePrompt
        ? proactivePrompt.message
        : `Hi ${userName || 'there'}! I'm your LifeOS assistant. How can I help you manage your day?`;

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: welcomeContent,
        createdAt: Date.now()
      }]);

      if (proactivePrompt) {
        dismissProactive();
      }
    }
  }, [userName, currentConversationId, messages.length, proactivePrompt]);

  const loadConversation = async (id: string) => {
    if (!userId || id === currentConversationId) return;
    setInitialLoading(true);
    setCurrentConversationId(id);
    const history = await chatService.getMessages(userId, id);
    setMessages(history);
    setInitialLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `Hi ${userName || 'there'}! Let's start fresh. What's on your mind?`,
      createdAt: Date.now()
    }]);
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!userId || (!text.trim() && !attachedImage) || loading) return;

    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let convId = currentConversationId;

    if (!convId) {
      convId = await chatService.createConversation(userId, text || 'Sent an image');
      setCurrentConversationId(convId);
    }

    const currentAttachedImage = attachedImage;
    setAttachedImage(null);
    setInput('');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      imageUrl: currentAttachedImage?.uri,
      createdAt: Date.now()
    };

    const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMsg];
    setMessages(newMessages);
    setLoading(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      let finalImageUrl = undefined;
      if (currentAttachedImage) {
        setUploading(true);
        finalImageUrl = await chatService.uploadImage(
          userId,
          currentAttachedImage.uri
        );
        setUploading(false);
      }

      // M-4 FIX: Cap history at last 20 messages to control token cost/latency.
      // Always keep the most recent user message (last item) in the window.
      const MAX_HISTORY = 20;
      const windowedMessages = newMessages.length > MAX_HISTORY
        ? newMessages.slice(-MAX_HISTORY)
        : newMessages;

      const aiInputMessages = windowedMessages.map(m => {
        if (m.id === userMsg.id && currentAttachedImage) {
          return {
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            image: {
              base64: currentAttachedImage.base64,
              mimeType: currentAttachedImage.mimeType
            }
          };
        }
        return {
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content
        };
      });
      const response = await getAIResponse(aiInputMessages);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        createdAt: Date.now()
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      await chatService.addMessage(userId, convId, userMsg.role, userMsg.content, finalImageUrl);
      await chatService.addMessage(userId, convId, aiMsg.role, aiMsg.content);

    } catch (error) {
      console.error('AI Chat Error:', error);
      const errMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I could not connect right now. Please check your internet connection and try again.',
        createdAt: Date.now()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setUploading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'LifeOS AI',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: 'Outfit-Bold',
            fontSize: 20,
            color: colors.text
          },
          headerTransparent: Platform.OS === 'ios',
          headerStyle: Platform.OS === 'android' ? {
            backgroundColor: colors.background,
          } : undefined,
          headerBlurEffect: colors.isDark ? 'dark' : 'light',
          headerBackButtonDisplayMode: 'generic',
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable
              onPress={() => setIsHistoryVisible(true)}
              style={[styles.headerBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}
            >
              <IconSymbol name="clock.arrow.2.circlepath" size={20} color={colors.text} />
            </Pressable>
          )
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
      >
        {initialLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: Platform.OS === 'ios' ? headerHeight + 8 : 8 }
            ]}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => (
              <View key={m.id} style={[styles.messageWrapper, m.role === 'user' ? styles.userWrapper : styles.aiWrapper]}>
                {m.role === 'assistant' && (
                  <View style={styles.aiAvatar}>
                    <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.avatarGradient}>
                      <IconSymbol name="sparkles" size={14} color="#FFF" />
                    </LinearGradient>
                  </View>
                )}
                <View style={[
                  styles.messageBubble,
                  m.role === 'user' ? [styles.userBubble, { backgroundColor: colors.primary }] : [styles.aiBubble, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]
                ]}>
                  {m.imageUrl && (
                    <Image
                      source={{ uri: m.imageUrl }}
                      style={styles.messageImage}
                      contentFit="cover"
                      transition={200}
                    />
                  )}
                  {m.content ? (
                    <Text style={[styles.messageText, m.role === 'user' ? styles.userText : [styles.aiText, { color: colors.text }]]}>
                      {m.content}
                    </Text>
                  ) : m.imageUrl && (
                    <Text style={[styles.messageText, styles.userText, { fontStyle: 'italic', fontSize: 13, opacity: 0.7 }]}>
                      Image sent
                    </Text>
                  )}
                </View>
              </View>
            ))}
            {loading && (
              <View style={styles.aiWrapper}>
                <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                </View>
              </View>
            )}
          </ScrollView>
        )}

        <BlurView
          intensity={80}
          tint={colors.isDark ? 'dark' : 'light'}
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md), backgroundColor: colors.isDark ? 'rgba(11, 11, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderTopColor: colors.border }]}
        >
          {attachedImage && (
            <View style={styles.previewContainer}>
              <View style={[styles.previewWrapper, { borderColor: colors.border }]}>
                <Image source={{ uri: attachedImage.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removePreview}
                  onPress={() => setAttachedImage(null)}
                  accessibilityLabel="Remove attached image"
                >
                  <IconSymbol name="trash.fill" size={14} color="#FFF" />
                </TouchableOpacity>
                {uploading && (
                  <View style={styles.previewOverlay}>
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                )}
              </View>
            </View>
          )}

          {messages.length <= 1 && !loading && !attachedImage && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer} contentContainerStyle={styles.chipsContent}>
              {ACTION_CHIPS.map((chip, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
                  onPress={() => handleSend(chip.label)}
                  accessibilityLabel={chip.label}
                  accessibilityRole="button"
                >
                  <IconSymbol name={chip.icon as any} size={14} color={colors.textSecondary} />
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.inputWrapper}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => {
                Keyboard.dismiss();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                attachmentSheetRef.current?.present();
              }}
              accessibilityLabel="Attach image"
              accessibilityRole="button"
            >
              <View style={[styles.attachIconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
                <IconSymbol name="plus" size={20} color={colors.text} />
              </View>
            </TouchableOpacity>

            <View style={[styles.textInputContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Message LifeOS..."
                placeholderTextColor={colors.textSecondary + '60'}
                value={input}
                onChangeText={setInput}
                multiline
                maxLength={2000}
                accessibilityLabel="Message input"
              />
              {(input.length > 0 || attachedImage) && (
                <TouchableOpacity
                  onPress={() => handleSend()}
                  style={styles.sendBtn}
                  disabled={uploading || loading}
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={[styles.sendBtnGradient, (uploading || loading) && { opacity: 0.5 }]}
                  >
                    {(uploading || loading)
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <IconSymbol name="arrow.up" size={18} color="#FFF" />
                    }
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BlurView>
      </KeyboardAvoidingView>

      <ChatHistorySidebar
        userId={userId || ''}
        isVisible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
        onSelectChat={loadConversation}
        onNewChat={handleNewChat}
        currentConversationId={currentConversationId}
      />

      <AIAttachmentSheet
        ref={attachmentSheetRef}
        onSelectImage={(uri, base64, mimeType) => {
          if (base64 && mimeType) {
            setAttachedImage({ uri, base64, mimeType });
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  messageWrapper: {
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  aiWrapper: {
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 2,
  },
  avatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: width * 0.78,
    padding: 14,
    borderRadius: 18,
  },
  userBubble: {
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  loadingBubble: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
  },
  messageText: {
    ...Typography.body,
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
  },
  footer: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  chipsContainer: {
    marginBottom: Spacing.md,
  },
  chipsContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  chipText: {
    ...Typography.caption,
    fontSize: 13,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  attachBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  attachIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    ...Typography.body,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    fontSize: 16,
    maxHeight: 120,
  },
  sendBtn: {
    marginBottom: 2,
    marginLeft: 4,
  },
  sendBtnGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
  },
  previewWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePreview: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageImage: {
    width: width * 0.65,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
