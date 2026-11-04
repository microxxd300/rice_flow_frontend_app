import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Pressable, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAppStore, type AppNotification } from '@/store/appStore';
import { useTranslation } from '@/i18n/useTranslation';
import { noticeMessage } from '@/utils/farmerNotices';
import { relTime } from '@/utils/relativeTime';
import { notificationGroup, notificationsFor, unreadByTab, type NotificationTab } from '@/utils/notificationGroups';
import { empty } from '@/assets/illustrations';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICON: Record<string, IoniconsName> = {
  planting:        'leaf-outline',
  fertilizer:      'flask-outline',
  pest_prevention: 'shield-checkmark-outline',
  irrigation:      'rainy-outline',
  harvesting:      'basket-outline',
};

// The icon tile's colours: the Planting Guide's palette, so a notice reads as its kind
const CATEGORY_COLOR: Record<string, { fg: string; bg: string }> = {
  planting:        { fg: '#059669', bg: '#E8F5EF' },
  fertilizer:      { fg: '#B45309', bg: '#FEF3DC' },
  pest_prevention: { fg: '#DC2626', bg: '#FDECEC' },
  irrigation:      { fg: '#2563EB', bg: '#EAF1FD' },
  harvesting:      { fg: '#B45309', bg: '#FDF3E1' },
};
const FARM_COLOR  = { fg: '#059669', bg: '#E8F5EF' };
const ADMIN_COLOR = { fg: '#111827', bg: '#F1F2F1' };

interface NotificationBellProps {
  color?: string;
  size?:  number;
}

