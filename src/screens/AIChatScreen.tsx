import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Animated, Pressable, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { mockPlantingQA } from '../data/mockData';
import { apiAI } from '@/services/apiService';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/i18n/useTranslation';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
}

interface HistoryItem {
  id: string;
  title: string;
  preview: string;
}

const HISTORY_ITEMS = {
  today: [
    { id: 'h1', title: 'Fertilizer Schedule', preview: 'How much fertilizer should I apply?' },
    { id: 'h2', title: 'Pest Control Tips',   preview: 'How do I control pests?' },
  ],
  yesterday: [
    { id: 'h3', title: 'Harvest Timing',    preview: 'When is the right time to harvest?' },
    { id: 'h4', title: 'Water Level Guide', preview: 'What water level should I keep?' },
  ],
  lastWeek: [
    { id: 'h5', title: 'Flood Risk Tips',   preview: 'What if heavy rain is expected?' },
    { id: 'h6', title: 'NSIC Rc160 Guide',  preview: 'Tell me about the NSIC Rc160 variety' },
  ],
};

// Icon + translation key per suggestion; labels resolved from `tr` at render.
const SUGGESTION_META: { key: 'aiSuggFertilizer' | 'aiSuggHarvest' | 'aiSuggPest' | 'aiSuggWater' | 'aiSuggRain'; icon: IoniconsName }[] = [
  { key: 'aiSuggFertilizer', icon: 'flask-outline' },
  { key: 'aiSuggHarvest',    icon: 'calendar-outline' },
  { key: 'aiSuggPest',       icon: 'bug-outline' },
  { key: 'aiSuggWater',      icon: 'water-outline' },
  { key: 'aiSuggRain',       icon: 'rainy-outline' },
];

function nowTime() {
  const d = new Date();
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

function matchResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const qa of mockPlantingQA) {
    if (qa.keywords.some(k => lower.includes(k))) return qa.answer;
  }
  return "That's a great question! For best results, consult your local DA extension officer or check the NSIC Rc160 technical guide. Is there anything specific about fertilizer, pests, water, or harvest timing I can help with?";
}

function InlineText({ text, baseStyle }: { text: string; baseStyle?: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <Text key={i} style={[baseStyle, s.mdBold]}>{part.slice(2, -2)}</Text>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <Text key={i} style={[baseStyle, s.mdCode]}>{part.slice(1, -1)}</Text>;
        }
        return <Text key={i} style={baseStyle}>{part}</Text>;
      })}
    </>
  );
}

