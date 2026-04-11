import { AIAttachmentSheet } from '@/components/AIAttachmentSheet';
import { ChatHistorySidebar } from '@/components/ChatHistorySidebar';
import { VoiceWaves } from '@/components/VoiceWaves';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { getAIResponse } from '@/services/ai';
import { ChatMessage, chatService } from '@/services/chatService';
import { useStore } from '@/store/useStore';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
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
  { label: 'Analyze mood', icon: 'waveform' },
  { label: 'Look something up', icon: 'paperplane.fill' },
];

export default function AIChatScreen() {
  const { userId, userName } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [attachedImage, setAttachedImage] = useState<{ uri: string, base64: string, mimeType: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const attachmentSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!currentConversationId && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hi ${userName || 'there'}! I'm your LifeOS assistant. How can I help you manage your day?`,
        createdAt: Date.now()
      }]);
    }
  }, [userName, currentConversationId, messages.length]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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
      content: `Hi ${userName}! Let's start fresh. What's on your mind?`,
      createdAt: Date.now()
    }]);
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!userId || (!text.trim() && !attachedImage) || loading) return;

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
      imageUrl: currentAttachedImage?.uri, // Temp local URI for immediate display
      createdAt: Date.now()
    };

    const newMessages = [...messages.filter(m => m.id !== 'welcome'), userMsg];
    setMessages(newMessages);
    setLoading(true);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      let finalImageUrl = undefined;
      if (currentAttachedImage) {
        setUploading(true);
        // Use direct base64 storage to avoid Firebase Storage billing requirements
        finalImageUrl = await chatService.uploadImage(
          userId, 
          currentAttachedImage.uri, 
          currentAttachedImage.base64, 
          currentAttachedImage.mimeType
        );
        setUploading(false);
      }

      // Format messages for AI with image data if available
      const aiInputMessages = newMessages.map(m => {
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
      
      // Persist to store/cloud
      await chatService.addMessage(userId, convId, userMsg.role, userMsg.content, finalImageUrl);
      await chatService.addMessage(userId, convId, aiMsg.role, aiMsg.content);
      
    } catch (error) {
      console.error('AI Chat Error:', error);
    } finally {
      setLoading(false);
      setUploading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const toggleVoice = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsVoiceActive(!isVoiceActive);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: 'LifeOS AI',
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: 'Outfit-Bold',
            fontSize: 20,
            color: '#FFF'
          },
          headerTransparent: true,
          headerBlurEffect: 'dark',
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsHistoryVisible(true)} style={styles.headerBtn}>
              <IconSymbol name="clock.arrow.2.circlepath" size={20} color="#FFF" />
            </TouchableOpacity>
          )
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
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
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => (
              <View key={m.id} style={[styles.messageWrapper, m.role === 'user' ? styles.userWrapper : styles.aiWrapper]}>
                {m.role === 'assistant' && (
                  <View style={styles.aiAvatar}>
                    <LinearGradient colors={['#6366f1', '#a855f7']} style={styles.avatarGradient}>
                      <IconSymbol name="sparkles" size={14} color="#FFF" />
                    </LinearGradient>
                  </View>
                )}
                <View style={[styles.messageBubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                  {m.imageUrl && (
                    <Image 
                      source={{ uri: m.imageUrl }} 
                      style={styles.messageImage} 
                      contentFit="cover"
                      transition={200}
                    />
                  )}
                  {m.content ? (
                    <Text style={[styles.messageText, m.role === 'user' ? styles.userText : styles.aiText]}>
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
                <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={Colors.dark.textSecondary} />
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Floating Input Area */}
        <BlurView intensity={80} tint="dark" style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          {attachedImage && (
            <View style={styles.previewContainer}>
              <View style={styles.previewWrapper}>
                <Image source={{ uri: attachedImage.uri }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removePreview} 
                  onPress={() => setAttachedImage(null)}
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
                <TouchableOpacity key={i} style={styles.chip} onPress={() => handleSend(chip.label)}>
                  <IconSymbol name={chip.icon as any} size={14} color={Colors.dark.textSecondary} />
                  <Text style={styles.chipText}>{chip.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.inputWrapper}>
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                attachmentSheetRef.current?.present();
              }}
            >
              <View style={styles.attachIconBg}>
                <IconSymbol name="plus" size={20} color={Colors.dark.text} />
              </View>
            </TouchableOpacity>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Message LifeOS..."
                placeholderTextColor={Colors.dark.textSecondary}
                value={input}
                onChangeText={setInput}
                multiline
              />
              {(input.length > 0 || attachedImage) ? (
                <TouchableOpacity onPress={() => handleSend()} style={styles.sendBtn} disabled={uploading}>
                  <LinearGradient colors={['#6366f1', '#a855f7']} style={[styles.sendBtnGradient, uploading && { opacity: 0.5 }]}>
                    {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <IconSymbol name="arrow.up" size={18} color="#FFF" />}
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={toggleVoice} style={styles.voiceBtn}>
                  {isVoiceActive ? (
                    <VoiceWaves isActive={true} />
                  ) : (
                    <IconSymbol name="waveform" size={20} color={Colors.dark.textSecondary} />
                  )}
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
    backgroundColor: Colors.dark.background,
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
    marginRight: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  messagesContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 130 : 110,
    paddingBottom: 180, // Space for the floating footer content
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
    backgroundColor: '#3730a3',
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  aiBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  loadingBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    color: '#E0E1E5',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(11, 11, 15, 0.75)',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  chipText: {
    ...Typography.caption,
    color: Colors.dark.textSecondary,
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: '#FFFFFF',
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
  voiceBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
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
    borderColor: 'rgba(255,255,255,0.2)',
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