/**
 * The bell and its notifications, as a bottom sheet: tabs with unread counts (All, Farm,
 * Admin), one card per notification (icon tile, title, text, time, unread dot, dismiss),
 * and "Mark all as read". Tapping a guide or weather notice opens the Planting Guide.
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({ color = '#111827', size = 22 }) => {
  const navigation               = useNavigation<any>();
  const tr                       = useTranslation();
  const { bottom }               = useSafeAreaInsets();
  const notifications            = useAppStore(st => st.notifications);
  const markNotificationRead     = useAppStore(st => st.markNotificationRead);
  const markAllNotificationsRead = useAppStore(st => st.markAllNotificationsRead);
  const removeNotification       = useAppStore(st => st.removeNotification);
  const [open, setOpen]          = useState(false);
  const [tab,  setTab]           = useState<NotificationTab>('all');

  const unread = unreadByTab(notifications);
  const shown  = notificationsFor(notifications, tab);
  const TABS: { id: NotificationTab; label: string }[] = [
    { id: 'all',   label: tr.notifTabAll },
    { id: 'farm',  label: tr.notifTabFarm },
    { id: 'admin', label: tr.notifTabAdmin },
  ];

  const onTap = (n: AppNotification) => {
    markNotificationRead(n.id);
    if (n.category) {
      setOpen(false);
      try { navigation.navigateDeprecated('PlantingTab'); } catch { /* navigator may not have this route */ }
    }
  };

  return (
    <>
      <TouchableOpacity style={s.btn} onPress={() => setOpen(true)} activeOpacity={0.7} accessibilityLabel={tr.notifTitle}>
        <Ionicons name="notifications-outline" size={size} color={color} />
        {unread.all > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{unread.all > 9 ? '9+' : unread.all}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: Math.max(bottom, 12) + 8 }]} onPress={e => e.stopPropagation()}>
            <View style={s.handle} />

            <View style={s.header}>
              <Text style={s.title}>{tr.notifTitle}</Text>
              <TouchableOpacity style={s.close} onPress={() => setOpen(false)} activeOpacity={0.7} accessibilityLabel={tr.notifClose}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Tabs with how many are unread in each */}
            <View style={s.tabs}>
              {TABS.map(t => {
                const on = tab === t.id;
                const count = unread[t.id];
                return (
                  <TouchableOpacity key={t.id} style={[s.tab, on && s.tabOn]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
                    <Text style={[s.tabText, on && s.tabTextOn]} numberOfLines={1}>{t.label}</Text>
                    {count > 0 && (
                      <View style={[s.tabCount, on && s.tabCountOn]}>
                        <Text style={[s.tabCountText, on && s.tabCountTextOn]}>{count > 9 ? '9+' : count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {shown.length === 0 ? (
              <View style={s.empty}>
                <Image source={empty.no_logs} style={{ width: 120, height: 120 }} resizeMode="contain" />
                <Text style={s.emptyText}>{tr.notifEmpty}</Text>
              </View>
            ) : (
              <FlatList
                data={shown}
                keyExtractor={n => n.id}
                style={{ flexGrow: 0 }}
                contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const admin = notificationGroup(item) === 'admin';
                  const icon = (item.icon as IoniconsName)
                    || (item.category ? CATEGORY_ICON[item.category] : undefined)
                    || 'notifications-outline';
                  const tone = admin ? ADMIN_COLOR : (item.category && CATEGORY_COLOR[item.category]) || FARM_COLOR;
                  const text = item.notice ? noticeMessage({ ...item.notice, title: item.title, body: item.body }, tr) : item;
                  return (
                    <TouchableOpacity style={[s.card, !item.read && s.cardUnread]} onPress={() => onTap(item)} activeOpacity={0.8}>
                      <View style={[s.iconTile, { backgroundColor: tone.bg }]}>
                        <Ionicons name={icon} size={19} color={tone.fg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={s.cardTop}>
                          {!item.read && <View style={s.dot} />}
                          <Text style={[s.cardTitle, !item.read && s.cardTitleUnread]} numberOfLines={2}>{text.title}</Text>
                        </View>
                        {!!text.body && <Text style={s.cardBody} numberOfLines={3}>{text.body}</Text>}
                        <View style={s.metaRow}>
                          <Text style={s.cardTime}>{relTime(item.createdAt, tr)}</Text>
                          <View style={s.kind}>
                            <Text style={s.kindText}>{admin ? tr.notifTabAdmin : tr.notifTabFarm}</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeNotification(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.6}
                        accessibilityLabel={tr.notifDismiss}
                      >
                        <Ionicons name="close" size={17} color="#9CA3AF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View style={s.footer}>
              <TouchableOpacity onPress={markAllNotificationsRead} disabled={unread.all === 0} activeOpacity={0.7}>
                <Text style={[s.markAll, unread.all === 0 && { color: '#9CA3AF', textDecorationLine: 'none' }]}>{tr.notifMarkAll}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.doneBtn} onPress={() => setOpen(false)} activeOpacity={0.85}>
                <Text style={s.doneText}>{tr.notifClose}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const INK  = '#111827';
const PAGE = '#F1F2F1';

const s = StyleSheet.create({
  btn:   { width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute', top: 4, right: 4, minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_700Bold' },

  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'flex-end' },
  sheet:    { backgroundColor: PAGE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 10, maxHeight: '85%' },
  handle:   { width: 44, height: 5, borderRadius: 3, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 10 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 12 },
  title:  { fontSize: 21, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  close:  { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },

  tabs:           { flexDirection: 'row', backgroundColor: '#E4E6E4', borderRadius: 16, padding: 4, marginBottom: 12 },
  tab:            { flex: 1, height: 40, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabOn:          { backgroundColor: '#FFFFFF' },
  tabText:        { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  tabTextOn:      { color: INK, fontFamily: 'Inter_700Bold' },
  tabCount:       { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  tabCountOn:     { backgroundColor: INK },
  tabCountText:   { fontSize: 11, color: INK, fontFamily: 'Inter_700Bold' },
  tabCountTextOn: { color: '#FFFFFF' },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 20, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  cardUnread:      { borderWidth: 1.5, borderColor: '#A7E3C9' },
  iconTile:        { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardTop:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  cardTitle:       { flex: 1, fontSize: 14, color: '#374151', fontFamily: 'Inter_600SemiBold' },
  cardTitleUnread: { color: INK, fontFamily: 'Inter_700Bold' },
  cardBody:        { fontSize: 13, color: '#4B5563', lineHeight: 18, marginTop: 3 },
  metaRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  cardTime:        { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  kind:            { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: PAGE },
  kindText:        { fontSize: 11, color: '#374151', fontFamily: 'Inter_600SemiBold' },

  empty:     { alignItems: 'center', paddingVertical: 28, gap: 6 },
  emptyText: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_500Medium' },

  footer:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, paddingHorizontal: 4 },
  markAll:  { fontSize: 14, color: INK, fontFamily: 'Inter_700Bold', textDecorationLine: 'underline' },
  doneBtn:  { height: 46, paddingHorizontal: 22, borderRadius: 16, backgroundColor: INK, justifyContent: 'center' },
  doneText: { fontSize: 14, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});
