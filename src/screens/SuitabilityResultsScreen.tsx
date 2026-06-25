import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { mockRecommendations, mockRiceVarieties } from '../data/mockData';
import type { Recommendation } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';

type Nav = StackNavigationProp<any>;

const ECOSYSTEM_LABEL: Record<string, string> = {
  irrigated_lowland: 'Irrigated lowland',
  rainfed_lowland:   'Rainfed lowland',
  upland:            'Upland',
};

function soilLabel(texture?: string): string {
  const t = (texture ?? '').toLowerCase();
  if (!t) return '—';
  if (t.includes('clay')) return 'Clay';
  if (t.includes('silt')) return 'Silty';
  if (t.includes('loam')) return 'Loam';
  if (t.includes('sand')) return 'Sandy';
  return texture as string;
}

function rainLabel(mm?: number | null): string {
  if (mm == null) return '—';
  if (mm >= 1000) return 'Heavy rain';
  if (mm >= 700)  return 'Moderate rain';
  return 'Light rain';
}

const FLOOD_LABEL: Record<string, string> = {
  low: 'Low flood risk',  moderate: 'Moderate flood risk',  high: 'High flood risk',
};

const TOLERANCE_LABEL: Record<string, string> = {
  low: 'Low', moderate: 'Moderate', high: 'High', 'very high': 'Very high',
};
function tolLabel(v?: string): string {
  return TOLERANCE_LABEL[(v ?? '').toLowerCase()] ?? (v || '—');
}

function classCode(full?: string): string {
  return (full ?? '').trim().split(/[\s-]/)[0] || '—';
}
const CLASS_LABEL: Record<string, string> = {
  S1: 'Highly suitable',
  S2: 'Moderately suitable',
  S3: 'Marginally suitable',
  N1: 'Currently unsuitable',
  N2: 'Permanently unsuitable',
};
function classLabel(full?: string): string {
  return CLASS_LABEL[classCode(full)] ?? 'Suitable';
}

function shortName(name: string): string {
  return name.replace('NSIC ', '').replace(/\s*\(.*\)/, '').trim();
}

// Map tolerance string → number of filled dots (0–3) for the visual meter
function toleranceLevel(v?: string): number {
  const t = (v ?? '').toLowerCase();
  if (t === 'very high') return 3;
  if (t === 'high')      return 3;
  if (t === 'moderate')  return 2;
  if (t === 'low')       return 1;
  return 0;
}

const ToleranceMeter: React.FC<{ label: string; value?: string }> = ({ label, value }) => {
  const level = toleranceLevel(value);
  const color = level >= 3 ? '#059669' : level >= 2 ? '#D97706' : level >= 1 ? '#DC2626' : '#D1D5DB';
  return (
    <View style={tm.wrap}>
      <Text style={tm.label}>{label}</Text>
      <View style={tm.dots}>
        {[1, 2, 3].map(i => (
          <View
            key={i}
            style={[tm.dot, { backgroundColor: i <= level ? color : '#E5E7EB' }]}
          />
        ))}
      </View>
      <Text style={[tm.value, { color }]}>{tolLabel(value)}</Text>
    </View>
  );
};

const tm = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', gap: 5 },
  label: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  dots:  { flexDirection: 'row', gap: 3 },
  dot:   { width: 8, height: 8, borderRadius: 4 },
  value: { fontSize: 11, fontWeight: '700' },
});

function buildEnvItems(scan: any, farmData: any) {
  const ecosystem = farmData?.ecosystem ?? scan?.ecosystem;
  return [
    { label: 'Location',  value: ECOSYSTEM_LABEL[ecosystem] ?? 'Lowland' },
    { label: 'Soil',      value: soilLabel(scan?.soil_texture) },
    { label: 'Rainfall',  value: rainLabel(scan?.seasonal_rainfall_mm) },
    { label: 'Flood',     value: FLOOD_LABEL[(scan?.flood_risk ?? '').toLowerCase()] ?? '—' },
  ];
}

interface DisplayRec {
  id: number | string;
  rank: number;
  suitabilityScore: number;
  rsiScore: number | string;
  suitabilityClass: string;
  variety: {
    name: string;
    maturityDays: number;
    floodTolerance: string;
    droughtTolerance: string;
    avgYield: number;
  };
}

