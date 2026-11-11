import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image,
  TouchableOpacity, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Animated, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { empty } from '@/assets/illustrations';
import { apiAI, type AdviceSource } from '@/services/apiService';
import { SourceChips } from '@/components/AdviceParts';
import { useLanguageStore } from '@/store/languageStore';
import { useAppStore } from '@/store/appStore';
import { useTranslation } from '@/i18n/useTranslation';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/constants/api';
import { addToChat, newChatId, readChats, saveChat, type SavedChat } from '@/utils/chatHistory';
import { relTime } from '@/utils/relativeTime';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
  sources?: AdviceSource[];   // the booklet pages the answer came from
  general?: boolean;          // the server answered without the booklets
}

// Icon + translation key per suggestion; labels resolved from `tr` at render.
const SUGGESTION_META: { key: 'aiSuggFertilizer' | 'aiSuggHarvest' | 'aiSuggPest' | 'aiSuggWater' | 'aiSuggRain'; icon: IoniconsName }[] = [
  { key: 'aiSuggFertilizer', icon: 'flask-outline' },
  { key: 'aiSuggHarvest',    icon: 'calendar-outline' },
  { key: 'aiSuggPest',       icon: 'bug-outline' },
  { key: 'aiSuggWater',      icon: 'water-outline' },
  { key: 'aiSuggRain',       icon: 'rainy-outline' },
];

// Ids for questions (u) and answers (a)
const newId = (kind: 'u' | 'a') => `${kind}_${Date.now()}`;

