import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, Image,
} from 'react-native';
import { empty } from '@/assets/illustrations';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiProgress } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { Skeleton } from '@/components/Skeleton';
import { useTranslation } from '@/i18n/useTranslation';
import { seasonLabel } from '@/utils/formatting';

type Nav = StackNavigationProp<any>;

type RangeKey = 'current' | 'last3' | 'all';

interface HarvestRow {
  id:          string;
  farmName:    string;
  season:      string;
  datePlanted: string;
  yieldValue:  string;
  varietyName: string;
  badge:       string;
  badgeStatus: 'success' | 'warning';
  kg:          number;   // dry palay kg in this harvest
}

// Last report per farm in this app session: reopening Reports shows it at once and
// refreshes quietly. Keyed by farm id, which belongs to one farmer only.
const lastReport = new Map<number | undefined, { history: HarvestRow[]; totalYield: string; cyclesCount: number }>();

export const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tr = useTranslation();

  const { farms, activeCycle } = useAppStore();
  const selectedFarm = useSelectedFarm();
  const selectedFarmId = selectedFarm?.id;
  const known = lastReport.get(selectedFarmId);
  const [harvestHistory, setHarvestHistory] = useState<HarvestRow[]>(known?.history ?? []);
  const [totalYield,     setTotalYield]     = useState<string>(known?.totalYield ?? '—');
  const [cyclesCount,    setCyclesCount]    = useState(known?.cyclesCount ?? 0);
  const [loadingHistory, setLoadingHistory] = useState(!known);
  const [activeRange,    setActiveRange]    = useState<RangeKey>('current');

  const RANGES: { key: RangeKey; label: string }[] = [
    { key: 'current', label: tr.reportsRangeCurrent },
    { key: 'last3',   label: tr.reportsRangeLast3   },
    { key: 'all',     label: tr.reportsRangeAll     },
  ];

  const farmsCount = farms.length;
  const headerFarm = (selectedFarm as any)?.name ?? '—';
  const headerSub  = activeCycle
    ? `${headerFarm} · ${seasonLabel(activeCycle)}`
    : `${headerFarm} · ${tr.reportsNoCycle}`;

  useEffect(() => {
    const load = async () => {
      try {
        const farmId    = selectedFarmId;
        const cyclesRes = await apiProgress.listCycles(farmId);
        const cycles    = (cyclesRes.data as any[]) ?? [];

        // All seasons at once, not one after another: the wait no longer grows per season
        const yields = await Promise.all(cycles.map(cycle =>
          apiProgress.getYield(cycle.id).then(res => res.data).catch(() => null),   // null: no yield record yet
        ));
        const history: HarvestRow[] = [];
        let totalKg = 0;
        cycles.forEach((cycle, i) => {
          const yr = yields[i];
          if (!yr) return;
          const netKg     = yr.net_yield_kg ?? 0;
          const areaHa    = yr.area_harvested_ha ?? 1;
          const yieldTHa  = (netKg / 1000 / areaHa).toFixed(2);
          totalKg += netKg;

          const isExcellent = parseFloat(yieldTHa) >= 5;
          history.push({
            id:          String(cycle.id),
            farmName:    farms.find((f: any) => f.id === cycle.farm)?.name ?? '—',
            season:      seasonLabel(cycle) || '—',
            datePlanted: cycle.planting_date ?? '—',
            yieldValue:  yieldTHa,
            varietyName: cycle.variety_name ?? '—',
            badge:       isExcellent ? tr.reportsBadgeExcellent : tr.reportsBadgeGood,
            badgeStatus: isExcellent ? 'success' : 'warning',
            kg:          netKg,
          });
        });

        history.reverse();
        // A farm with no harvests shows a dash, not the previous farm's total
        const total = history.length > 0 ? `${(totalKg / 1000).toFixed(1)} T` : '—';
        lastReport.set(farmId, { history, totalYield: total, cyclesCount: cycles.length });
        setCyclesCount(cycles.length);
        setHarvestHistory(history);
        setTotalYield(total);
      } catch {
        setHarvestHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    const saved = lastReport.get(selectedFarmId);
    if (saved) {
      setHarvestHistory(saved.history);
      setTotalYield(saved.totalYield);
      setCyclesCount(saved.cyclesCount);
    }
    setLoadingHistory(!saved);
    load();
  }, [selectedFarmId]);


  // Filter harvest history by the active date-range chip
  const filteredHistory = useMemo(() => {
    if (activeRange === 'all')   return harvestHistory;
    if (activeRange === 'last3') return harvestHistory.slice(-3);
    return harvestHistory.slice(-1);
  }, [activeRange, harvestHistory]);

  // The summary follows the range chips
  const rangeTHa  = filteredHistory.map(h => parseFloat(h.yieldValue) || 0);
  const rangeTons = filteredHistory.reduce((a, h) => a + (h.kg || 0), 0) / 1000;
  const avgTHa    = rangeTHa.length ? rangeTHa.reduce((a, b) => a + b, 0) / rangeTHa.length : null;
  const bestTHa   = rangeTHa.length ? Math.max(...rangeTHa) : null;

  // Bar chart — only built from real harvests. Empty state shown when none.
  const chartBars = useMemo(() => {
    if (harvestHistory.length === 0) return [];
    return harvestHistory.slice(-5).map((h, i, arr) => ({
      label:    h.season.replace('Dry ', 'D').replace('Wet ', 'W').replace('20', "'"),
      value:    parseFloat(h.yieldValue) || 0,
      isLatest: i === arr.length - 1,
    }));
  }, [harvestHistory]);
  const chartMax = useMemo(() => {
    const m = Math.max(...chartBars.map(b => b.value), 1);
    return Math.ceil(m * 1.1);
  }, [chartBars]);

  // Variety performance derived from real harvest history
  const varietyPerf = useMemo(() => {
    if (harvestHistory.length === 0) return [];
    const byVariety: Record<string, number[]> = {};
    harvestHistory.forEach(h => {
      const v = h.varietyName;
      const y = parseFloat(h.yieldValue) || 0;
      (byVariety[v] ||= []).push(y);
    });
    const rows = Object.entries(byVariety).map(([name, yields]) => {
      const avg = yields.reduce((a, b) => a + b, 0) / yields.length;
      return { name, pct: 0, yield: `${avg.toFixed(1)} T/ha`, avg };
    });
    const maxAvg = Math.max(...rows.map(r => r.avg), 0.1);
    return rows
      .map(r => ({ ...r, pct: Math.round((r.avg / maxAvg) * 100) }))
      .sort((a, b) => b.pct - a.pct);
  }, [harvestHistory]);

  // ── Download / share ────────────────────────────────────────────────────────
  const handleDownload = async () => {
    try {
      const lines: string[] = [];
      lines.push(`${tr.reportsTitle}`);
      lines.push(headerSub);
      lines.push('');
      lines.push(`${tr.reportsSummary}`);
      lines.push(`  ${tr.reportsTotalYield}: ${totalYield}`);
      lines.push(`  ${tr.rpAvgYield}: ${avgTHa != null ? `${avgTHa.toFixed(2)} t/ha` : '—'}`);
      lines.push(`  ${tr.reportsFarms}:      ${farmsCount}`);
      lines.push('');
      lines.push(`${tr.reportsHistoryTitle} (${filteredHistory.length})`);
      if (filteredHistory.length === 0) {
        lines.push(`  ${tr.reportsHistoryEmpty}`);
      } else {
        filteredHistory.forEach(h => {
          lines.push(`  • ${h.farmName} — ${h.season}`);
          lines.push(`      ${tr.reportsPlanted}: ${h.datePlanted}`);
          lines.push(`      ${h.varietyName} → ${h.yieldValue} t/ha (${h.badge})`);
        });
      }
      lines.push('');
      lines.push('— RiceFlow / GeoRice Advisor');

      await Share.share({
        title:   tr.reportsShareSubject,
        message: lines.join('\n'),
      });
    } catch {
      Alert.alert(tr.reportsTitle, tr.reportsShareErr);
    }
  };

  return (
    <SafeAreaView style={s.root}>

      {/* Header — minimal, matches Login / Register */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{tr.reportsTitle}</Text>
          {/* Farm and season */}
          <Text style={s.subtitle} numberOfLines={1}>{headerSub}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Date-range filter chips */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
        >
          {RANGES.map(r => {
            const active = r.key === activeRange;
            return (
              <TouchableOpacity
                key={r.key}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setActiveRange(r.key)}
                activeOpacity={0.8}
              >
                {active && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                <Text style={[s.chipText, active && s.chipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Summary: the harvest in the chosen range, in one big number ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>{tr.reportsTotalYield}</Text>
          {loadingHistory ? (
            <View style={{ marginTop: 8 }}><Skeleton w={120} h={44} br={8} /></View>
          ) : (
            filteredHistory.length ? (
              <View style={s.bigRow}>
                <Text style={s.big}>{rangeTons.toFixed(1)}</Text>
                <Text style={s.bigUnit}>{tr.ovTons}</Text>
              </View>
            ) : (
              <View style={s.pendingPill}>
                <Ionicons name="basket-outline" size={15} color="#6B7280" />
                <Text style={s.pendingText}>{tr.rpNoHarvest}</Text>
              </View>
            )
          )}
          <Text style={s.sub}>{tr.rpHarvests.replace('{n}', String(filteredHistory.length))}</Text>
          <View style={s.tiles}>
            {[
              { lbl: tr.rpAvgYield,   val: avgTHa  != null ? avgTHa.toFixed(1)  : null, unit: avgTHa  != null ? 't/ha' : '' },
              { lbl: tr.rpBestSeason, val: bestTHa != null ? bestTHa.toFixed(1) : null, unit: bestTHa != null ? 't/ha' : '' },
              { lbl: tr.reportsFarms, val: String(farmsCount), unit: '' },
            ].map(t => (
              <View key={t.lbl} style={s.tile}>
                <Text style={s.tileLbl} numberOfLines={2}>{t.lbl}</Text>
                <View style={s.tileValRow}>
                  <Text style={t.val == null ? s.tileNone : s.tileVal}>{t.val ?? tr.ovNotYet}</Text>
                  {!!t.unit && <Text style={s.tileUnit}>{t.unit}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Yield per season: dark bars, the newest in green ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>{tr.reportsYieldPerSeason}</Text>
          <Text style={[s.sub, { marginTop: 4 }]}>{tr.reportsTonsPerHa}</Text>
          {loadingHistory ? (
            <View style={s.bars}>
              {[0, 1, 2, 3].map(i => <Skeleton key={i} w={26} h={50 + (i % 3) * 25} br={13} />)}
            </View>
          ) : chartBars.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIcon}><Ionicons name="bar-chart-outline" size={24} color="#059669" /></View>
              <Text style={s.emptyTitle}>{tr.reportsNoDataChart}</Text>
              <Text style={s.emptyHint}>{tr.reportsHistoryHint}</Text>
            </View>
          ) : (
            <View style={s.bars}>
              {chartBars.map((b, idx) => (
                <View key={idx} style={s.barWrap}>
                  <Text style={[s.barVal, b.isLatest && { color: '#059669' }]}>{b.value.toFixed(1)}</Text>
                  <View style={[s.bar, {
                    height: Math.max(8, Math.round((b.value / chartMax) * 120)),
                    backgroundColor: b.isLatest ? '#059669' : '#111827',
                  }]} />
                  <Text style={[s.barLbl, b.isLatest && { color: '#059669' }]} numberOfLines={1}>{b.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Which variety did best ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>{tr.reportsVarietyPerf}</Text>
          {loadingHistory ? (
            <View style={{ gap: 12, marginTop: 14 }}>
              {[0, 1].map(i => <Skeleton key={i} w="100%" h={44} br={14} />)}
            </View>
          ) : varietyPerf.length === 0 ? (
            <View style={s.emptyBox}>
              <View style={s.emptyIcon}><Ionicons name="leaf-outline" size={24} color="#059669" /></View>
              <Text style={s.emptyTitle}>{tr.reportsNoVariety}</Text>
              <Text style={s.emptyHint}>{tr.reportsHistoryHint}</Text>
            </View>
          ) : (
            varietyPerf.map((v, idx) => (
              <View key={v.name} style={s.varietyRow}>
                <View style={[s.rankTile, idx === 0 && s.rankTileTop]}>
                  <Text style={[s.rankText, idx === 0 && { color: '#FFFFFF' }]}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.rowBetween}>
                    <Text style={s.varietyName} numberOfLines={1}>{v.name}</Text>
                    <Text style={s.varietyYield}>{v.yield}</Text>
                  </View>
                  <View style={s.varietyTrack}>
                    <View style={[s.varietyFill, { width: `${v.pct}%` as any, backgroundColor: idx === 0 ? '#059669' : '#111827' }]} />
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Every harvest in the range ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>{tr.reportsHistoryTitle}</Text>
          {filteredHistory.length === 0 ? (
            <View style={s.emptyBox}>
              <Image source={empty.no_harvest} style={{ width: 110, height: 110, marginBottom: 6 }} resizeMode="contain" />
              <Text style={s.emptyTitle}>{harvestHistory.length === 0 ? tr.reportsHistoryEmpty : tr.reportsRangeEmpty}</Text>
              <Text style={s.emptyHint}>{harvestHistory.length === 0 ? tr.reportsHistoryHint : tr.reportsRangeHint}</Text>
            </View>
          ) : (
            [...filteredHistory].reverse().map((h, i) => (
              <TouchableOpacity
                key={h.id}
                style={[s.historyRow, i > 0 && s.rowBorder]}
                onPress={() => navigation.navigateDeprecated('YieldProgress')}
                activeOpacity={0.85}
              >
                <View style={s.historyIcon}>
                  <Ionicons name="basket-outline" size={20} color="#B45309" />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.historyFarm} numberOfLines={1}>{h.season}</Text>
                  <Text style={s.historySeason} numberOfLines={1}>{h.farmName} · {h.varietyName}</Text>
                  <Text style={s.historyDate}>{tr.reportsPlanted}: {h.datePlanted}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={s.historyYield}>{h.yieldValue}<Text style={s.historyYieldUnit}> t/ha</Text></Text>
                  <View style={[s.badgeChip, { backgroundColor: h.badgeStatus === 'success' ? '#E8F5EF' : '#FEF3DC' }]}>
                    <Text style={[s.badgeChipText, { color: h.badgeStatus === 'success' ? '#047857' : '#B45309' }]}>{h.badge}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Download button — opens the native share sheet with a multilingual summary */}
        <TouchableOpacity
          style={[s.downloadBtn, (loadingHistory) && { opacity: 0.5 }]}
          activeOpacity={0.85}
          onPress={handleDownload}
          disabled={loadingHistory}
        >
          <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          <Text style={s.downloadText}>{tr.reportsDownload}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F2F1' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 21, color: '#111827', letterSpacing: -0.4, fontFamily: 'Inter_700Bold' },

  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 150 },   // room for the floating tab bar

  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 1, fontFamily: 'Inter_500Medium' },

  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 4, marginBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#FFFFFF', minHeight: 42 },
  chipActive: { backgroundColor: '#111827' },
  chipText: { fontSize: 13, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  chipTextActive: { color: '#FFFFFF' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, color: '#111827', fontFamily: 'Inter_700Bold' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: -6, marginBottom: 12, fontFamily: 'Inter_500Medium' },

  /* Summary */
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 4 },
  summaryCell: { flex: 1 },
  summaryVal: { fontSize: 26, color: '#111827', letterSpacing: -0.6, fontFamily: 'Inter_700Bold' },
  summaryLbl: { fontSize: 12, color: '#6B7280', marginTop: 4, fontFamily: 'Inter_500Medium' },
  summarySep: { width: 0 },

  /* Chart */
  chartBox: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', height: 170, paddingTop: 6,
  },
  barWrap: { alignItems: 'center', justifyContent: 'flex-end', flex: 1, maxWidth: 64 },
  barVal: { fontSize: 12, color: '#111827', marginBottom: 6, fontFamily: 'Inter_700Bold' },
  bar: { width: 26, borderRadius: 13 },
  barLbl: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 14, fontFamily: 'Inter_500Medium' },

  /* Variety perf */
  varietyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  varietyName: { fontSize: 14, color: '#111827', fontFamily: 'Inter_700Bold' },
  varietyProg:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  varietyTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F2F1', overflow: 'hidden', marginTop: 8 },
  varietyFill: { height: '100%', borderRadius: 5 },
  varietyPct: { fontSize: 13, minWidth: 42, textAlign: 'right', fontFamily: 'Inter_700Bold' },
  varietyYield: { fontSize: 13, color: '#111827', fontFamily: 'Inter_700Bold' },

  /* History list */
  sectionTitle: { fontSize: 17, color: '#111827', marginBottom: 10, marginTop: 10, paddingHorizontal: 4, fontFamily: 'Inter_700Bold' },
  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  historyIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FEF3DC', justifyContent: 'center', alignItems: 'center' },
  historyFarm: { fontSize: 15, color: '#111827', fontFamily: 'Inter_700Bold' },
  historySeason: { fontSize: 13, color: '#374151', fontFamily: 'Inter_500Medium' },
  historyDate: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  historyChipRow:{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  varietyChip: { backgroundColor: '#F1F2F1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  varietyChipText: { fontSize: 11, color: '#374151', fontFamily: 'Inter_600SemiBold' },
  badgeChip: { borderRadius: 8, borderWidth: 0, paddingHorizontal: 8, paddingVertical: 4 },
  badgeChipText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  historyYield: { fontSize: 18, color: '#111827', letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  historyYieldUnit: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },

  /* Empty state */
  emptyBox: { alignItems: 'center', paddingVertical: 18 },
  emptyTitle: { fontSize: 14, color: '#111827', marginTop: 10, fontFamily: 'Inter_600SemiBold' },
  emptyHint: { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center', paddingHorizontal: 12, lineHeight: 17 },

  /* New look: big number, tiles, bars, rank tiles */
  cardLabel:  { fontSize: 14, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  sub:        { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  bigRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 6 },
  big:        { fontSize: 48, lineHeight: 54, color: '#111827', fontFamily: 'Inter_700Bold', letterSpacing: -1.5 },
  bigUnit:    { fontSize: 16, color: '#6B7280', fontFamily: 'Inter_600SemiBold', marginBottom: 9 },
  tiles:      { flexDirection: 'row', gap: 8, marginTop: 16 },
  tile:       { flex: 1, backgroundColor: '#F1F2F1', borderRadius: 18, padding: 12, minHeight: 92, justifyContent: 'space-between' },
  tileLbl:    { fontSize: 12, color: '#374151', fontFamily: 'Inter_600SemiBold' },
  tileValRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  tileVal:    { fontSize: 20, color: '#111827', fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  tileNone:   { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  pendingPill:{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, marginBottom: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F1F2F1' },
  pendingText:{ fontSize: 15, color: '#374151', fontFamily: 'Inter_600SemiBold' },
  tileUnit:   { fontSize: 11, color: '#6B7280', fontFamily: 'Inter_600SemiBold', marginLeft: 3, marginBottom: 3 },
  bars:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', minHeight: 170, marginTop: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rankTile:   { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F1F2F1', justifyContent: 'center', alignItems: 'center' },
  rankTileTop:{ backgroundColor: '#111827' },
  rankText:   { fontSize: 15, color: '#111827', fontFamily: 'Inter_700Bold' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  emptyIcon:  { width: 56, height: 56, borderRadius: 18, backgroundColor: '#E8F5EF', justifyContent: 'center', alignItems: 'center' },

  /* Download */
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 18, backgroundColor: '#111827', marginTop: 14 },
  downloadText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});
