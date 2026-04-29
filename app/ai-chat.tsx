import { AIAttachmentSheet } from '@/components/AIAttachmentSheet';
import { BlurView } from '@/components/BlurView';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { Spacing } from '@/constants/theme';
import { useProGate } from '@/hooks/useProFeature';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getAIResponse } from '@/services/ai';
import { analyticsService } from '@/services/analyticsService';
import { ChatMessage, chatService } from '@/services/chatService';
import { useStore } from '@/store/useStore';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';
import { useHeaderHeight } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  ListRenderItem,
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
  const { isPro, canUseAI, remainingAIMessages, openPaywall } = useProGate();
  const incrementAIMessageCount = useStore(s => s.actions.incrementAIMessageCount);
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

  const flatListRef = useRef<FlatList>(null);
  const attachmentSheetRef = useRef<BottomSheetModal>(null);
  const inputRef = useRef<TextInput>(null);
  const isMounted = useRef(true);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    isMounted.current = true;
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    return () => {
      isMounted.current = false;
      try {
        Voice.destroy().then(Voice.removeAllListeners).catch(e => console.warn('Voice destroy error:', e));
      } catch (e) {
        console.warn('Voice cleanup error:', e);
      }
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

  const onSpeechStart = () => { setIsListening(true); startPulse(); };
  const onSpeechEnd = () => { setIsListening(false); stopPulse(); };
  const onSpeechError = (e: SpeechErrorEvent) => {
    const code = e.error?.code;
    if (code === '216' || code === '7' || code === 'recognition_fail') {
      setIsListening(false); stopPulse(); return;
    }
    setIsListening(false); stopPulse();
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (err) { }
  };
  const onSpeechResults = (e: SpeechResultsEvent) => { if (e.value && e.value[0]) setVoiceText(e.value[0]); };
  const onSpeechPartialResults = (e: SpeechResultsEvent) => { if (e.value && e.value[0]) setVoiceText(e.value[0]); };

  const startVoice = async () => {
    try {
      setVoiceText(''); setIsRecordingMode(true); Keyboard.dismiss();
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) { }
      await Voice.start('en-US');
    } catch (e) { console.error(e); setIsRecordingMode(false); }
  };

  const cancelVoice = async () => {
    try { await Voice.cancel(); } catch { }
    stopPulse(); setIsListening(false); setIsRecordingMode(false); setVoiceText('');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { }
  };

  const sendVoice = async () => {
    const text = voiceText.trim();
    try { await Voice.cancel(); } catch { }
    stopPulse(); setIsListening(false); setIsRecordingMode(false); setVoiceText('');
    if (text) handleSend(text);
  };

  useEffect(() => {
    let active = true;

    const initChat = async () => {
      if (currentConversationId || messages.length > 0 || !userId) return;

      if (proactivePrompt) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `${proactivePrompt.message} ✨`,
          createdAt: Date.now()
        }]);
        dismissProactive();
        return;
      }

      setInitialLoading(true);
      try {
        const convs = await chatService.getConversations(userId);
        if (!active) return;

        if (convs && convs.length > 0) {
          loadConversation(convs[0].id);
        } else {
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Hi ${userName || 'there'}! 👋 I'm your LifeOS assistant. How can I help you manage your day today?`,
            createdAt: Date.now()
          }]);
          setInitialLoading(false);
        }
      } catch (err) {
        if (!active) return;
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hi ${userName || 'there'}! 👋 I'm your LifeOS assistant. How can I help you manage your day today?`,
          createdAt: Date.now()
        }]);
        setInitialLoading(false);
      }
    };

    initChat();

    return () => { active = false; };
  }, [userName, currentConversationId, messages.length, proactivePrompt, userId]);

  const loadConversation = async (id: string) => {
    if (!userId || id === currentConversationId) return;
    setInitialLoading(true);
    setCurrentConversationId(id);
    await chatService.getMessages(userId, id, undefined, (result) => {
      // getMessages returns newest first (desc). 
      // Inverted FlatList: messages[0] will be at the bottom (most recent). Perfect.
      setMessages(result.messages);
      setLastVisibleDoc(result.lastVisible);
      setHasMore(result.messages.length === 50);
      setInitialLoading(false);
    });
  };

  const loadMoreMessages = async () => {
    if (!userId || !currentConversationId || !lastVisibleDoc || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const result = await chatService.getMessages(userId, currentConversationId, lastVisibleDoc);
    if (result.messages.length > 0) {
      const MAX_MESSAGES = 200;
      setMessages(prev => [...prev, ...result.messages].slice(0, MAX_MESSAGES));
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
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) { }
      return;
    }
    const text = (textOverride || input).slice(0, 10000);
    if (!userId || (!text.trim() && !attachedImage) || loading) return;
    if (!canUseAI) {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) { }
      openPaywall(); return;
    }
    const currentAttachedImage = attachedImage;
    // Dismiss keyboard FIRST so iOS finalizes any pending autocorrect / marked
    // text state before we clear — otherwise a late onChangeText("K") fires
    // after setInput('') and the input reverts to the last typed character.
    Keyboard.dismiss();
    if (!textOverride) {
      inputRef.current?.clear();
      setInput('');
    }
    setAttachedImage(null);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) { }
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
    const newMessages = [userMsg, ...messages];
    setMessages(newMessages);
    setLoading(true);
    try {
      let finalImageUrl = undefined;
      if (currentAttachedImage) {
        if (isMounted.current) setUploading(true);
        finalImageUrl = await chatService.uploadImage(userId, currentAttachedImage.uri);
        if (isMounted.current) setUploading(false);
      }
      await chatService.addMessage(userId, convId, userMsg.role, userMsg.content, finalImageUrl);
      const MAX_HISTORY = 20;
      const historyForAI = newMessages.filter(m => m.id !== 'welcome');
      const windowedMessages = historyForAI.length > MAX_HISTORY
        ? [...historyForAI].reverse().slice(-MAX_HISTORY)
        : [...historyForAI].reverse();
      const aiInputMessages = windowedMessages.map(m => {
        if (m.id === userMsg.id && currentAttachedImage) {
          return {
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            image: { base64: currentAttachedImage.base64, mimeType: currentAttachedImage.mimeType }
          };
        }
        return { role: m.role as 'user' | 'assistant' | 'system', content: m.content };
      });
      const response = await getAIResponse(aiInputMessages);
      if (response.text === 'UNAUTHENTICATED') {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'I need you to sign in again to continue our conversation.',
          createdAt: Date.now()
        };
        setMessages(prev => [aiMsg, ...prev]);
        setLoading(false); return;
      }
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        card: response.card,
        createdAt: Date.now()
      };
      setMessages(prev => [aiMsg, ...prev]);
      if (response.text.includes('🔹')) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) { }
      } else if (response.text.includes('❌')) {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) { }
      }
      await chatService.addMessage(userId, convId, aiMsg.role, aiMsg.content, undefined, aiMsg.card);
      incrementAIMessageCount();
    } catch (error) {
      console.error('AI Chat Error:', error);
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) { }
      const errMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I could not connect right now.',
        createdAt: Date.now()
      };
      setMessages(prev => [errMsg, ...prev]);
    } finally {
      if (isMounted.current) { setLoading(false); setUploading(false); }
    }
  };

  const renderMessage: ListRenderItem<ChatMessage> = ({ item: m }) => (
    <View style={[styles.messageWrapper, m.role === 'user' ? styles.userWrapper : styles.aiWrapper]}>
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
          <Image source={{ uri: m.imageUrl }} style={styles.messageImage} contentFit="cover" transition={200} />
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
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'LifeOS AI',
          headerTitleAlign: 'center',
          headerTitleStyle: { fontFamily: 'Outfit-Bold', fontSize: 20, color: colors.text },
          headerTransparent: Platform.OS === 'ios',
          headerStyle: Platform.OS === 'android' ? { backgroundColor: colors.background } : undefined,
          headerBlurEffect: colors.isDark ? 'dark' : 'light',
          headerTintColor: colors.text,
          headerBackTitle: 'Back', // Hides the '(tabs)' text next to the back button
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {initialLoading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {!isPro && (
              <View style={[styles.topLimitBadge, { marginTop: Platform.OS === 'ios' ? headerHeight : 0, backgroundColor: colors.isDark ? 'rgba(124, 92, 255, 0.1)' : 'rgba(124, 92, 255, 0.05)', borderColor: colors.primary + '20' }]}>
                <Ionicons name="sparkles" size={12} color={colors.primary} />
                <Text style={[styles.topLimitText, { color: colors.textSecondary }]}>
                  {remainingAIMessages} {remainingAIMessages === 1 ? 'message' : 'messages'} remaining today
                </Text>
              </View>
            )}

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessage}
              inverted
              contentContainerStyle={[styles.scrollContent, { paddingTop: Platform.OS === 'ios' ? 0 : 8 }]}
              onEndReached={loadMoreMessages}
              onEndReachedThreshold={0.5}
              ListHeaderComponent={() => (
                loading ? (
                  <View style={[styles.messageWrapper, styles.aiWrapper]}>
                    <View style={styles.aiAvatar}>
                      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.avatarGradient}>
                        <IconSymbol name="sparkles" size={14} color="#FFF" />
                      </LinearGradient>
                    </View>
                    <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                      <ActivityIndicator size="small" color={colors.textSecondary} />
                    </View>
                  </View>
                ) : null
              )}
              ListFooterComponent={() => (
                messages.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <View style={[styles.aiAvatar, { marginBottom: 16, width: 64, height: 64, borderRadius: 32 }]}>
                      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.avatarGradient}>
                        <IconSymbol name="sparkles" size={32} color="#FFF" />
                      </LinearGradient>
                    </View>
                    <Text style={[styles.welcomeTitle, { color: colors.text }]}>Hello, {userName}!</Text>
                    <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
                      I'm your LifeOS assistant. How can I help you level up today?
                    </Text>
                  </View>
                ) : isLoadingMore ? (
                  <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} />
                ) : null
              )}
            />

            <BlurView
              intensity={80}
              tint={colors.isDark ? 'dark' : 'light'}
              style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md), backgroundColor: colors.isDark ? 'rgba(11, 11, 15, 0.95)' : 'rgba(255, 255, 255, 0.95)', borderTopColor: colors.border }]}
            >
              {attachedImage && (
                <View style={styles.previewContainer}>
                  <View style={[styles.previewWrapper, { borderColor: colors.border }]}>
                    <Image source={{ uri: attachedImage.uri }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removePreview} onPress={() => setAttachedImage(null)}>
                      <IconSymbol name="trash.fill" size={14} color="#FFF" />
                    </TouchableOpacity>
                    {uploading && (
                      <View style={styles.previewOverlay}><ActivityIndicator size="small" color="#FFF" /></View>
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
                    >
                      <IconSymbol name={chip.icon as any} size={14} color={colors.textSecondary} />
                      <Text style={[styles.chipText, { color: colors.textSecondary }]}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {isRecordingMode ? (
                <View style={styles.recordingWrapper}>
                  <TouchableOpacity onPress={cancelVoice} style={[styles.recordingActionBtn, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                    <IconSymbol name="xmark" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <View style={[styles.recordingBubble, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: isListening ? '#FF4B4B60' : colors.border }]}>
                    <View style={styles.recordingStatus}>
                      <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
                      <Text style={[styles.recordingLabel, { color: '#FF4B4B' }]}>{isListening ? 'Listening...' : 'Done'}</Text>
                    </View>
                    <Text style={[styles.recordingTranscript, { color: voiceText ? colors.text : colors.textSecondary + '80' }]} numberOfLines={2}>
                      {voiceText || 'Start speaking...'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={sendVoice} disabled={!voiceText.trim()}>
                    <LinearGradient colors={[colors.primary, colors.secondary]} style={[styles.sendBtnGradient, !voiceText.trim() && { opacity: 0.35 }]}>
                      <IconSymbol name="arrow.up" size={18} color="#FFF" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : canUseAI ? (
                <View style={styles.inputWrapper}>
                  <TouchableOpacity
                    style={styles.attachBtn}
                    onPress={() => {
                      Keyboard.dismiss();
                      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) { }
                      attachmentSheetRef.current?.present();
                    }}
                  >
                    <View style={[styles.attachIconBg, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
                      <IconSymbol name="plus" size={20} color={colors.text} />
                    </View>
                  </TouchableOpacity>

                  <View style={[styles.textInputContainer, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: colors.border }]}>
                    <TextInput
                      ref={inputRef}
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Message LifeOS..."
                      placeholderTextColor={colors.textSecondary + '60'}
                      value={input}
                      onChangeText={setInput}
                      multiline
                      maxLength={2000}
                    />
                    {(input.length > 0 || attachedImage) ? (
                      <TouchableOpacity onPress={() => handleSend()} style={styles.sendBtn} disabled={uploading || loading || isOffline}>
                        <LinearGradient colors={[colors.primary, colors.secondary]} style={[styles.sendBtnGradient, (uploading || loading || isOffline) && { opacity: 0.5 }]}>
                          {(uploading || loading) ? <ActivityIndicator size="small" color="#FFF" /> : <IconSymbol name="arrow.up" size={18} color="#FFF" />}
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={startVoice} style={styles.voiceBtn}>
                        <IconSymbol name="mic.fill" size={22} color={colors.textSecondary + '40'} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={openPaywall} style={[styles.lockedInputWrapper, { backgroundColor: colors.isDark ? 'rgba(255,165,0,0.05)' : 'rgba(255,165,0,0.03)', borderColor: 'rgba(255,165,0,0.2)' }]}>
                  <Ionicons name="lock-closed" size={16} color="#FFA500" />
                  <Text style={styles.lockedInputText}>Daily limit reached. <Text style={{ color: '#FFA500', fontFamily: 'Outfit-Bold' }}>Upgrade to continue</Text></Text>
                </TouchableOpacity>
              )}
            </BlurView>
          </>
        )}
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
          if (base64 && mimeType) setAttachedImage({ uri, base64, mimeType });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  scrollContent: { padding: Spacing.md },
  topLimitBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderBottomWidth: 1, marginBottom: 10, gap: 6 },
  topLimitText: { fontFamily: 'Outfit-Medium', fontSize: 11 },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100, paddingHorizontal: 40 },
  welcomeTitle: { fontFamily: 'Outfit-Bold', fontSize: 24, marginBottom: 8 },
  welcomeSub: { fontFamily: 'Outfit-Regular', fontSize: 15, textAlign: 'center', opacity: 0.8 },
  messageWrapper: { marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'flex-end' },
  userWrapper: { justifyContent: 'flex-end' },
  aiWrapper: { justifyContent: 'flex-start', gap: 12 },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  avatarGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageBubble: { maxWidth: width * 0.75, borderRadius: 20, padding: 12, borderWidth: 1 },
  userBubble: { borderBottomRightRadius: 4, borderColor: 'transparent' },
  aiBubble: { borderBottomLeftRadius: 4 },
  messageText: { fontFamily: 'Outfit-Regular', fontSize: 16, lineHeight: 22 },
  userText: { color: '#FFF' },
  aiText: {},
  messageImage: { width: width * 0.6, height: width * 0.45, borderRadius: 12, marginBottom: 8 },
  loadingBubble: { paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'center' },
  cardContainer: { marginTop: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, gap: 8 },
  cardTitle: { fontFamily: 'Outfit-Bold', fontSize: 14, marginBottom: 4 },
  cardItem: { padding: 10, borderRadius: 8 },
  cardItemText: { fontFamily: 'Outfit-Medium', fontSize: 14 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { height: 24, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', justifyContent: 'center' },
  progressFill: { height: '100%', position: 'absolute' },
  progressText: { fontFamily: 'Outfit-Bold', fontSize: 10, color: '#FFF', alignSelf: 'center' },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  attachBtn: { marginBottom: 4 },
  attachIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  textInputContainer: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  input: { flex: 1, fontFamily: 'Outfit-Regular', fontSize: 16, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { marginRight: 4 },
  sendBtnGradient: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  voiceBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  previewContainer: { marginBottom: 12 },
  previewWrapper: { width: 64, height: 64, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  removePreview: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  chipsContainer: { marginBottom: 12 },
  chipsContent: { gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  chipText: { fontFamily: 'Outfit-Medium', fontSize: 13 },
  recordingWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recordingActionBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  recordingBubble: { flex: 1, height: 50, borderRadius: 25, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center' },
  recordingStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  recordingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4B4B' },
  recordingLabel: { fontFamily: 'Outfit-Bold', fontSize: 10, textTransform: 'uppercase' },
  recordingTranscript: { fontFamily: 'Outfit-Regular', fontSize: 13 },
  lockedInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 16, borderWidth: 1, gap: 10 },
  lockedInputText: { fontFamily: 'Outfit-Medium', fontSize: 13, color: '#FFA500' },
  limitIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12, borderWidth: 1, marginVertical: 20, gap: 8 },
  limitTexts: { fontFamily: 'Outfit-Regular', fontSize: 13 },
});