function buildFromReal(rec: Recommendation): DisplayRec[] {
  return rec.results.map(r => ({
    id: r.rank,
    rank: r.rank,
    suitabilityScore: Math.round(r.rsi_score),
    rsiScore: r.rsi_score.toFixed(1),
    suitabilityClass: r.suitability_class,
    variety: {
      name: r.variety.common_name,
      maturityDays: r.variety.maturity_days,
      floodTolerance: r.variety.submergence_tolerance,
      droughtTolerance: r.variety.drought_tolerance,
      avgYield: r.variety.avg_yield_t_ha,
    },
  }));
}

function buildFromMock(): DisplayRec[] {
  return mockRecommendations.map(rec => {
    const variety = mockRiceVarieties.find(v => v.id === rec.varietyId)!;
    return {
      id: rec.id,
      rank: rec.rank,
      suitabilityScore: rec.suitabilityScore,
      rsiScore: rec.rsiScore,
      suitabilityClass: rec.rank === 1 ? 'S1' : rec.rank === 2 ? 'S2' : 'S3',
      variety: {
        name: variety?.name ?? '—',
        maturityDays: variety?.maturityDays ?? 0,
        floodTolerance: variety?.floodTolerance ?? '—',
        droughtTolerance: variety?.droughtTolerance ?? '—',
        avgYield: variety?.yieldPotential ?? 0,
      },
    };
  });
}

