import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '@/i18n/useTranslation';

interface VarietyDetailScreenProps {
  varietyName?: string;
  onUseThisVariety?: () => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export const VarietyDetailScreen: React.FC<VarietyDetailScreenProps> = ({
  varietyName = 'NSIC Rc160',
  onUseThisVariety,
}) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const tr = useTranslation();

  const METRICS: { label: string; value: string; icon: IoniconsName; color: string; bg: string }[] = [
    { label: tr.vdHarvestDays,   value: tr.vdDaysUnit,  icon: 'time-outline',        color: '#D97706', bg: '#FFF7ED' },
    { label: tr.vdExpectedYield, value: tr.valHigh,     icon: 'trending-up-outline', color: '#059669', bg: '#ECFDF5' },
    { label: tr.vdPlantHeight,   value: '95–105 cm',    icon: 'resize-outline',      color: '#2563EB', bg: '#EFF6FF' },
    { label: tr.vdGrainQuality,  value: tr.vdGrainPremium, icon: 'ribbon-outline',   color: '#F59E0B', bg: '#FFFBEB' },
  ];

  const STRESS_BARS = [
    { label: tr.vdTolFlood,     pct: 90, color: '#2563EB' },
    { label: tr.vdTolDrySeason, pct: 65, color: '#D97706' },
    { label: tr.vdTolDisease,   pct: 75, color: '#059669' },
    { label: tr.vdTolInsect,    pct: 70, color: '#059669' },
  ];

