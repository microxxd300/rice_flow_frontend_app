import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { mockRecommendations, mockVarietyClimateMatrix } from '../data/mockData';
import { colors, spacing, radius } from '../theme';
import { useTranslation } from '@/i18n/useTranslation';

interface RecommendationResultsScreenProps {
  onSelectVariety?: (varietyId: string) => void;
  onViewDetails?: (varietyId: string) => void;
}

const VARIETY_NAMES = ['NSIC Rc160', 'PSBRc28', 'BNR3'];
const SCORES = [82, 76, 71];

export const RecommendationResultsScreen: React.FC<RecommendationResultsScreenProps> = ({
  onSelectVariety, onViewDetails,
}) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const tr = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const FILTERS = [
    { id: 'all',     label: tr.recFilterAll },
    { id: 'flood',   label: tr.recFilterFlood },
    { id: 'drought', label: tr.recFilterDrought },
    { id: 'early',   label: tr.recFilterEarly },
  ];
  const COMPARE_ROWS = [
    { label: tr.recCompareDays,    values: ['115d', '120d', '125d'] },
    { label: tr.recCompareYield,   values: [tr.valHigh, tr.valVeryHigh, tr.valGood] },
    { label: tr.recCompareFlood,   values: [tr.valHigh, tr.valVeryHigh, tr.valModerate] },
    { label: tr.recCompareDrought, values: [tr.valModerate, tr.valModerate, tr.valHigh] },
  ];
  const TRAITS = [
    [tr.traitHighYield, tr.traitFloodSafe, tr.traitNsicCert],
    [tr.traitFloodSafe, tr.traitNsicCert],
    [tr.traitDroughtSafe, tr.traitNsicCert],
  ];

  const FILTER_MATCH: Record<string, number[]> = {
    all:     [0, 1, 2],
    flood:   [0, 1],
    drought: [2],
    early:   [0],
  };
  const filteredRecs = mockRecommendations.filter((_, i) =>
    FILTER_MATCH[activeFilter]?.includes(i)
  );

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{tr.recHeaderTitle}</Text>
          <Text style={s.headerSub}>{tr.recHeaderSub}</Text>
        </View>
        <View style={s.matchBadge}>
          <Ionicons name="leaf" size={12} color="#059669" />
          <Text style={s.matchBadgeText}>{tr.recFound}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Why this fits */}
        <View style={s.whyCard}>
          <View style={s.whyHeader}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={s.whyTitle}>{tr.recWhyTitle}</Text>
          </View>
          <View style={{ gap: 8, marginTop: 4 }}>
            {[
              [
                { icon: 'location-outline' as const, color: '#EF4444', label: tr.recWhyLocation, value: tr.recWhyLocationVal },
                { icon: 'layers-outline'   as const, color: '#D97706', label: tr.recWhySoil,     value: tr.recWhySoilVal },
              ],
              [
                { icon: 'rainy-outline' as const, color: '#2563EB', label: tr.recWhyRain,  value: tr.recWhyRainVal },
                { icon: 'water-outline' as const, color: '#2563EB', label: tr.recWhyFlood, value: tr.recWhyFloodVal },
              ],
            ].map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
                {row.map(item => (
                  <View key={item.label} style={s.whyItem}>
                    <Ionicons name={item.icon} size={13} color={item.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.whyItemLabel}>{item.label}</Text>
                      <Text style={s.whyItemValue}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Filter chips */}
        {/* TOP 3 variety cards */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 }}>
          <Text style={[s.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>{tr.recTop3}</Text>
          <TouchableOpacity
            onPress={() => setShowFilters(v => !v)}
            activeOpacity={0.75}
            style={[s.filterBtn, showFilters && s.filterBtnActive]}
          >
            <Ionicons name="options-outline" size={15} color={showFilters ? colors.primary : colors.textTertiary} />
            <Text style={[s.filterBtnText, showFilters && { color: colors.primary }]}>{tr.recFilter}</Text>
            {activeFilter !== 'all' && <View style={s.filterDot} />}
          </TouchableOpacity>
        </View>

        {showFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 1 }}
          >
            {FILTERS.map(f => {
              const active = activeFilter === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setActiveFilter(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        {filteredRecs.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="leaf-outline" size={32} color="#D1D5DB" />
            <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 8 }}>{tr.recNoVariety}</Text>
          </View>
        )}
        {filteredRecs.map((rec) => {
          const i = mockRecommendations.indexOf(rec);
          const isTop      = rec.rank === 1;
          const scoreColor = SCORES[i] >= 80 ? colors.primary : SCORES[i] >= 70 ? colors.warning : colors.textSecondary;
          const scoreBg    = SCORES[i] >= 80 ? colors.primaryLighter : SCORES[i] >= 70 ? colors.warningLight : colors.surfaceAlt;
          const scoreBorder= SCORES[i] >= 80 ? colors.primary + '40' : SCORES[i] >= 70 ? colors.warning + '60' : colors.border;
          const rsiColor   = rec.rsiScore >= 8 ? colors.primary : rec.rsiScore >= 6 ? colors.warning : colors.error;
          return (
            <TouchableOpacity
              key={rec.id}
              style={[s.rankCard, isTop && {
                borderColor: colors.primary,
                borderWidth: 1.5,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18,
                shadowRadius: 12,
                elevation: 6,
              }]}
              activeOpacity={0.8}
              onPress={() => { onViewDetails?.(rec.varietyId); navigation.navigate('VarietyDetail'); }}
            >

              {/* Name + score */}
              <View style={s.rankTopRow}>
                <View style={[s.rankBadge, isTop && { backgroundColor: colors.primaryLighter, borderColor: colors.primary + '40' }]}>
                  <Text style={[s.rankBadgeText, isTop && { color: colors.primaryDark }]}>{rec.rank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rankName}>{VARIETY_NAMES[i]}</Text>
                </View>
                <View style={[s.scoreChip, { backgroundColor: scoreBg, borderColor: scoreBorder }]}>
                  <Text style={[s.scoreChipText, { color: scoreColor }]}>{SCORES[i]}%</Text>
                </View>
              </View>

              {/* Traits */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {TRAITS[i].map(t => (
                  <View key={t} style={s.traitChip}>
                    <Text style={s.traitChipText}>{t}</Text>
                  </View>
                ))}
              </View>

              {/* Meta stats */}
              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>RSI Score</Text>
                  <Text style={[s.metaValue, { color: rsiColor }]}>{rec.rsiScore}</Text>
                </View>
                <View style={s.metaDivider} />
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>{tr.recClimate}</Text>
                  <Text style={s.metaValue}>
                    {rec.climateResilience === 'high' ? tr.valHigh : rec.climateResilience === 'medium' ? tr.valModerate : tr.valLow}
                  </Text>
                </View>
                <View style={s.metaDivider} />
                <View style={s.metaItem}>
                  <Text style={s.metaLabel}>{tr.recSuitable}</Text>
                  <Text style={[s.metaValue, { color: scoreColor }]}>{SCORES[i]}/100</Text>
                </View>
              </View>

              {/* Details link */}
              <View style={s.detailsRow}>
                <Text style={s.detailsText}>{tr.recDetails}</Text>
                <Ionicons name="chevron-forward" size={13} color="#059669" />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Comparison table */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>{tr.recCompareTitle}</Text>
        <View style={s.card}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={{ minWidth: 420 }}>
              {/* Header */}
              <View style={[s.tableRow, { backgroundColor: colors.primaryLighter, borderRadius: radius.sm, marginBottom: 4 }]}>
                <Text style={[s.tableLabel, { color: colors.primaryDark }]}>{tr.recCompareTrait}</Text>
                {VARIETY_NAMES.map(name => (
                  <Text key={name} style={[s.colHeaderText, { color: colors.primary, width: 100, textAlign: 'center' }]}>{name}</Text>
                ))}
              </View>

              {COMPARE_ROWS.map((row, ri) => (
                <View
                  key={row.label}
                  style={[s.tableRow, ri === COMPARE_ROWS.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={s.tableLabel}>{row.label}</Text>
                  {row.values.map((v, vi) => (
                    <Text key={vi} style={[s.tableValue, vi === 0 && { color: colors.primary, fontWeight: '700' }]}>
                      {v}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Climate matrix */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>{tr.recClimateTitle}</Text>
        <View style={s.card}>

          {/* Matrix header */}
          <View style={[s.tableRow, { backgroundColor: colors.primaryLighter, marginBottom: 4 }]}>
            <Text style={[s.tableHeaderCell, { flex: 1.3, color: colors.primaryDark }]}>{tr.recClimateCondition}</Text>
            {mockVarietyClimateMatrix.map(v => (
              <Text key={v.variety} style={[s.tableHeaderCell, { textAlign: 'center', color: colors.primaryDark }]}>
                {v.variety.replace('NSIC ', '')}
              </Text>
            ))}
          </View>

          {([
            { key: 'wetSeason',  label: tr.recCondWet       },
            { key: 'drySeason',  label: tr.recCondDry       },
            { key: 'heavyRain',  label: tr.recCondHeavyRain },
            { key: 'drought',    label: tr.recCondDrought   },
          ]).map((cond, ri, arr) => (
            <View
              key={cond.key}
              style={[
                s.tableRow,
                ri % 2 === 1 && { backgroundColor: colors.surfaceAlt },
                ri === arr.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={[s.condLabel, { flex: 1.3 }]}>{cond.label}</Text>
              {mockVarietyClimateMatrix.map((v, vi) => {
                const entry = v[cond.key as keyof typeof v] as { rating: string; score: number; note: string };
                const sc = entry.score;
                const color = sc >= 85 ? colors.success : sc >= 60 ? colors.warning : colors.error;
                const bg    = sc >= 85 ? colors.successLight : sc >= 60 ? colors.warningLight : colors.errorLight;
                return (
                  <View key={vi} style={s.matrixScoreCell}>
                    <View style={[s.scoreCircle, { backgroundColor: bg }]}>
                      <Text style={[s.scoreCircleText, { color }]}>{sc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={s.matrixLegend}>
            {[
              { color: colors.success,  bg: colors.successLight,  label: tr.recLegendExcellent },
              { color: colors.warning,  bg: colors.warningLight,  label: tr.recLegendModerate },
              { color: colors.error,    bg: colors.errorLight,    label: tr.recLegendWeak },
            ].map(l => (
              <View key={l.label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: l.bg, borderColor: l.color + '40', borderWidth: 1 }]} />
                <Text style={s.legendLabel}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Select a variety */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>{tr.recSelectTitle}</Text>
        <View style={s.card}>
          <Text style={s.selectNote}>{tr.recSelectNote}</Text>
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              style={s.selectPrimaryBtn}
              onPress={() => onSelectVariety?.('variety_001')}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="ribbon" size={16} color="#FFFFFF" />
                <Text style={s.selectPrimaryBtnText}>{tr.recSelectMostFit.replace('{name}', 'NSIC Rc160')}</Text>
              </View>
            </TouchableOpacity>
            {[
              { id: 'variety_002', label: 'PSBRc28' },
              { id: 'variety_003', label: 'BNR3' },
            ].map(v => (
              <TouchableOpacity
                key={v.id}
                style={s.selectSecondaryBtn}
                onPress={() => onSelectVariety?.(v.id)}
                activeOpacity={0.75}
              >
                <Text style={s.selectSecondaryBtnText}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 110 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  matchBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryLighter, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.primary + '40',
    paddingVertical: 5, paddingHorizontal: 10,
  },
  matchBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  /* Why card */
  whyCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginTop: 20, marginBottom: 4,
  },
  whyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  whyTitle:  { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
  whyGrid:   { gap: 8, marginTop: 4 },
  whyItem: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  whyItemLabel: { fontSize: 11, color: colors.textTertiary, fontWeight: '600', marginBottom: 2 },
  whyItemValue: { fontSize: 12, fontWeight: '700', color: colors.text },

  /* Section label */
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: colors.textTertiary,
    letterSpacing: 0.8, marginTop: 24, marginBottom: 10,
  },

  /* Filter toggle button */
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primaryLighter, borderColor: colors.primary + '40' },
  filterBtnText:   { fontSize: 12, fontWeight: '600', color: colors.textTertiary },
  filterDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.primary, marginLeft: 2,
  },

  /* Filter chips */
  chip: {
    paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive:     { backgroundColor: colors.primary },
  chipText:       { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
  chipTextActive: { color: colors.surface },

  /* Rank cards */
  rankCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 10,
  },
  rankTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rankBadge: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  rankBadgeText: { fontSize: 15, fontWeight: '800', color: colors.textTertiary },
  rankName:  { fontSize: 16, fontWeight: '700', color: colors.text },
  topPill: {
    position: 'absolute', top: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryLighter, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.primary + '60',
    paddingVertical: 4, paddingHorizontal: 10,
    zIndex: 1,
  },
  topPillText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  scoreChip: {
    borderRadius: radius.full, borderWidth: 1,
    paddingVertical: 5, paddingHorizontal: 12,
  },
  scoreChipText: { fontSize: 15, fontWeight: '700' },
  traitChip: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
  },
  traitChipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceAlt, borderRadius: radius.md,
    padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  metaItem:   { flex: 1, alignItems: 'center' },
  metaDivider:{ width: StyleSheet.hairlineWidth, height: 26, backgroundColor: colors.border },
  metaLabel:  { fontSize: 11, color: colors.textTertiary, fontWeight: '600', marginBottom: 2 },
  metaValue:  { fontSize: 14, fontWeight: '700', color: colors.text },
  detailsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  detailsText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  /* Generic card */
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 10,
  },

  /* Table */
  tableRow: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight,
    alignItems: 'center',
  },
  tableHeaderCell: {
    flex: 1, fontSize: 11, fontWeight: '700', color: colors.textSecondary,
    paddingHorizontal: 4, paddingVertical: 6,
  },
  tableLabel: {
    width: 120, fontSize: 12, color: colors.textSecondary, fontWeight: '600', paddingHorizontal: 4,
  },
  colFixed: { width: 120 },
  colHeader: {
    width: 100, alignItems: 'center', borderRadius: radius.sm,
    paddingVertical: 5, paddingHorizontal: 4, marginHorizontal: 4,
  },
  colHeaderText: { width: 100, fontSize: 11, fontWeight: '700', textAlign: 'center', marginHorizontal: 4 },
  tableValue: {
    width: 100, fontSize: 12, fontWeight: '600', color: colors.text,
    textAlign: 'center', marginHorizontal: 4,
  },

  /* Climate matrix */
  climateHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  climateTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  condCell:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  condLabel:  { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  matrixScoreCell: { flex: 1, alignItems: 'center' },
  scoreCircle: { width: 36, height: 26, borderRadius: radius.sm, justifyContent: 'center', alignItems: 'center' },
  scoreCircleText: { fontSize: 11, fontWeight: '700' },
  matrixLegend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingTop: 10, marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight,
  },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 10, height: 10, borderRadius: radius.xs },
  legendLabel: { fontSize: 11, color: colors.textSecondary },

  /* Select buttons */
  selectNote: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 14 },
  selectPrimaryBtn: {
    backgroundColor: colors.primary, height: 52, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center',
  },
  selectPrimaryBtnText: { fontSize: 14, fontWeight: '700', color: colors.surface },
  selectSecondaryBtn: {
    height: 48, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.primary + '40',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.primaryLighter,
  },
  selectSecondaryBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
