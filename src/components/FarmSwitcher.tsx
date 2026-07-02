import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from '@/store/appStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { loadFarmData } from '@/services/farmData';
import { useTranslation } from '@/i18n/useTranslation';

/**
 * Card-row to switch the app's current farm — styled to match the "My Farms"
 * list rows on Home (same icon box, name, meta line, chevron). Sits in its own
 * small card at the top of the dashboard so it reads as "you are viewing X".
 * Hidden when the user has fewer than 2 farms (nothing to switch between).
 * On select: updates the store, then reloads that farm's data.
 */
export const FarmSwitcher: React.FC = () => {
  const tr           = useTranslation();
  const farms        = useAppStore(s => s.farms);
  const selectFarm   = useAppStore(s => s.selectFarm);
  const selected     = useSelectedFarm();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  if (farms.length < 2 || !selected) return null;

  const location = [(selected as any).barangay, (selected as any).municipality]
    .filter(Boolean).join(', ') || '—';
  const area = (selected as any).area_hectares != null ? `${(selected as any).area_hectares} ha` : '—';

  const handlePick = async (farmId: number) => {
    if (farmId === selected.id) { setOpen(false); return; }
    const farm = farms.find(f => f.id === farmId);
    if (!farm) { setOpen(false); return; }

    selectFarm(farmId);          // updates store + clears stale per-farm data
    setOpen(false);
    setLoading(true);
    try { await loadFarmData(farm); } catch {}
    setLoading(false);
  };

  return (
    <>
      <View style={s.section}>
        <TouchableOpacity style={s.row} onPress={() => setOpen(true)} activeOpacity={0.75}>
          <View style={s.icon}>
            <Ionicons name="storefront-outline" size={16} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{(selected as any).name}</Text>
            <Text style={s.meta} numberOfLines={1}>{location} · {area}</Text>
          </View>
          {loading
            ? <ActivityIndicator size="small" color="#059669" />
            : <Ionicons name="chevron-expand" size={16} color="#D1D5DB" />}
        </TouchableOpacity>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>{tr.switchFarmTitle}</Text>

            {farms.map((f, i) => {
              const isActive = f.id === selected.id;
              const isLast   = i === farms.length - 1;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[s.sheetRow, !isLast && s.sheetRowBorder]}
                  onPress={() => handlePick(f.id)}
                  activeOpacity={0.75}
                >
                  <View style={[s.icon, isActive && s.iconActive]}>
                    <Ionicons name="storefront-outline" size={16} color={isActive ? '#FFFFFF' : '#059669'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{(f as any).name}</Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {[(f as any).barangay, (f as any).municipality].filter(Boolean).join(', ') || '—'}
                      {(f as any).area_hectares != null ? ` · ${(f as any).area_hectares} ha` : ''}
                    </Text>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color="#059669" />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, marginTop: 20 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 12, paddingHorizontal: 14,
  },
  icon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center',
  },
  iconActive: { backgroundColor: '#059669', borderColor: '#059669' },
  name: { fontSize: 13.5, fontWeight: '700', color: '#111827', marginBottom: 2 },
  meta: { fontSize: 11.5, color: '#9CA3AF' },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 14,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  sheetRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
});
