import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SetupHeader } from '@/components/SetupHeader';
import { useTranslation } from '@/i18n/useTranslation';
import type { Recommendation } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';
import { suitabilityCode, suitabilityLegend, suitabilityText } from '@/utils/suitability';
import { useAccessibility } from '@/context/AccessibilityContext';

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
  fitExplanation?: string;   // per-farm "why it fits" (from backend)
  description?: string;      // variety narrative (from backend)
  variety: {
    id: number;
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
    fitExplanation: (r as any).fit_explanation || '',
    description: (r.variety as any).ai_description || '',
    variety: {
      id: r.variety.id,
      name: r.variety.common_name,
      maturityDays: r.variety.maturity_days,
      floodTolerance: r.variety.submergence_tolerance,
      droughtTolerance: r.variety.drought_tolerance,
      avgYield: r.variety.avg_yield_t_ha,
    },
  }));
}

export const SuitabilityResultsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { isLargeText } = useAccessibility();
  const T = isLargeText;   // easy-reading text scale
  const route      = useRoute<any>();
  const farmData   = route.params?.farmData ?? {};
  const realRec    = route.params?.recommendationData as Recommendation | undefined;
  const realScan   = route.params?.scanData;

  const setSetupProgress = useAppStore(s => s.setSetupProgress);
  useEffect(() => {
    setSetupProgress('SuitabilityResults', { farmData, recommendationData: realRec, scanData: realScan });
  }, []);

  const tr = useTranslation();
  // Real results only: if the analysis failed there is nothing to show, never mock varieties
  const combined: DisplayRec[] = realRec ? buildFromReal(realRec) : [];
  // How the soil was read (from the scan response): estimates, or soil that varies
  const soilSampling = (realScan as any)?.soil_sampling as
    { estimated?: boolean; varies?: boolean; ph_range?: [number, number] | null } | undefined;
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
  const fieldClass = suitabilityText(ranked[0]?.suitabilityClass);   // "Highly Suitable [S1]"
  const allTied    = ranked.length > 1 &&
    ranked.every(r => r.suitabilityScore === ranked[0].suitabilityScore);

  const handleDetail = (rec: DisplayRec) => {
    navigation.navigateDeprecated('PlantingGuideHandoff', {
      farmData,
      selectedVariety: rec.variety,
      recommendation: rec,
    });
  };

  if (combined.length === 0) {
    return (
      <SafeAreaView style={s.root}>
        <SetupHeader title="Recommendations" step={4} />
        <View style={s.failBox}>
          <Ionicons name="cloud-offline-outline" size={30} color="#9CA3AF" />
          <Text style={s.failTitle}>We couldn't get recommendations</Text>
          <Text style={s.failBody}>The analysis didn't finish, so there are no results to show. Go back and try again.</Text>
          <TouchableOpacity style={s.failBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={s.failBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>

      <SetupHeader title="Recommendations" step={4} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Field suitability — flat white card with a small RSI score bar for visual rhythm */}
        <View style={s.fieldCard}>
          <Text style={s.fieldLead}>Your field is</Text>
          <View style={s.fieldVerdict}>
            <Text style={s.fieldClass}>{fieldClass}</Text>
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

          <Text style={[s.fieldNote, T && { fontSize: 14, lineHeight: 20 }]}>
            {allTied
              ? 'All three varieties below score equally on your field. Ranked by harvest and days-to-harvest.'
              : 'The RSI score rates the field, not the variety. Ranked by score, harvest, and days-to-harvest.'}
          </Text>

          {/* Soil read as estimates (no SoilGrids data), or soil that differs across the farm */}
          {(soilSampling?.estimated || soilSampling?.varies) && (
            <View style={s.soilNotice}>
              <Ionicons name="warning-outline" size={16} color="#D97706" />
              <Text style={s.soilNoticeText}>
                {soilSampling.estimated
                  ? tr.envSoilEstimated
                  : `${tr.envSoilVariesTitle}${soilSampling.ph_range ? ` (pH ${soilSampling.ph_range[0]}–${soilSampling.ph_range[1]})` : ''}. ${tr.envSoilVariesBody}`}
              </Text>
            </View>
          )}
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
                  <Ionicons name="leaf" size={15} color={isTop ? '#059669' : '#9CA3AF'} />
                  <Text style={[s.varName, T && { fontSize: 19 }]} numberOfLines={1}>{rec.variety.name}</Text>
                </View>
                {isTop && (
                  <View style={s.recommendedBadge}>
                    <Ionicons name="ribbon" size={16} color="#FFFFFF" />
                  </View>
                )}
              </View>

              {/* Two key metrics with small leading icons for rhythm */}
              <View style={s.metricRow}>
                <View style={s.metricCol}>
                  <View style={s.metricHead}>
                    <Ionicons name="trending-up-outline" size={12} color="#9CA3AF" />
                    <Text style={[s.metricLabel, T && { fontSize: 13 }]}>Expected harvest</Text>
                  </View>
                  <Text style={s.metricVal}>
                    {rec.variety.avgYield}<Text style={s.metricUnit}> t/ha</Text>
                  </Text>
                </View>
                <View style={s.metricSep} />
                <View style={s.metricCol}>
                  <View style={s.metricHead}>
                    <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                    <Text style={[s.metricLabel, T && { fontSize: 13 }]}>To harvest</Text>
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

              {/* Farm-specific fit — built from this farm's real RSI factor scores */}
              {rec.fitExplanation ? (
                <View style={s.fitBox}>
                  <View style={s.fitHead}>
                    <Ionicons name="sparkles-outline" size={12} color="#059669" />
                    <Text style={s.fitHeadText}>Why it fits your farm</Text>
                  </View>
                  <Text style={[s.fitText, T && { fontSize: 14, lineHeight: 20 }]}>{rec.fitExplanation}</Text>
                </View>
              ) : null}

              {/* About the variety — grounded narrative (same for every farm) */}
              {rec.description ? (
                <Text style={[s.aboutText, T && { fontSize: 14, lineHeight: 20 }]}>{rec.description}</Text>
              ) : null}

              <TouchableOpacity
                style={[s.saveBtn, !isTop && s.saveBtnGhost]}
                onPress={() => handleDetail(rec)}
                activeOpacity={0.85}
              >
                <Text style={[s.saveBtnText, !isTop && s.saveBtnTextGhost]}>
                  {isTop ? 'Use this variety' : 'Use this instead'}
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
            // Just the code ("S1"): the full names did not fit; the key below the table names them
            { label: 'Class',       values: ranked.map(r => suitabilityCode(r.suitabilityClass) || '—') },
            { label: 'Days',        values: ranked.map(r => `${r.variety.maturityDays}`) },
            { label: 'Harvest (t/ha)',values: ranked.map(r => `${r.variety.avgYield}`) },
            { label: 'Flood tol.',  values: ranked.map(r => tolLabel(r.variety.floodTolerance)) },
            { label: 'Drought tol.',values: ranked.map(r => tolLabel(r.variety.droughtTolerance)) },
          ].map((row, i, arr) => (
            <View key={row.label} style={[s.tRow, i < arr.length - 1 && s.tRowDivider]}>
              <View style={{ flex: 1.3, justifyContent: 'center', paddingLeft: 14 }}>
                <Text style={s.tLabel}>{row.label}</Text>
              </View>
              {row.values.map((val, vi) => (
                <View key={vi} style={s.tCell}>
                  <Text style={[s.tVal, vi === 0 && s.tValTop, { textAlign: 'center' }]}>{val}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        {!!suitabilityLegend(ranked.map(r => r.suitabilityClass)) && (
          <Text style={s.tLegend}>{suitabilityLegend(ranked.map(r => r.suitabilityClass))}</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  soilNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, backgroundColor: '#FEF3DC', borderRadius: 16, padding: 12 },
  soilNoticeText: { flex: 1, fontSize: 12, color: '#7C2D12', lineHeight: 17 },
  failBox:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  failTitle:   { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
  failBody:    { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },
  failBtn: { marginTop: 8, backgroundColor: '#111827', borderRadius: 20, height: 52, paddingHorizontal: 26, justifyContent: 'center' },
  failBtnText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  root: { flex: 1, backgroundColor: '#F1F2F1' },

  /* Header — same as Login / Register / FarmSetup / etc. */

  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

  /* Field suitability card — flat white */
  fieldCard: { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2, padding: 20, marginBottom: 18 },
  fieldLead: { fontSize: 14, color: '#111827', marginBottom: 6, fontFamily: 'Inter_600SemiBold' },
  fieldVerdict: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 14 },
  fieldClass: { fontSize: 28, color: '#059669', letterSpacing: -0.6, lineHeight: 34, fontFamily: 'Inter_700Bold' },

  fieldScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  fieldScore: { fontSize: 30, color: '#111827', letterSpacing: -0.8, fontFamily: 'Inter_700Bold' },
  fieldScoreUnit: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  fieldScoreNote: { fontSize: 12, color: '#6B7280', marginTop: 2, fontFamily: 'Inter_500Medium' },

  /* Score bar — thin track + green fill (visual rhythm without a chart) */
  scoreBarWrap:  { flex: 1.4 },
  scoreBarTrack: { height: 10, borderRadius: 5, backgroundColor: '#F1F2F1', overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: 5, backgroundColor: '#059669' },

  evidenceList: { backgroundColor: '#F1F2F1', borderRadius: 18, paddingHorizontal: 14, marginBottom: 14 },
  evidenceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11,
  },
  evidenceRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  evidenceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' },
  evidenceLabel: { flex: 1, fontSize: 13, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  evidenceValue: { fontSize: 13, color: '#111827', fontFamily: 'Inter_700Bold' },

  fieldNote: { fontSize: 12, color: '#6B7280', lineHeight: 18 },

  /* Section heading — sentence case bold, same as elsewhere */
  listHeading: { fontSize: 18, color: '#111827', marginBottom: 12, marginTop: 6, paddingHorizontal: 4, fontFamily: 'Inter_700Bold' },

  /* Variety card */
  varCard: { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2, padding: 18, marginBottom: 12 },
  /* Top card — green-tinted border + barely-there mint wash for elevation without weight */
  varCardTop: { borderWidth: 2, borderColor: '#059669' },

  varHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },

  /* Soft rank chip — light gray normally, soft green on the top one */
  rankChip: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F1F2F1', justifyContent: 'center', alignItems: 'center' },
  rankChipTop: { backgroundColor: '#111827' },
  rankChipText: { fontSize: 15, color: '#111827', fontFamily: 'Inter_700Bold' },
  rankChipTextTop: { color: '#FFFFFF' },

  varName: { flexShrink: 1, fontSize: 17, color: '#111827', letterSpacing: -0.2, fontFamily: 'Inter_700Bold' },

  /* Recommended badge — icon only, no label */
  recommendedBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },

  metricRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  metricCol: { flex: 1, backgroundColor: '#F1F2F1', borderRadius: 16, padding: 12 },
  metricHead:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metricSep: { width: 0 },
  metricVal: { fontSize: 22, color: '#111827', letterSpacing: -0.5, fontFamily: 'Inter_700Bold' },
  metricUnit: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  metricLabel: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },

  /* Tolerance meter block — replaces plain "Flood: Low" text */
  tolBlock: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F2F1', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12 },
  tolDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: '#E5E7EB' },

  /* Farm-fit callout — soft green, since it's the personalized bit */
  fitBox: { backgroundColor: '#E8F5EF', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 },
  fitHead:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  fitHeadText: { fontSize: 12, color: '#065F46', fontFamily: 'Inter_700Bold' },
  fitText: { fontSize: 13, color: '#065F46', lineHeight: 19 },

  /* About-the-variety prose */
  aboutText: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 14 },

  /* Variety name with leading leaf icon */
  varNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },

  /* Buttons — same vocabulary as elsewhere */
  saveBtn: { height: 52, borderRadius: 18, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  saveBtnGhost: { backgroundColor: '#F1F2F1' },
  saveBtnTextGhost: { color: '#111827', fontFamily: 'Inter_600SemiBold' },

  /* Comparison table */
  table: { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2, overflow: 'hidden', marginTop: 2, marginBottom: 16 },
  tHead: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    paddingVertical: 10,
  },
  tHeadCell: { flex: 1, alignItems: 'center', gap: 2 },
  tHeadRank: { fontSize: 11, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  tHeadName: { fontSize: 12, color: '#111827', fontFamily: 'Inter_700Bold' },

  tRow: { flexDirection: 'row', paddingVertical: 12 },
  tLegend: { fontSize: 12, color: '#6B7280', lineHeight: 17, marginTop: 8, paddingHorizontal: 6, fontFamily: 'Inter_500Medium' },
  tRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  tLabel: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  tCell:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tVal: { fontSize: 12, color: '#374151', fontFamily: 'Inter_600SemiBold' },
  tValTop: { color: '#059669', fontFamily: 'Inter_700Bold' },
});