function nowTime() {
  const d = new Date();
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
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
        <Ionicons name="sparkles" size={14} color="#34D399" />
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
  // Floating tab bar: bottom = max(insets.bottom, 8) + 10, bar 72 px tall, + 12 px gap
  const tabClearance = Math.max(bottomInset, 8) + 10 + 72 + 12;

  const language = useLanguageStore(s => s.language);
  const selectedFarmId = useAppStore(s => s.selectedFarmId);
  const tr = useTranslation();

  // Suggestion chips in the current language — the label doubles as the message
  // sent to the AI, which now replies in the user's language.
  const SUGGESTIONS = SUGGESTION_META.map(({ key, icon }) => ({ label: tr[key], icon }));

  // The chat on screen lives in the app store, so it is still here after the farmer
  // visits another tab; a new chat only starts when they tap New chat (or reopen the app)
  const chatId    = useAppStore(s => s.aiChat.id);
  const messages  = useAppStore(s => s.aiChat.messages) as Message[];
  const savedList = useAppStore(s => s.aiChats);
  const chats     = savedList ?? [];
  const isTyping  = useAppStore(s => s.aiWaiting) === chatId;
  const [input, setInput] = useState('');
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  // Saved chats are kept on this phone, so the farmer can open an earlier one again
  const putChats = (next: SavedChat[]) => {
    if (next === useAppStore.getState().aiChats) return;
    useAppStore.getState().setAiChats(next);
    storage.setItem(STORAGE_KEYS.AI_CHATS, next).catch(() => {});
  };
  useEffect(() => {
    if (useAppStore.getState().aiChats !== null) return;
    storage.getItem<unknown>(STORAGE_KEYS.AI_CHATS).then(stored => {
      if (useAppStore.getState().aiChats === null) useAppStore.getState().setAiChats(readChats(stored));
    });
  }, []);
  // Every question and answer is saved as it arrives
  useEffect(() => {
    if (savedList) putChats(saveChat(savedList, chatId, messages));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- save when the chat changes, not when the list does
  }, [messages, chatId, savedList === null]);
  // Back on this tab: show the end of the chat
  useEffect(() => {
    if (messages.length) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the screen opens
  }, []);

  // The tab bar hides while typing, so its clearance collapses then
  const keyboardOpen = useKeyboardOpen();
  // Just above the tab bar (2 px, not 12): the box sat too high
  const inputPaddingBottom = keyboardOpen ? 10 : tabClearance - 10;

  const drawerX   = useRef(new Animated.Value(-300)).current;
  const backdropO = useRef(new Animated.Value(0)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The bottom menu hides while History is open, so it does not cover the list
  useEffect(() => () => useAppStore.getState().setHideTabBar(false), []);
  const openDrawer = () => {
    setDrawerOpen(true);
    useAppStore.getState().setHideTabBar(true);
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
    useAppStore.getState().setHideTabBar(false);
  };

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: Message = { id: newId('u'), role: 'user', text: trimmed, time: nowTime() };
    const store = useAppStore.getState();
    const askedIn = store.aiChat.id;
    store.setAiChat({ id: askedIn, messages: [...store.aiChat.messages, userMsg] });
    store.setAiWaiting(askedIn);
    setInput('');
    scrollToBottom();
    // The farmer may open another chat, or another tab, while waiting: the answer goes to
    // the chat that asked, even when this screen is closed
    const deliver = (msg: Message) => {
      const st = useAppStore.getState();
      if (st.aiChat.id === askedIn) st.setAiChat({ id: askedIn, messages: [...st.aiChat.messages, msg] });
      else putChats(addToChat(st.aiChats ?? [], askedIn, msg));
    };

    // Build history for context (last 6 messages)
    const history = messages.slice(-6).map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.text }));

    try {
      const res   = await apiAI.chat(trimmed, history, language, selectedFarmId);
      const reply = res.data.reply;
      const sources = res.data.sources ?? [];
      deliver({ id: newId('a'), role: 'ai', text: reply, time: nowTime(), sources,
                general: res.data.grounded === false && sources.length === 0 });
    } catch (err: any) {
      // Say so, never a canned answer: it would read as AI advice for a question nobody answered
      const text = err?.response?.status === 429 ? tr.aiDailyLimit : tr.aiUnavailable;
      deliver({ id: newId('a'), role: 'ai', text, time: nowTime() });
    } finally {
      const st = useAppStore.getState();
      if (st.aiWaiting === askedIn) st.setAiWaiting(null);
      if (st.aiChat.id === askedIn) scrollToBottom();
    }
  };

  // The chat on screen is already saved, so it stays in History
  const startNewChat = () => {
    useAppStore.getState().setAiChat({ id: newChatId(), messages: [] });
    setInput('');
    closeDrawer();
  };

  const openChat = (chat: SavedChat) => {
    useAppStore.getState().setAiChat({ id: chat.id, messages: chat.messages });
    setInput('');
    closeDrawer();
    scrollToBottom();
  };

  const isEmpty = messages.length === 0;

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={s.root}>

        {/* ── Header ─────────────────────────────────────────── */}
        <View style={s.header}>
          <TouchableOpacity style={s.headerIconBtn} onPress={openDrawer} activeOpacity={0.7}>
            <Ionicons name="menu" size={22} color="#111827" />
          </TouchableOpacity>

          <View style={s.headerCenter}>
            <View style={s.headerDot} />
            <Text style={s.headerModel}>GeoRice AI</Text>
          </View>

          <TouchableOpacity style={s.headerIconBtn} onPress={startNewChat} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={21} color="#111827" />
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
                <Image source={empty.ai_chat} style={{ width: 150, height: 150, marginBottom: 8 }} resizeMode="contain" />
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
                      <View style={s.suggestionIcon}><Ionicons name={icon} size={14} color="#059669" /></View>
                      <Text style={s.suggestionText}>{label}</Text>
                      <Ionicons name="arrow-forward" size={13} color="#9CA3AF" style={{ transform: [{ rotate: '-45deg' }] }} />
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
                    <Ionicons name="sparkles" size={14} color="#34D399" />
                  </View>
                  <View style={[s.aiContent, s.aiBubble]}>
                    <MarkdownMessage text={msg.text} />
                    {!!msg.sources?.length && <SourceChips sources={msg.sources} />}
                    {msg.general && (
                      <View style={s.generalNote}>
                        <Ionicons name="information-circle-outline" size={13} color="#6B7280" />
                        <Text style={s.generalNoteText}>{tr.aiGeneralAnswer}</Text>
                      </View>
                    )}
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
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          {/* New chat button */}
          <TouchableOpacity style={s.newChatBtn} onPress={startNewChat} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={s.newChatText}>{tr.aiNewChat}</Text>
          </TouchableOpacity>

          {/* Saved chats, newest first; tap one to open it again */}
          {chats.length === 0 ? (
            <View style={s.historyEmpty}>
              <View style={s.historyEmptyIcon}><Ionicons name="chatbubbles-outline" size={22} color="#111827" /></View>
              <Text style={s.historyItemPreview}>{tr.aiNoHistory}</Text>
            </View>
          ) : (
            <ScrollView
              style={s.historyList}
              contentContainerStyle={s.historyListContent}
              showsVerticalScrollIndicator={false}
            >
              {chats.map(chat => (
                <TouchableOpacity
                  key={chat.id}
                  style={[s.historyItem, chat.id === chatId && s.historyItemOn]}
                  onPress={() => openChat(chat)}
                  activeOpacity={0.7}
                >
                  <Text style={s.historyItemTitle} numberOfLines={1}>{chat.title}</Text>
                  <Text style={s.historyItemTime}>{relTime(chat.updatedAt, tr)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F2F1' },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  headerIconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  headerCenter:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerDot:     { width: 7, height: 7, borderRadius: 4, backgroundColor: '#059669' },
  headerModel: { fontSize: 16, color: '#111827', fontFamily: 'Inter_700Bold' },

  /* Chat */
  messageContent: { padding: 16, gap: 18, paddingBottom: 12 },
  messageContentEmpty: { flexGrow: 1 },

  /* Empty state */
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 24, paddingHorizontal: 2 },
  emptyTitle: { fontSize: 24, color: '#111827', marginBottom: 8, letterSpacing: -0.4, textAlign: 'center', fontFamily: 'Inter_700Bold' },
  emptyDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 24, paddingHorizontal: 12, fontFamily: 'Inter_500Medium' },

  /* Suggestions — compact ghost rows, no tinted icon boxes */
  suggestionsBlock: { width: '100%', gap: 6 },
  suggestionChip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  suggestionText: { flex: 1, fontSize: 12.5, color: '#111827', lineHeight: 16, fontFamily: 'Inter_500Medium' },

  /* AI row */
  aiRow:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, flexShrink: 0, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  aiContent: { flex: 1, paddingTop: 2 },
  aiText: { fontSize: 14, color: '#1F2937', lineHeight: 21 },
  aiTime: { fontSize: 11, color: '#9CA3AF', marginTop: 8 },
  generalNote:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  generalNoteText: { flex: 1, fontSize: 11.5, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  typingDot: { width: 7, height: 7, borderRadius: 9999, backgroundColor: '#9CA3AF' },

  aiBubble:  { backgroundColor: '#FFFFFF', borderRadius: 20, borderTopLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  suggestionIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#E8F5EF', justifyContent: 'center', alignItems: 'center' },

  /* Markdown renderer */
  mdH2: { fontSize: 14, color: '#111827', fontFamily: 'Inter_700Bold' },
  mdBold:     { fontWeight: '600', color: '#111827' },
  mdCode:     { fontFamily: 'monospace', fontSize: 11, backgroundColor: '#F3F4F6', color: '#374151', paddingHorizontal: 3, borderRadius: 3 },
  mdBulletRow:{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  mdDot:      { width: 4, height: 4, borderRadius: 9999, backgroundColor: '#6B7280', marginTop: 7, flexShrink: 0 },
  mdNum: { fontSize: 14, color: '#6B7280', minWidth: 18, flexShrink: 0, fontFamily: 'Inter_600SemiBold' },

  /* User row */
  userRow:   { alignItems: 'flex-end' },
  userBubble: { maxWidth: '80%', backgroundColor: '#111827', borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 16, paddingVertical: 12 },
  userText: { fontSize: 15, color: '#FFFFFF', lineHeight: 22 },
  userTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  /* Input bar */
  inputBar: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: 'transparent' },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 26, paddingLeft: 18, paddingRight: 6, paddingVertical: 6, minHeight: 54, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  input: { flex: 1, fontSize: 15, color: '#111827', maxHeight: 120, paddingTop: 9, paddingBottom: 9, fontFamily: 'Inter_500Medium' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sendBtnOff: { backgroundColor: '#D1D5DB' },

  /* Drawer backdrop */
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 20,
  },

  /* Drawer */
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 290, backgroundColor: '#FFFFFF', borderTopRightRadius: 28, borderBottomRightRadius: 28, zIndex: 30, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14 },
  drawerTitle: { fontSize: 20, color: '#111827', fontFamily: 'Inter_700Bold' },
  drawerCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F2F1', justifyContent: 'center', alignItems: 'center' },

  newChatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#111827', borderRadius: 18, height: 52, marginHorizontal: 16, marginTop: 4 },
  newChatText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },

  /* No saved chats yet */
  historyEmpty:     { alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: 28 },
  historyEmptyIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#F1F2F1', justifyContent: 'center', alignItems: 'center' },

  /* History list — sentence-case heading, no decorative icon boxes */
  historyList:        { flex: 1, marginTop: 12 },
  historyListContent: { paddingHorizontal: 12, paddingBottom: 24, gap: 2 },
  historyItem:        { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, gap: 3 },
  historyItemOn:      { backgroundColor: '#F1F2F1' },
  historyItemTitle:   { fontSize: 14.5, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  historyItemTime:    { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  historyItemPreview: { fontSize: 13, color: '#6B7280', lineHeight: 19, textAlign: 'center' },
});