export const SuitabilityResultsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<any>();
  const farmData   = route.params?.farmData ?? {};
  const realRec    = route.params?.recommendationData as Recommendation | undefined;
  const realScan   = route.params?.scanData;

  const setSetupProgress = useAppStore(s => s.setSetupProgress);
  useEffect(() => {
    setSetupProgress('SuitabilityResults', { farmData, recommendationData: realRec, scanData: realScan });
  }, []);

  const combined: DisplayRec[] = realRec ? buildFromReal(realRec) : buildFromMock();
  const envItems   = buildEnvItems(realScan, farmData);

  // Display-only tiebreaker (does NOT change the validated RSI score)
  const ranked: DisplayRec[] = [...combined]
    .sort((a, b) =>
      (Number(b.suitabilityScore) - Number(a.suitabilityScore)) ||
      (b.variety.avgYield - a.variety.avgYield) ||
      (a.variety.maturityDays - b.variety.maturityDays)
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const fieldScore = ranked[0]?.suitabilityScore ?? 0;
  const fieldClass = classCode(ranked[0]?.suitabilityClass);
  const fieldLabel = classLabel(ranked[0]?.suitabilityClass);
  const allTied    = ranked.length > 1 &&
    ranked.every(r => r.suitabilityScore === ranked[0].suitabilityScore);

  const handleDetail = (rec: DisplayRec) => {
    navigation.navigate('PlantingGuideHandoff', {
      farmData,
      selectedVariety: rec.variety,
      recommendation: rec,
    });
  };

  return (
    <SafeAreaView style={s.root}>

      {/* Header — same as the rest of the setup flow */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={s.headerTitle}>Recommendations</Text>
        <Text style={s.stepText}>4 / 4</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Field suitability — flat white card with a small RSI score bar for visual rhythm */}
        <View style={s.fieldCard}>
          <Text style={s.fieldLead}>Your field is</Text>
          <View style={s.fieldVerdict}>
            <Text style={s.fieldClass}>{fieldClass}</Text>
            <Text style={s.fieldLabel}>{fieldLabel}</Text>
          </View>

          {/* RSI score + thin horizontal bar showing where the score sits 0–100 */}
          <View style={s.fieldScoreRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldScore}>{fieldScore}<Text style={s.fieldScoreUnit}>/100</Text></Text>
              <Text style={s.fieldScoreNote}>RSI score</Text>
            </View>
            <View style={s.scoreBarWrap}>
              <View style={s.scoreBarTrack}>
                <View style={[s.scoreBarFill, { width: `${Math.min(100, Math.max(0, fieldScore))}%` }]} />
              </View>
            </View>
          </View>

          {/* Evidence list — plain label/value pairs with small leading dot */}
          <View style={s.evidenceList}>
            {envItems.map((item, i) => (
              <View key={item.label} style={[s.evidenceRow, i < envItems.length - 1 && s.evidenceRowDivider]}>
                <View style={s.evidenceDot} />
                <Text style={s.evidenceLabel}>{item.label}</Text>
                <Text style={s.evidenceValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.fieldNote}>
            {allTied
              ? 'All three varieties below score equally on your field. Ranked by yield and days-to-harvest.'
              : 'The RSI score rates the field, not the variety. Ranked by score, yield, and days-to-harvest.'}
          </Text>
        </View>

        {/* Top 3 list */}
        <Text style={s.listHeading}>Top 3 varieties</Text>

        {ranked.map(rec => {
          const isTop = rec.rank === 1;
          return (
            <View key={rec.id} style={[s.varCard, isTop && s.varCardTop]}>

              {/* Rank chip + leaf-led name + soft Recommended pill on the top variety */}
              <View style={s.varHead}>
                <View style={[s.rankChip, isTop && s.rankChipTop]}>
                  <Text style={[s.rankChipText, isTop && s.rankChipTextTop]}>{rec.rank}</Text>
                </View>
                <View style={s.varNameWrap}>
                  <Ionicons name="leaf" size={13} color={isTop ? '#059669' : '#9CA3AF'} />
                  <Text style={s.varName} numberOfLines={1}>{rec.variety.name}</Text>
                </View>
                {isTop && (
                  <View style={s.recommendedBadge}>
                    <Ionicons name="ribbon" size={14} color="#059669" />
                  </View>
                )}
              </View>

              {/* Two key metrics with small leading icons for rhythm */}
              <View style={s.metricRow}>
                <View style={s.metricCol}>
                  <View style={s.metricHead}>
                    <Ionicons name="trending-up-outline" size={12} color="#9CA3AF" />
                    <Text style={s.metricLabel}>Expected yield</Text>
                  </View>
                  <Text style={s.metricVal}>
                    {rec.variety.avgYield}<Text style={s.metricUnit}> t/ha</Text>
                  </Text>
                </View>
                <View style={s.metricSep} />
                <View style={s.metricCol}>
                  <View style={s.metricHead}>
                    <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                    <Text style={s.metricLabel}>To harvest</Text>
                  </View>
                  <Text style={s.metricVal}>
                    {rec.variety.maturityDays}<Text style={s.metricUnit}> days</Text>
                  </Text>
                </View>
              </View>

              {/* Tolerance as small 3-dot meters (more scannable than plain text) */}
              <View style={s.tolBlock}>
                <ToleranceMeter label="Flood"   value={rec.variety.floodTolerance} />
                <View style={s.tolDivider} />
                <ToleranceMeter label="Drought" value={rec.variety.droughtTolerance} />
              </View>

              <TouchableOpacity
                style={[s.saveBtn, !isTop && s.saveBtnGhost]}
                onPress={() => handleDetail(rec)}
                activeOpacity={0.85}
              >
                <Text style={[s.saveBtnText, !isTop && s.saveBtnTextGhost]}>
                  {isTop ? 'Use this variety' : 'See details'}
                </Text>
              </TouchableOpacity>

            </View>
          );
        })}

        {/* Comparison table — concise, no colored tints */}
        <Text style={s.listHeading}>Side-by-side</Text>
        <View style={s.table}>
          <View style={s.tHead}>
            <View style={{ flex: 1.3 }} />
            {ranked.map(rec => (
              <View key={rec.id} style={s.tHeadCell}>
                <Text style={s.tHeadRank}>{rec.rank}</Text>
                <Text style={s.tHeadName} numberOfLines={1}>{shortName(rec.variety.name)}</Text>
              </View>
            ))}
          </View>

          {[
            { label: 'RSI score',   values: ranked.map(r => `${r.rsiScore}`) },
            { label: 'Class',       values: ranked.map(r => classCode(r.suitabilityClass)) },
            { label: 'Days',        values: ranked.map(r => `${r.variety.maturityDays}`) },
            { label: 'Yield (t/ha)',values: ranked.map(r => `${r.variety.avgYield}`) },
            { label: 'Flood tol.',  values: ranked.map(r => tolLabel(r.variety.floodTolerance)) },
            { label: 'Drought tol.',values: ranked.map(r => tolLabel(r.variety.droughtTolerance)) },
          ].map((row, i, arr) => (
            <View key={row.label} style={[s.tRow, i < arr.length - 1 && s.tRowDivider]}>
              <View style={{ flex: 1.3, justifyContent: 'center', paddingLeft: 14 }}>
                <Text style={s.tLabel}>{row.label}</Text>
              </View>
              {row.values.map((val, vi) => (
                <View key={vi} style={s.tCell}>
                  <Text style={[s.tVal, vi === 0 && s.tValTop]}>{val}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Header — same as Login / Register / FarmSetup / etc. */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  stepText:    { width: 32, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#9CA3AF' },

  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },

  /* Field suitability card — flat white */
  fieldCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 18, marginBottom: 20,
  },
  fieldLead: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 4 },
  fieldVerdict: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 14 },
  fieldClass: { fontSize: 28, fontWeight: '800', color: '#059669', letterSpacing: -1, lineHeight: 32 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },

  fieldScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  fieldScore:    { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  fieldScoreUnit:{ fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  fieldScoreNote:{ fontSize: 12, color: '#6B7280', marginTop: 2 },

  /* Score bar — thin track + green fill (visual rhythm without a chart) */
  scoreBarWrap:  { flex: 1.4 },
  scoreBarTrack: { height: 4, borderRadius: 2, backgroundColor: '#F3F4F6', overflow: 'hidden' },
  scoreBarFill:  { height: '100%', borderRadius: 2, backgroundColor: '#059669' },

  evidenceList: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6',
    marginBottom: 14,
  },
  evidenceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11,
  },
  evidenceRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  evidenceDot:   { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB' },
  evidenceLabel: { flex: 1, fontSize: 12, color: '#6B7280' },
  evidenceValue: { fontSize: 13, fontWeight: '600', color: '#111827' },

  fieldNote: { fontSize: 12, color: '#9CA3AF', lineHeight: 17, fontStyle: 'italic' },

  /* Section heading — sentence case bold, same as elsewhere */
  listHeading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8 },

  /* Variety card */
  varCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, marginBottom: 10,
  },
  /* Top card — green-tinted border + barely-there mint wash for elevation without weight */
  varCardTop: {
    borderColor: '#059669', borderWidth: 1.5,
    backgroundColor: '#F7FBF9',
  },

  varHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },

  /* Soft rank chip — light gray normally, soft green on the top one */
  rankChip: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
  },
  rankChipTop:     { backgroundColor: '#ECFDF5' },
  rankChipText:    { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  rankChipTextTop: { color: '#059669' },

  varName: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: '#111827' },

  /* Recommended badge — icon only, no label */
  recommendedBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center',
  },

  metricRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  metricCol: { flex: 1, alignItems: 'center' },
  metricHead:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metricSep: { width: StyleSheet.hairlineWidth, height: 38, backgroundColor: '#E5E7EB' },
  metricVal: { fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  metricUnit:{ fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  metricLabel:{ fontSize: 11, color: '#9CA3AF' },

  /* Tolerance meter block — replaces plain "Flood: Low" text */
  tolBlock: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    marginBottom: 14,
  },
  tolDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: '#E5E7EB' },

  /* Variety name with leading leaf icon */
  varNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },

  /* Buttons — same vocabulary as elsewhere */
  saveBtn: {
    height: 46, borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  saveBtnGhost: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowOpacity: 0, elevation: 0,
  },
  saveBtnTextGhost: { color: '#374151', fontWeight: '600' },

  /* Comparison table */
  table: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden', marginTop: 4, marginBottom: 16,
  },
  tHead: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
  },
  tHeadCell: { flex: 1, alignItems: 'center', gap: 2 },
  tHeadRank: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  tHeadName: { fontSize: 12, fontWeight: '700', color: '#111827' },

  tRow: { flexDirection: 'row', paddingVertical: 12 },
  tRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  tLabel: { fontSize: 12, color: '#6B7280' },
  tCell:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tVal:   { fontSize: 12, fontWeight: '600', color: '#374151' },
  tValTop:{ color: '#059669', fontWeight: '800' },
});