function MarkdownMessage({ text }: { text: string }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <View style={{ gap: 8 }}>
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n').filter(l => l !== '');

        // Detect block type from first line
        const isBullet   = lines.every(l => /^[-*]\s/.test(l));
        const isNumbered = lines.every(l => /^\d+\.\s/.test(l));
        const isHeader   = /^##\s/.test(lines[0]);

        if (isHeader) {
          return (
            <View key={pi} style={{ gap: 4 }}>
              <Text style={s.mdH2}>
                <InlineText text={lines[0].replace(/^#+\s/, '')} baseStyle={s.mdH2} />
              </Text>
              {lines.slice(1).map((l, li) => (
                <Text key={li} style={s.aiText}>
                  <InlineText text={l} baseStyle={s.aiText} />
                </Text>
              ))}
            </View>
          );
        }

        if (isBullet) {
          return (
            <View key={pi} style={{ gap: 3 }}>
              {lines.map((line, li) => (
                <View key={li} style={s.mdBulletRow}>
                  <View style={s.mdDot} />
                  <Text style={[s.aiText, { flex: 1 }]}>
                    <InlineText text={line.replace(/^[-*]\s+/, '')} baseStyle={s.aiText} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (isNumbered) {
          return (
            <View key={pi} style={{ gap: 6 }}>
              {lines.map((line, li) => {
                const num = line.match(/^(\d+)\.\s/)?.[1] ?? String(li + 1);
                return (
                  <View key={li} style={s.mdBulletRow}>
                    <Text style={s.mdNum}>{num}.</Text>
                    <Text style={[s.aiText, { flex: 1 }]}>
                      <InlineText text={line.replace(/^\d+\.\s+/, '')} baseStyle={s.aiText} />
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }

        // Mixed block (label lines + regular lines)
        return (
          <View key={pi} style={{ gap: 3 }}>
            {lines.map((line, li) => {
              if (/^[-*]\s/.test(line)) {
                return (
                  <View key={li} style={s.mdBulletRow}>
                    <View style={s.mdDot} />
                    <Text style={[s.aiText, { flex: 1 }]}>
                      <InlineText text={line.replace(/^[-*]\s+/, '')} baseStyle={s.aiText} />
                    </Text>
                  </View>
                );
              }
              if (/^\d+\.\s/.test(line)) {
                const num = line.match(/^(\d+)\.\s/)?.[1] ?? String(li + 1);
                return (
                  <View key={li} style={s.mdBulletRow}>
                    <Text style={s.mdNum}>{num}.</Text>
                    <Text style={[s.aiText, { flex: 1 }]}>
                      <InlineText text={line.replace(/^\d+\.\s+/, '')} baseStyle={s.aiText} />
                    </Text>
                  </View>
                );
              }
              return (
                <Text key={li} style={s.aiText}>
                  <InlineText text={line} baseStyle={s.aiText} />
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 160),
        Animated.timing(dot, { toValue: 1,   duration: 250, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0.3, duration: 250, useNativeDriver: true }),
        Animated.delay(500 - i * 160),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={s.aiRow}>
      <View style={s.aiAvatar}>
        <Ionicons name="sparkles" size={13} color="#fff" />
      </View>
      <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 10 }}>
        {dots.map((dot, i) => (
          <Animated.View key={i} style={[s.typingDot, { opacity: dot }]} />
        ))}
      </View>
    </View>
  );
}

export const AIChatScreen: React.FC = () => {
  const { bottom: bottomInset } = useSafeAreaInsets();
  // Floating pill tab bar: bottom = max(insets.bottom, 8) + 12, pill height ≈ 62px, + 16px margin
  const tabClearance = Math.max(bottomInset, 8) + 12 + 62 + 16;

  const language = useLanguageStore(s => s.language);
  const tr = useTranslation();

  const HISTORY_GROUPS = [
    { group: tr.aiToday,    items: HISTORY_ITEMS.today },
    { group: tr.aiYesterday,items: HISTORY_ITEMS.yesterday },
    { group: tr.aiLastWeek, items: HISTORY_ITEMS.lastWeek },
  ];

  // Suggestion chips in the current language — the label doubles as the message
  // sent to the AI, which now replies in the user's language.
  const SUGGESTIONS = SUGGESTION_META.map(({ key, icon }) => ({ label: tr[key], icon }));

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Track keyboard so we can collapse the tab-bar clearance when typing
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const inputPaddingBottom = keyboardOpen ? 10 : tabClearance;

  const drawerX   = useRef(new Animated.Value(-300)).current;
  const backdropO = useRef(new Animated.Value(0)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerX,   { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropO, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerX,   { toValue: -300, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropO, { toValue: 0,    duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: `u_${Date.now()}`, role: 'user', text: trimmed, time: nowTime() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    scrollToBottom();

    // Build history for context (last 6 messages)
    const history = messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));

    try {
      const res   = await apiAI.chat(trimmed, history, language);
      const reply = res.data.reply;
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'ai', text: reply, time: nowTime() }]);
    } catch {
      // Fallback to local keyword match if API fails
      const fallback = matchResponse(trimmed);
      setMessages(prev => [...prev, { id: `a_${Date.now()}`, role: 'ai', text: fallback, time: nowTime() }]);
    } finally {
      setIsTyping(false);
      scrollToBottom();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setInput('');
    setIsTyping(false);
    closeDrawer();
  };

  const isEmpty = messages.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={s.root}>

        {/* ── Header ─────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerIconBtn} onPress={openDrawer} activeOpacity={0.7}>
            <Ionicons name="menu-outline" size={24} color="#374151" />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <View style={s.headerDot} />
            <Text style={s.headerModel}>GeoRice AI</Text>
          </View>

          <TouchableOpacity style={s.headerIconBtn} onPress={startNewChat} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* ── Chat area ──────────────────────────────────────── */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? tabClearance : 0}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={[s.messageContent, isEmpty && s.messageContentEmpty]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Empty / welcome state */}
            {isEmpty && (
              <View style={s.emptyWrap}>
                <View style={s.emptyAvatar}>
                  <Ionicons name="sparkles" size={26} color="#fff" />
                </View>
                <Text style={s.emptyTitle}>{tr.aiHeaderTitle}</Text>
                <Text style={s.emptyDesc}>
                  {tr.aiAskAnything}
                </Text>

                <View style={s.suggestionsBlock}>
                  {SUGGESTIONS.map(({ label, icon }) => (
                    <TouchableOpacity
                      key={label}
                      style={s.suggestionChip}
                      onPress={() => sendMessage(label)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={icon} size={15} color="#9CA3AF" />
                      <Text style={s.suggestionText}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Messages */}
            {messages.map(msg =>
              msg.role === 'user' ? (
                <View key={msg.id} style={s.userRow}>
                  <View style={s.userBubble}>
                    <Text style={s.userText}>{msg.text}</Text>
                  </View>
                  <Text style={s.userTime}>{msg.time}</Text>
                </View>
              ) : (
                <View key={msg.id} style={s.aiRow}>
                  <View style={s.aiAvatar}>
                    <Ionicons name="sparkles" size={13} color="#fff" />
                  </View>
                  <View style={s.aiContent}>
                    <MarkdownMessage text={msg.text} />
                    <Text style={s.aiTime}>{msg.time}</Text>
                  </View>
                </View>
              )
            )}

            {isTyping && <TypingDots />}
          </ScrollView>

          {/* ── Input bar ──────────────────────────────────────── */}
          <View style={[s.inputBar, { paddingBottom: inputPaddingBottom }]}>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder={tr.aiPlaceholder}
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={400}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(input)}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!input.trim() || isTyping) && s.sendBtnOff]}
                onPress={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-up" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── History drawer overlay ─────────────────────────── */}
      {drawerOpen && (
        <Animated.View
          style={[StyleSheet.absoluteFill, s.backdrop, { opacity: backdropO }]}
          pointerEvents="auto"
        >
          <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
        </Animated.View>
      )}

      <Animated.View style={[s.drawer, { transform: [{ translateX: drawerX }] }]}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Drawer header */}
          <View style={s.drawerHeader}>
            <Text style={s.drawerTitle}>{tr.aiHistory}</Text>
            <TouchableOpacity style={s.drawerCloseBtn} onPress={closeDrawer} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* New chat button */}
          <TouchableOpacity style={s.newChatBtn} onPress={startNewChat} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={s.newChatText}>{tr.aiNewChat}</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {HISTORY_GROUPS.map(({ group, items }) => (
              <View key={group} style={s.historyGroup}>
                <Text style={s.historyGroupLabel}>{group}</Text>
                {items.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.historyItem}
                    onPress={closeDrawer}
                    activeOpacity={0.65}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.historyItemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={s.historyItemPreview} numberOfLines={1}>{item.preview}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerIconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerCenter:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#059669' },
  headerModel:   { fontSize: 15, fontWeight: '600', color: '#111827' },

  /* Chat */
  messageContent:      { padding: 16, gap: 20, paddingBottom: 12 },
  messageContentEmpty: { flexGrow: 1 },

  /* Empty state */
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 48, paddingHorizontal: 4,
  },
  emptyAvatar: {
    width: 56, height: 56, borderRadius: 9999,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  /* Suggestions — compact ghost rows, no tinted icon boxes */
  suggestionsBlock: { width: '100%', gap: 4 },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  suggestionText: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500' },

  /* AI row */
  aiRow:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 9999, flexShrink: 0,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  aiContent: { flex: 1, paddingTop: 2 },
  aiText:    { fontSize: 13, color: '#374151', lineHeight: 20 },
  aiTime:    { fontSize: 11, color: '#9CA3AF', marginTop: 8 },
  typingDot: { width: 7, height: 7, borderRadius: 9999, backgroundColor: '#9CA3AF' },

  /* Markdown renderer */
  mdH2:       { fontSize: 13, fontWeight: '700', color: '#111827' },
  mdBold:     { fontWeight: '600', color: '#111827' },
  mdCode:     { fontFamily: 'monospace', fontSize: 11, backgroundColor: '#F3F4F6', color: '#374151', paddingHorizontal: 3, borderRadius: 3 },
  mdBulletRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mdDot:      { width: 4, height: 4, borderRadius: 9999, backgroundColor: '#6B7280', marginTop: 7, flexShrink: 0 },
  mdNum:      { fontSize: 13, fontWeight: '500', color: '#6B7280', minWidth: 18, flexShrink: 0 },

  /* User row */
  userRow:   { alignItems: 'flex-end' },
  userBubble: {
    maxWidth: '78%',
    backgroundColor: '#F3F4F6',
    borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  userText: { fontSize: 15, color: '#111827', lineHeight: 23 },
  userTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  /* Input bar */
  inputBar: {
    paddingHorizontal: 14, paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: '#F9FAFB', borderRadius: 22,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingLeft: 16, paddingRight: 6, paddingVertical: 6,
    minHeight: 48,
  },
  input: {
    flex: 1, fontSize: 15, color: '#111827',
    maxHeight: 120, paddingTop: 6, paddingBottom: 6,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 9999,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  sendBtnOff: { backgroundColor: '#D1D5DB' },

  /* Drawer backdrop */
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 20,
  },

  /* Drawer */
  drawer: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 280, backgroundColor: '#FFFFFF',
    borderRightWidth: 1, borderRightColor: '#E5E7EB',
    zIndex: 30,
  },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  drawerTitle:    { fontSize: 16, fontWeight: '700', color: '#111827' },
  drawerCloseBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },

  newChatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
    margin: 14,
  },
  newChatText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  /* History list — sentence-case heading, no decorative icon boxes */
  historyGroup:      { paddingHorizontal: 14, marginBottom: 4 },
  historyGroupLabel: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 4, marginTop: 12 },
  historyItem: {
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
  },
  historyItemTitle:   { fontSize: 13, fontWeight: '600', color: '#111827' },
  historyItemPreview: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
