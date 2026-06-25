import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAppStore, type AppNotification } from '@/store/appStore';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CATEGORY_ICON: Record<string, IoniconsName> = {
  planting:        'leaf-outline',
  fertilizer:      'flask-outline',
  pest_prevention: 'shield-checkmark-outline',
  irrigation:      'water-outline',
  harvesting:      'basket-outline',
};

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Ngayon lang';
  if (m < 60) return `${m} minuto na`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} oras na`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Kahapon';
  if (d < 7)   return `${d} araw na`;
  return new Date(ms).toLocaleDateString();
}

interface NotificationBellProps {
  color?: string;
  size?:  number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ color = '#059669', size = 22 }) => {
  const navigation               = useNavigation<any>();
  const notifications            = useAppStore(s => s.notifications);
  const markNotificationRead     = useAppStore(s => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore(s => s.markAllNotificationsRead);
  const setPendingGuideCategory  = useAppStore(s => s.setPendingGuideCategory);
  const [open, setOpen]          = useState(false);

  const unread = notifications.filter(n => !n.read).length;

  const onTapNotification = (n: AppNotification) => {
    markNotificationRead(n.id);
    if (n.category) {
      setPendingGuideCategory(n.category);
      try { navigation.navigate('PlantingTab'); } catch { /* navigator may not have this route */ }
    }
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity style={s.btn} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Ionicons name="notifications-outline" size={size} color={color} />
        {unread > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.panel} onPress={e => e.stopPropagation()}>

            <View style={s.header}>
              <Text style={s.headerTitle}>Mga Notipikasyon</Text>
              {notifications.length > 0 && unread > 0 && (
                <TouchableOpacity onPress={markAllNotificationsRead} activeOpacity={0.7}>
                  <Text style={s.headerAction}>Markahan lahat</Text>
                </TouchableOpacity>
              )}
            </View>

            {notifications.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="notifications-off-outline" size={32} color="#D1D5DB" />
                <Text style={s.emptyText}>Walang notipikasyon</Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={n => n.id}
                contentContainerStyle={{ paddingVertical: 6 }}
                renderItem={({ item }) => {
                  const icon = (item.icon as IoniconsName)
                    || (item.category ? CATEGORY_ICON[item.category] : undefined)
                    || 'notifications-outline';
                  return (
                    <TouchableOpacity
                      style={[s.item, !item.read && s.itemUnread]}
                      onPress={() => onTapNotification(item)}
                      activeOpacity={0.75}
                    >
                      <View style={s.itemIcon}>
                        <Ionicons name={icon} size={16} color="#059669" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={s.itemBody} numberOfLines={2}>{item.body}</Text>
                        <Text style={s.itemTime}>{relTime(item.createdAt)}</Text>
                      </View>
                      {!item.read && <View style={s.unreadDot} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  btn:  { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute', top: 4, right: 4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#FFFFFF',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', paddingTop: 70, paddingHorizontal: 16 },
  panel: {
    backgroundColor: '#FFFFFF', borderRadius: 18,
    maxHeight: '75%', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 10,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  headerTitle:  { fontSize: 15, fontWeight: '800', color: '#111827' },
  headerAction: { fontSize: 12, fontWeight: '700', color: '#059669' },

  empty:     { paddingVertical: 32, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  itemUnread: { backgroundColor: '#F0FDF4' },
  itemIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center',
  },
  itemTitle: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  itemBody:  { fontSize: 12, color: '#4B5563', lineHeight: 16, marginBottom: 4 },
  itemTime:  { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669', marginTop: 6 },
});
