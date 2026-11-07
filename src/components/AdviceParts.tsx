import React from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import type { AdviceLine, AdviceSource } from '@/services/apiService';

/** "PalayCheck p. 51": the booklet's short name and the page. */
export function sourceLabel(src: AdviceSource): string {
  const short = src.title.split(' (')[0]
    .replace('PalayCheck System for Irrigated Lowland Rice', 'PalayCheck')
    .replace('PalayCheck Key Check 7: Pest Management', 'Key Check 7')
    .replace('Harmful Organisms in Philippine Rice Fields', 'Harmful Organisms')
    .replace('Diseases of Rice and Their Management', 'Rice Diseases')
    .replace('Golden Apple Snail Management', 'Snail Management')
    .replace('Pamamahala ng Sheath Blight at Rice Blast', 'Blast & Sheath Blight')
    .replace('Pamamahala ng Armyworm at Planthopper', 'Planthopper');
  return `${short} ${src.pages}`;
}

/** Tappable chips naming where a piece of advice comes from. */
export const SourceChips: React.FC<{ sources: AdviceSource[]; dark?: boolean }> = ({ sources, dark }) => {
  const tr = useTranslation();
  if (!sources.length) return null;
  const open = (src: AdviceSource) =>
    Alert.alert(src.title, `${src.publisher} · ${src.pages}`, [
      { text: tr.probClose, style: 'cancel' },
      { text: tr.probSourceOpen, onPress: () => Linking.openURL(src.url).catch(() => {}) },
    ]);
  return (
    <View style={s.chips}>
      {sources.map((src, i) => (
        <TouchableOpacity key={`${src.title}-${i}`} style={[s.chip, dark && s.chipDark]} onPress={() => open(src)}
          activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`${src.title}, ${src.pages}`}>
          <Ionicons name="book-outline" size={12} color={dark ? '#D1FAE5' : LOOK.green} />
          <Text style={[s.chipText, dark && s.chipTextDark]} numberOfLines={1}>{sourceLabel(src)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

/** One line of booklet advice with its sources, after a bullet, a check or a cross. */
export const AdviceRow: React.FC<{ line: AdviceLine; mark?: 'dot' | 'do' | 'dont' }> = ({ line, mark = 'dot' }) => (
  <View style={s.row}>
    {mark === 'dot'
      ? <View style={s.dot} />
      : <Ionicons name={mark === 'do' ? 'checkmark-circle' : 'close-circle'} size={18}
          color={mark === 'do' ? LOOK.green : '#DC2626'} style={s.mark} />}
    <View style={{ flex: 1 }}>
      <Text style={s.text}>{line.text}</Text>
      <SourceChips sources={line.sources} />
    </View>
  </View>
);

const s = StyleSheet.create({
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4,
                  borderRadius: 10, backgroundColor: '#ECFDF5', maxWidth: '100%' },
  chipDark:     { backgroundColor: 'rgba(255,255,255,0.12)' },
  chipText:     { fontSize: 11.5, fontWeight: '600', color: '#047857', flexShrink: 1 },
  chipTextDark: { color: '#D1FAE5' },
  row:          { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: LOOK.ink, marginTop: 8 },
  mark:         { marginTop: 1 },
  text:         { fontSize: 14.5, lineHeight: 21, color: LOOK.ink },
});
