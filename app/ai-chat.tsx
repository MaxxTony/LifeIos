import { AIAttachmentSheet } from '@/components/AIAttachmentSheet';
import { BlurView } from '@/components/BlurView';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getAIResponse } from '@/services/ai';
import { analyticsService } from '@/services/analyticsService';
import { ChatMessage, chatService } from '@/services/chatService';
import { useStore } from '@/store/useStore';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useHeaderHeight } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { IconSymbol } from '../components/ui/icon-symbol';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

const { width } = Dimensions.get('window');

const ACTION_CHIPS = [
  { label: 'Plan my day', icon: 'sparkles' },
  { label: 'Add a task', icon: 'checklist' },
  { label: 'Add a habit', icon: 'plus' },
  { label: 'Check trends', icon: 'chart.bar.fill' },
  { label: 'Leaderboard', icon: 'person.2.fill' },
  { label: 'Update profile', icon: 'person.crop.circle' },
  { label: 'Change theme', icon: 'paintbrush.fill' },
  { label: 'Analyze my mood', icon: 'waveform' },
  { label: 'Give me advice', icon: 'paperplane.fill' },
];

export default function AIChatScreen() {
  const userId = useStore(s => s.userId);
  const userName = useStore(s => s.userName);
  const proactivePrompt = useStore(s => s.proactivePrompt);
  const dismissProactive = useStore(s => s.actions.dismissProactive);
  const isOffline = useStore(s => s.syncStatus.isOffline);
  const accentColor = useStore(s => s.accentColor);
  const colors = useThemeColors();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ uri: string, base64: string, mimeType: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const scrollViewRef = useRef<ScrollView>(null);
  const attachmentSheetRef = useRef<BottomSheetModal>(null);
  const isMounted = useRef(true);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    isMounted.current = true;
    
    // Voice listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    return () => { 
      isMounted.current = false; 
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const onSpeechStart = () => {
    setIsListening(true);
    startPulse();
  };

  const onSpeechEnd = () => {
    setIsListening(false);
    stopPulse();
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    const code = e.error?.code;
    // 216 = iOS speech timeout (natural end), 7 = Android no match — both are silent ends, not real errors
    if (code === '216' || code === '7' || code === 'recognition_fail') {
      setIsListening(false);
      stopPulse();
      return;
    }
    console.error('Speech Error:', e);
    setIsListening(false);
    stopPulse();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value[0]) {
      setVoiceText(e.value[0]);
    }
  };

  const onSpeechPartialResults = (e: SpeechResultsEvent) => {
    if (e.value && e.value[0]) {
      setVoiceText(e.value[0]);
    }
  };

  const startVoice = async () => {
    try {
      setVoiceText('');
      setIsRecordingMode(true);
      Keyboard.dismiss();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Voice.start('en-US');
    } catch (e) {
      console.error(e);
      setIsRecordingMode(false);
    }
  };

  const cancelVoice = async () => {
    try { await Voice.cancel(); } catch {}
    stopPulse();
    setIsListening(false);
    setIsRecordingMode(false);
    setVoiceText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const sendVoice = async () => {
    const text = voiceText.trim();
    try { await Voice.cancel(); } catch {}
    stopPulse();
    setIsListening(false);
    setIsRecordingMode(false);
    setVoiceText('');
    if (text) handleSend(text);
  };

  useEffect(() => {
    if (!currentConversationId && messages.length === 0) {
      const welcomeContent = proactivePrompt
        ? `${proactivePrompt.message} ✨`
        : `Hi ${userName || 'there'}! 👋 I'm your LifeOS assistant. How can I help you manage your day today?`;

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
    await chatService.getMessages(userId, id, undefined, (result) => {
      setMessages(result.messages);
      setLastVisibleDoc(result.lastVisible);
      setHasMore(result.messages.length === 50);
      setInitialLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
    });
  };

  const loadMoreMessages = async () => {
    if (!userId || !currentConversationId || !lastVisibleDoc || isLoadingMore) return;

    setIsLoadingMore(true);
    const result = await chatService.getMessages(userId, currentConversationId, lastVisibleDoc);

    if (result.messages.length > 0) {
      // M-08 FIX: Cap total in-memory messages at 200 to prevent JS thread lag on long sessions.
      const MAX_MESSAGES = 200;
      setMessages(prev => [...result.messages, ...prev].slice(-MAX_MESSAGES));
      setLastVisibleDoc(result.lastVisible);
      setHasMore(result.messages.length === 50);
    } else {
      setHasMore(false);
    }
    setIsLoadingMore(false);
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
    if (isOffline) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const text = (textOverride || input).slice(0, 10000);
    if (!userId || (!text.trim() && !attachedImage) || loading) return;

    // Clear input immediately for better UX
    const currentAttachedImage = attachedImage;
    if (!textOverride) setInput('');
    setAttachedImage(null);

    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    let convId = currentConversationId;

    if (!convId) {
      convId = await chatService.createConversation(userId, text || 'Sent an image');
      setCurrentConversationId(convId);
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      imageUrl: currentAttachedImage?.uri,
      createdAt: Date.now()
    };

    analyticsService.logEvent(userId, 'ai_message_sent', {
      hasImage: !!currentAttachedImage,
      textLength: text.length
    });

    const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMsg];
    setMessages(newMessages);
    setLoading(true);

    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      let finalImageUrl = undefined;
      if (currentAttachedImage) {
        if (isMounted.current) setUploading(true);
        finalImageUrl = await chatService.uploadImage(
          userId,
          currentAttachedImage.uri
        );
        if (isMounted.current) setUploading(false);
      }

      // BUG-006 FIX: Save user message to Firestore BEFORE the AI call.
      // This ensures message persistence even if the AI response fails or is slow.
      await chatService.addMessage(userId, convId, userMsg.role, userMsg.content, finalImageUrl);

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

      if (response.text === 'UNAUTHENTICATED') {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I need you to sign in again to continue our conversation. Your session may have expired.',
          createdAt: Date.now()
        };
        setMessages(prev => [...prev.filter(m => m.id !== 'welcome'), aiMsg]);
        setLoading(false);
        return;
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        card: response.card,
        createdAt: Date.now()
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      // 📳 Haptic Feedback Patterns
      if (response.text.includes('🔹')) {
        // Happy Pulse for success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (response.text.includes('❌') || response.text.includes('UNAUTHENTICATED')) {
        // Alert Buzz for errors
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      // Save assistant message
      await chatService.addMessage(userId, convId, aiMsg.role, aiMsg.content, undefined, aiMsg.card);

    } catch (error) {
      console.error('AI Chat Error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const errMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I could not connect right now. Please check your internet connection and try again.',
        createdAt: Date.now()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setUploading(false);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
      }
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
            {hasMore && (
              <TouchableOpacity
                onPress={loadMoreMessages}
                disabled={isLoadingMore}
                style={[styles.loadMoreBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border }]}
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <IconSymbol name="arrow.up.circle" size={16} color={colors.primary} />
                    <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load older messages</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {!hasMore && messages.length >= 50 && (
              <View style={[styles.limitIndicator, { backgroundColor: colors.isDark ? 'rgba(124, 92, 255, 0.1)' : 'rgba(124, 92, 255, 0.05)', borderColor: colors.primary + '30' }]}>
                <IconSymbol name="info.circle" size={14} color={colors.primary} />
                <Text style={[styles.limitText, { color: colors.textSecondary }]}>
                  All messages loaded.
                </Text>
              </View>
            )}
            {messages.slice(messages.length > 100 ? 1 : 0).map((m) => (
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
                  {m.card && (
                    <View style={styles.cardContainer}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{m.card.title}</Text>
                      {m.card.type === 'poll' && m.card.options?.map((opt, idx) => (
                        <TouchableOpacity key={idx} style={[styles.cardItem, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
                          <Text style={[styles.cardItemText, { color: colors.text }]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                      {m.card.type === 'checklist' && m.card.options?.map((opt, idx) => (
                        <View key={idx} style={styles.checklistRow}>
                          <IconSymbol name="square" size={16} color={colors.textSecondary} />
                          <Text style={[styles.cardItemText, { color: colors.text }]}>{opt}</Text>
                        </View>
                      ))}
                      {m.card.type === 'progress' && (
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${m.card.value || 0}%`, backgroundColor: accentColor || '#7C5CFF' }]} />
                          <Text style={styles.progressText}>{m.card.value || 0}%</Text>
                        </View>
                      )}
                    </View>
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

          {isRecordingMode ? (
            <View style={styles.recordingWrapper}>
              <TouchableOpacity onPress={cancelVoice} style={[styles.recordingActionBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]} accessibilityLabel="Cancel recording">
                <IconSymbol name="xmark" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={[styles.recordingBubble, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: isListening ? '#FF4B4B60' : colors.border }]}>
                <View style={styles.recordingStatus}>
                  <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
                  <Text style={[styles.recordingLabel, { color: '#FF4B4B' }]}>
                    {isListening ? 'Listening...' : 'Done — review & send'}
                  </Text>
                </View>
                <Text style={[styles.recordingTranscript, { color: voiceText ? colors.text : colors.textSecondary + '80' }]} numberOfLines={3}>
                  {voiceText || 'Start speaking...'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={sendVoice}
                disabled={!voiceText.trim()}
                accessibilityLabel="Send voice message"
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={[styles.sendBtnGradient, !voiceText.trim() && { opacity: 0.35 }]}
                >
                  <IconSymbol name="arrow.up" size={18} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
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
                {(input.length > 0 || attachedImage) ? (
                  <TouchableOpacity
                    onPress={() => handleSend()}
                    style={styles.sendBtn}
                    disabled={uploading || loading || isOffline}
                    accessibilityLabel="Send message"
                    accessibilityRole="button"
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      style={[styles.sendBtnGradient, (uploading || loading || isOffline) && { opacity: 0.5 }]}
                    >
                      {(uploading || loading)
                        ? <ActivityIndicator size="small" color="#FFF" />
                        : <IconSymbol name="arrow.up" size={18} color="#FFF" />
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={startVoice}
                    style={styles.voiceBtn}
                    accessibilityLabel="Start voice input"
                    accessibilityRole="button"
                  >
                    <IconSymbol name="mic.fill" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
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
  limitIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  limitText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
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
  cardContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    marginBottom: 10,
  },
  cardItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  cardItemText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  progressTrack: {
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  progressText: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 10,
    fontFamily: 'Outfit-Bold',
    color: '#FFF',
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
  voiceBtn: {
    padding: 6,
    marginRight: 4,
  },
  recordingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  recordingActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingBubble: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 4,
  },
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4B4B',
  },
  recordingLabel: {
    fontFamily: 'Outfit-Medium',
    fontSize: 12,
  },
  recordingTranscript: {
    fontFamily: 'Outfit-Regular',
    fontSize: 15,
    lineHeight: 20,
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
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  loadMoreText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
  },
});
