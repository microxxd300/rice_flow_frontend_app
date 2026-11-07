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

/** The problem flow's header: back, the step it is on (of 3), and the title. */
export const StepHeader: React.FC<{ step: 1 | 2 | 3; title: string; onBack: () => void }> = ({ step, title, onBack }) => {
  const tr = useTranslation();
  return (
    <View style={s.stepHead}>
      <TouchableOpacity style={s.back} onPress={onBack} accessibilityLabel="Back">
        <Ionicons name="chevron-back" size={24} color={LOOK.ink} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.stepOf}>{tr.probStep.replace('{n}', String(step))}</Text>
        <Text style={s.stepTitle} numberOfLines={1}>{title}</Text>
      </View>
      <View style={s.dots}>
        {[1, 2, 3].map(n => <View key={n} style={[s.stepDot, n <= step && s.stepDotOn]} />)}
      </View>
    </View>
  );
};

/** Marks text the AI wrote, the same way everywhere it appears. */
export const AiBadge: React.FC<{ dark?: boolean }> = ({ dark }) => {
  const tr = useTranslation();
  return (
    <View style={[s.aiBadge, dark && s.aiBadgeDark]}>
      <Ionicons name="sparkles" size={12} color={dark ? '#6EE7B7' : LOOK.green} />
      <Text style={[s.aiBadgeText, dark && s.aiBadgeTextDark]}>{tr.probAiBadge}</Text>
    </View>
  );
};

/** A card section the farmer can open and close. */
export const Fold: React.FC<{ title: string; children: React.ReactNode; first?: boolean }> = ({ title, children, first }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <View style={!first && s.fold}>
      <TouchableOpacity style={s.foldHead} onPress={() => setOpen(o => !o)} activeOpacity={0.7}
        accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <Text style={s.foldTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={LOOK.soft} />
      </TouchableOpacity>
      {open && <View style={{ paddingBottom: 8 }}>{children}</View>}
    </View>
  );
};

const s = StyleSheet.create({
  stepHead:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  back:         { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepOf:       { fontSize: 12, fontWeight: '700', color: LOOK.green, letterSpacing: 0.3 },
  stepTitle:    { fontSize: 20, fontWeight: '800', color: LOOK.ink },
  dots:         { flexDirection: 'row', gap: 5, paddingRight: 8 },
  stepDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D5DB' },
  stepDotOn:    { backgroundColor: LOOK.ink },
  aiBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8,
                  paddingVertical: 3, borderRadius: 10, backgroundColor: '#ECFDF5' },
  aiBadgeDark:  { backgroundColor: 'rgba(110,231,183,0.14)' },
  aiBadgeText:  { fontSize: 11.5, fontWeight: '800', color: '#047857' },
  aiBadgeTextDark: { color: '#6EE7B7' },
  fold:         { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  foldHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  foldTitle:    { fontSize: 15, fontWeight: '700', color: LOOK.ink },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
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
