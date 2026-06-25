import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';
import { mockPlantingQA } from '../data/mockData';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface GeminiChatModalProps {
  visible: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  'How much fertilizer?',
  'When should I harvest?',
  'How to control pests?',
  'What water level to keep?',
  'What if heavy rain comes?',
];

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'ai',
  text: "Hello, Juan! I'm GeoRice AI. Ask me anything about your NSIC Rc160 planting guide — fertilizer, pest control, irrigation, harvest timing, and more.",
  timestamp: new Date(),
};

function matchResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const qa of mockPlantingQA) {
    if (qa.keywords.some(k => lower.includes(k))) {
      return qa.answer;
    }
  }
  return "That's a great question! For best results, I recommend consulting your local DA (Department of Agriculture) extension officer or checking the NSIC Rc160 technical guide. Is there anything specific about fertilizer, pests, water, or harvest timing I can help with?";
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );
    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 200);
    const a3 = pulse(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={ti.bubble}>
      <View style={ti.geminiTag}>
        <Ionicons name="sparkles" size={10} color={theme.colors.primary} />
        <Text style={ti.geminiLabel}>GeoRice AI</Text>
      </View>
      <View style={ti.dots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[ti.dot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

function formatText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <Text key={i} style={{ fontWeight: '700', color: theme.colors.text }}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    scrollToBottom();

    setTimeout(() => {
      const aiMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'ai',
        text: matchResponse(trimmed),
        timestamp: new Date(),
      };
      setIsTyping(false);
      setMessages(prev => [...prev, aiMsg]);
      scrollToBottom();
    }, 1200);
  };

  const handleClose = () => {
    setMessages([WELCOME_MESSAGE]);
    setInput('');
    setIsTyping(false);
    onClose();
  };

  const showSuggestions = messages.length <= 1;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={s.overlay}>
        <KeyboardAvoidingView
          style={s.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={s.aiAvatar}>
                <Ionicons name="sparkles" size={18} color={theme.colors.white} />
              </View>
              <View>
                <Text style={s.headerTitle}>GeoRice AI</Text>
                <Text style={s.poweredText}>AI Assistant</Text>
              </View>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={handleClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Context banner */}
          <View style={s.contextBanner}>
            <Ionicons name="leaf-outline" size={13} color={theme.colors.primary} />
            <Text style={s.contextText}>
              Context: <Text style={{ fontWeight: '700' }}>NSIC Rc160</Text> · Wet Season 2024
            </Text>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={s.messageArea}
            contentContainerStyle={s.messageContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(msg =>
              msg.role === 'ai' ? (
                <View key={msg.id} style={s.aiBubbleWrapper}>
                  <View style={s.aiDotAvatar}>
                    <Ionicons name="sparkles" size={10} color={theme.colors.primary} />
                  </View>
                  <View style={s.aiBubble}>
                    <Text style={s.aiBubbleText}>{formatText(msg.text)}</Text>
                  </View>
                </View>
              ) : (
                <View key={msg.id} style={s.userBubbleWrapper}>
                  <View style={s.userBubble}>
                    <Text style={s.userBubbleText}>{msg.text}</Text>
                  </View>
                </View>
              )
            )}

            {isTyping && <TypingIndicator />}

            {showSuggestions && (
              <View style={s.suggestionsWrapper}>
                <Text style={s.suggestionsLabel}>Suggested questions</Text>
                {SUGGESTIONS.map(q => (
                  <TouchableOpacity
                    key={q}
                    style={s.suggestionChip}
                    onPress={() => sendMessage(q)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.suggestionText}>{q}</Text>
                    <Ionicons name="arrow-forward" size={13} color={theme.colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Input bar */}
          <View style={s.inputBar}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your planting guide..."
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              maxLength={300}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || isTyping) && s.sendBtnDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              activeOpacity={0.8}
            >
              <Ionicons name="send" size={18} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: '65%',
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  poweredRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  poweredText: { fontSize: 11, color: theme.colors.textTertiary },
  geminiText: { fontSize: 11, fontWeight: '700', color: '#4285F4' },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  // Context banner
  contextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLighter,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 8,
  },
  contextText: { fontSize: 12, color: theme.colors.primaryDark, flex: 1 },

  // Messages
  messageArea: { flex: 1 },
  messageContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: 12,
  },

  aiBubbleWrapper: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '88%' },
  aiDotAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: theme.colors.primaryLighter,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4, flexShrink: 0,
  },
  aiBubble: {
    backgroundColor: theme.colors.white,
    borderRadius: 18, borderTopLeftRadius: 4,
    paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: theme.colors.borderLight,
    flex: 1,
  },
  aiBubbleText: { fontSize: 14, color: theme.colors.text, lineHeight: 21 },

  userBubbleWrapper: { alignItems: 'flex-end' },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderRadius: 18, borderBottomRightRadius: 4,
    paddingVertical: 12, paddingHorizontal: 14,
    maxWidth: '80%',
  },
  userBubbleText: { fontSize: 14, color: theme.colors.white, lineHeight: 21 },

  // Suggestions
  suggestionsWrapper: { marginTop: theme.spacing.sm, gap: 8 },
  suggestionsLabel: {
    fontSize: 11, fontWeight: '700', color: theme.colors.textTertiary,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.full,
    paddingVertical: 11, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: theme.colors.border,
  },
  suggestionText: { fontSize: 13, fontWeight: '600', color: theme.colors.text, flex: 1 },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: theme.colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderLight,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: theme.colors.disabled },
});

// Typing indicator styles
const ti = StyleSheet.create({
  bubble: {
    maxWidth: '60%',
    backgroundColor: theme.colors.white,
    borderRadius: 18, borderTopLeftRadius: 4,
    paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: theme.colors.borderLight,
    gap: 6,
  },
  geminiTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  geminiLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primaryLight },
});