  const REQS: { icon: IoniconsName; color: string; bg: string; label: string; value: string }[] = [
    { icon: 'leaf-outline',     color: '#059669', bg: '#ECFDF5', label: tr.vdDetailSoil,       value: 'Loamy · pH 6.5–7.5' },
    { icon: 'water-outline',    color: '#2563EB', bg: '#EFF6FF', label: tr.vdDetailWater,      value: '5 cm · 7–10 d flood' },
    { icon: 'flask-outline',    color: '#7C3AED', bg: '#F5F3FF', label: tr.vdDetailFertilizer, value: '3 application stages' },
    { icon: 'location-outline', color: '#EF4444', bg: '#FEF2F2', label: tr.vdDetailLocation,   value: tr.vdLocationFlat },
    { icon: 'layers-outline',   color: '#D97706', bg: '#FFF7ED', label: tr.vdDetailSoilType,   value: 'Loamy' },
    { icon: 'rainy-outline',    color: '#2563EB', bg: '#EFF6FF', label: tr.vdDetailRain,       value: '2500 mm · High Flood' },
  ];

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{varietyName}</Text>
          <Text style={s.headerSub}>{tr.vdSubtitle}</Text>
        </View>
        <View style={s.certBadge}>
          <Ionicons name="shield-checkmark" size={12} color="#059669" />
          <Text style={s.certBadgeText}>{tr.vdCertified}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Card 1: Hero ── */}
        <View style={[s.card, { marginTop: 20 }]}>
          {/* Score row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.scoreValue}>94%</Text>
              <Text style={s.scoreLabel}>{tr.vdSuitability}</Text>
            </View>
            <View style={s.scoreDivider} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[s.scoreValue, { color: '#D97706' }]}>4.8</Text>
              <Text style={s.scoreLabel}>RSI Score</Text>
            </View>
            <View style={s.scoreDivider} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[s.scoreValue, { color: '#2563EB' }]}>115d</Text>
              <Text style={s.scoreLabel}>{tr.vdHarvestShort}</Text>
            </View>
          </View>

          {/* Tags + one-liner */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {[tr.vdTagHighYield, tr.traitFloodSafe, tr.vdTagRecommended].map(tag => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          <View style={s.hintRow}>
            <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
            <Text style={s.hintText}>{tr.vdHint}</Text>
          </View>
        </View>

        {/* ── Card 2: Metrics + Tolerance ── */}
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.cardTitleNew}>{tr.vdCard2Title}</Text>
          {/* 2×2 metric grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {METRICS.map(m => (
              <View key={m.label} style={s.metricTile}>
                <Ionicons name={m.icon} size={14} color={m.color} />
                <Text style={s.metricTileLabel}>{m.label}</Text>
                <Text style={s.metricTileValue}>{m.value}</Text>
              </View>
            ))}
          </View>

          {/* Stress bars */}
          <View style={s.dividerH} />
          <Text style={[s.subHeading, { marginTop: 12, marginBottom: 8 }]}>{tr.vdStressTitle}</Text>
          {STRESS_BARS.map((b, i) => (
            <View key={b.label} style={[s.barRow, i === STRESS_BARS.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.barLabel}>{b.label}</Text>
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${b.pct}%` as any, backgroundColor: b.color }]} />
              </View>
              <Text style={[s.barPct, { color: b.color }]}>{b.pct}%</Text>
            </View>
          ))}
        </View>

        {/* ── Card 3: Requirements ── */}
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.cardTitleNew}>{tr.vdCard3Title}</Text>
          {REQS.map((item, i) => (
            <View
              key={item.label}
              style={[s.reqRow, i === REQS.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={s.iconBox}>
                <Ionicons name={item.icon} size={14} color={item.color} />
              </View>
              <Text style={s.reqLabel}>{item.label}</Text>
              <Text style={s.reqValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Buttons ── */}
        <View style={{ gap: 10, marginTop: 8 }}>
          <TouchableOpacity style={s.primaryBtn} onPress={onUseThisVariety} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>{tr.vdUseBtn}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.navigate('PlantingGuide')} activeOpacity={0.75}>
            <Text style={s.secondaryBtnText}>{tr.vdViewGuide}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.navigate('SuitabilityResults')} activeOpacity={0.75}>
            <Text style={s.secondaryBtnText}>{tr.vdCompareBtn}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F7F9F8' },
  scroll: { paddingHorizontal: 20, paddingBottom: 110 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 10,
  },
  backBtn:    { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle:{ fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  headerSub:  { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  certBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', borderRadius: 9999,
    borderWidth: 1, borderColor: '#D1FAE5',
    paddingVertical: 5, paddingHorizontal: 10,
  },
  certBadgeText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, marginBottom: 10,
  },

  /* Score */
  scoreValue:   { fontSize: 24, fontWeight: '800', color: '#059669', letterSpacing: -0.5 },
  scoreLabel:   { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  scoreDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },

  /* Tags */
  tag:    { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#D1FAE5' },
  tagText:{ fontSize: 11, fontWeight: '600', color: '#059669' },

  /* Hint */
  hintRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  hintText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 17 },

  cardTitleNew: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  subHeading:   { fontSize: 13, fontWeight: '700', color: '#374151' },

  /* Metric tiles */
  metricTile: {
    width: '48%', borderRadius: 12, borderWidth: 1,
    borderColor: '#E5E7EB', backgroundColor: '#F9FAFB',
    padding: 10, gap: 4,
  },
  metricTileLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  metricTileValue: { fontSize: 14, fontWeight: '700', color: '#111827' },

  dividerH: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' },

  /* Stress bars */
  barRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  barLabel:{ fontSize: 12, color: '#6B7280', fontWeight: '600', width: 70 },
  barBg:   { flex: 1, height: 5, backgroundColor: '#F3F4F6', borderRadius: 3 },
  barFill: { height: 5, borderRadius: 3 },
  barPct:  { fontSize: 12, fontWeight: '700', width: 34, textAlign: 'right' },

  /* Requirements */
  reqRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  iconBox:  { width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  reqLabel: { fontSize: 13, fontWeight: '600', color: '#111827', width: 90 },
  reqValue: { flex: 1, fontSize: 12, color: '#6B7280', textAlign: 'right' },

  /* Buttons */
  primaryBtn:     { backgroundColor: '#059669', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn:   { height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECFDF5' },
  secondaryBtnText:{ fontSize: 14, fontWeight: '600', color: '#059669' },
});
