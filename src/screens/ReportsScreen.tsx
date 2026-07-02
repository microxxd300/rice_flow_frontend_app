import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiProgress } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { Skeleton } from '@/components/Skeleton';
import { useTranslation } from '@/i18n/useTranslation';

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
}

export const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tr = useTranslation();

  const { farms, activeCycle, latestRecommendation } = useAppStore();
  const selectedFarm = useSelectedFarm();
  const selectedFarmId = selectedFarm?.id;
  const [harvestHistory, setHarvestHistory] = useState<HarvestRow[]>([]);
  const [totalYield,     setTotalYield]     = useState<string>('—');
  const [cyclesCount,    setCyclesCount]    = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeRange,    setActiveRange]    = useState<RangeKey>('current');

  const RANGES: { key: RangeKey; label: string }[] = [
    { key: 'current', label: tr.reportsRangeCurrent },
    { key: 'last3',   label: tr.reportsRangeLast3   },
    { key: 'all',     label: tr.reportsRangeAll     },
  ];

  const farmsCount = farms.length;
  const headerFarm = (selectedFarm as any)?.name ?? '—';
  const headerSub  = activeCycle
    ? `${headerFarm} · ${activeCycle.season ?? ''} ${activeCycle.year ?? ''}`.trim()
    : `${headerFarm} · ${tr.reportsNoCycle}`;

  useEffect(() => {
    const load = async () => {
      try {
        const farmId    = selectedFarmId;
        const cyclesRes = await apiProgress.listCycles(farmId);
        const cycles    = (cyclesRes.data as any[]) ?? [];
        setCyclesCount(cycles.length);

        const history: HarvestRow[] = [];
        let totalKg = 0;

        for (const cycle of cycles) {
          try {
            const yieldRes  = await apiProgress.getYield(cycle.id);
            const yr        = yieldRes.data;
            const netKg     = yr.net_yield_kg ?? 0;
            const areaHa    = yr.area_harvested_ha ?? 1;
            const yieldTHa  = (netKg / 1000 / areaHa).toFixed(2);
            totalKg += netKg;

            const isExcellent = parseFloat(yieldTHa) >= 5;
            history.push({
              id:          String(cycle.id),
              farmName:    farms.find((f: any) => f.id === cycle.farm)?.name ?? '—',
              season:      `${cycle.season ?? ''} ${cycle.year ?? ''}`.trim() || '—',
              datePlanted: cycle.planting_date ?? '—',
              yieldValue:  yieldTHa,
              varietyName: cycle.variety_name ?? '—',
              badge:       isExcellent ? tr.reportsBadgeExcellent : tr.reportsBadgeGood,
              badgeStatus: isExcellent ? 'success' : 'warning',
            });
          } catch { /* this cycle has no yield record yet */ }
        }

        setHarvestHistory(history);
        if (history.length > 0) setTotalYield(`${(totalKg / 1000).toFixed(1)} T`);
      } catch {
        setHarvestHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    setLoadingHistory(true);
    load();
  }, [selectedFarmId]);

  // Real RSI from the latest recommendation top result; honest dash when absent
  const realRsi = (latestRecommendation as any)?.results?.[0]?.rsi_score;
  const avgRSI  = realRsi != null ? Math.round(realRsi).toString() : '—';

  // Filter harvest history by the active date-range chip
  const filteredHistory = useMemo(() => {
    if (activeRange === 'all')   return harvestHistory;
    if (activeRange === 'last3') return harvestHistory.slice(-3);
    return harvestHistory.slice(-1);
  }, [activeRange, harvestHistory]);

  // Bar chart — only built from real harvests. Empty state shown when none.
  const chartBars = useMemo(() => {
    if (harvestHistory.length === 0) return [];
    return harvestHistory.slice(-5).map((h, i, arr) => ({
      label:    h.season.replace(' Season', '\n'),
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
      lines.push(`  ${tr.reportsAvgRsi}:     ${avgRSI}`);
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
        <Text style={s.headerTitle}>{tr.reportsTitle}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Subtitle line — farm + cycle */}
        <Text style={s.subtitle}>{headerSub}</Text>

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
                {active && <Ionicons name="checkmark" size={13} color="#059669" />}
                <Text style={[s.chipText, active && s.chipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Summary card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="stats-chart-outline" size={16} color="#059669" />
            <Text style={s.cardTitle}>{tr.reportsSummary}</Text>
          </View>
          <View style={s.summaryRow}>
            <View style={s.summaryCell}>
              {loadingHistory
                ? <Skeleton w={60} h={22} br={5} />
                : <Text style={s.summaryVal}>{totalYield}</Text>
              }
              <Text style={s.summaryLbl}>{tr.reportsTotalYield}</Text>
            </View>
            <View style={s.summarySep} />
            <View style={s.summaryCell}>
              {loadingHistory
                ? <Skeleton w={40} h={22} br={5} />
                : <Text style={s.summaryVal}>{avgRSI}</Text>
              }
              <Text style={s.summaryLbl}>{tr.reportsAvgRsi}</Text>
            </View>
            <View style={s.summarySep} />
            <View style={s.summaryCell}>
              {loadingHistory
                ? <Skeleton w={28} h={22} br={5} />
                : <Text style={s.summaryVal}>{farmsCount}</Text>
              }
              <Text style={s.summaryLbl}>{tr.reportsFarms}</Text>
            </View>
          </View>
        </View>

        {/* Yield Trend chart */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="bar-chart-outline" size={16} color="#059669" />
            <Text style={s.cardTitle}>{tr.reportsYieldPerSeason}</Text>
          </View>
          <Text style={s.cardSubtitle}>{tr.reportsTonsPerHa}</Text>

          {loadingHistory ? (
            <View style={s.chartBox}>
              {[0, 1, 2, 3, 4].map(i => (
                <View key={i} style={s.barWrap}>
                  <Skeleton w={26} h={11} br={3} style={{ marginBottom: 4 }} />
                  <Skeleton w={32} h={60 + (i % 3) * 20} br={5} />
                  <Skeleton w={32} h={9} br={3} style={{ marginTop: 6 }} />
                </View>
              ))}
            </View>
          ) : chartBars.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="bar-chart-outline" size={28} color="#D1D5DB" />
              <Text style={s.emptyTitle}>{tr.reportsNoDataChart}</Text>
              <Text style={s.emptyHint}>{tr.reportsHistoryHint}</Text>
            </View>
          ) : (
            <View style={s.chartBox}>
              {chartBars.map((b, idx) => {
                const h = Math.max(8, Math.round((b.value / chartMax) * 120));
                return (
                  <View key={idx} style={s.barWrap}>
                    <Text style={[s.barVal, b.isLatest && { color: '#059669' }]}>{b.value.toFixed(1)}</Text>
                    <View style={[s.bar, { height: h, backgroundColor: b.isLatest ? '#059669' : '#D1D5DB' }]} />
                    <Text style={[s.barLbl, b.isLatest && { color: '#059669', fontWeight: '700' }]}>
                      {b.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Variety Performance */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="leaf-outline" size={16} color="#059669" />
            <Text style={s.cardTitle}>{tr.reportsVarietyPerf}</Text>
          </View>

          {loadingHistory ? (
            <View style={{ gap: 12, marginTop: 6 }}>
              {[0, 1].map(i => (
                <View key={i} style={{ gap: 6 }}>
                  <Skeleton w={120} h={12} br={3} />
                  <Skeleton w="100%" h={4} br={2} />
                </View>
              ))}
            </View>
          ) : varietyPerf.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="leaf-outline" size={28} color="#D1D5DB" />
              <Text style={s.emptyTitle}>{tr.reportsNoVariety}</Text>
              <Text style={s.emptyHint}>{tr.reportsHistoryHint}</Text>
            </View>
          ) : (
            varietyPerf.map((v, idx, arr) => (
              <View key={v.name} style={[s.varietyRow, idx < arr.length - 1 && s.rowBorder]}>
                <Text style={s.varietyName}>{v.name}</Text>
                <View style={s.varietyProg}>
                  <View style={s.varietyTrack}>
                    <View style={[s.varietyFill, {
                      width: `${v.pct}%` as any,
                      backgroundColor: idx === 0 ? '#059669' : '#9CA3AF',
                    }]} />
                  </View>
                  <Text style={[s.varietyPct, { color: idx === 0 ? '#059669' : '#6B7280' }]}>{v.pct}%</Text>
                </View>
                <Text style={s.varietyYield}>{v.yield}</Text>
              </View>
            ))
          )}
        </View>

        {/* Harvest History — filtered by date range chip */}
        <Text style={[s.sectionTitle, { marginTop: 4 }]}>{tr.reportsHistoryTitle}</Text>

        {filteredHistory.length === 0 ? (
          <View style={[s.card, { alignItems: 'center', paddingVertical: 24 }]}>
            <Ionicons name="basket-outline" size={28} color="#D1D5DB" />
            <Text style={s.emptyTitle}>
              {harvestHistory.length === 0 ? tr.reportsHistoryEmpty : tr.reportsRangeEmpty}
            </Text>
            <Text style={s.emptyHint}>
              {harvestHistory.length === 0 ? tr.reportsHistoryHint : tr.reportsRangeHint}
            </Text>
          </View>
        ) : (
          filteredHistory.map(h => (
            <TouchableOpacity
              key={h.id}
              style={s.historyCard}
              onPress={() => navigation.navigate('YieldProgress')}
              activeOpacity={0.85}
            >
              <View style={s.historyIcon}>
                <Ionicons name="basket-outline" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.historyFarm}>{h.farmName}</Text>
                <Text style={s.historySeason}>{h.season}</Text>
                <Text style={s.historyDate}>{tr.reportsPlanted}: {h.datePlanted}</Text>
                <View style={s.historyChipRow}>
                  <View style={s.varietyChip}>
                    <Text style={s.varietyChipText}>{h.varietyName}</Text>
                  </View>
                  <View style={[s.badgeChip, {
                    backgroundColor: h.badgeStatus === 'success' ? '#ECFDF5' : '#FFF7ED',
                    borderColor:     h.badgeStatus === 'success' ? '#D1FAE5' : '#FDE68A',
                  }]}>
                    <Text style={[s.badgeChipText, {
                      color: h.badgeStatus === 'success' ? '#065F46' : '#D97706',
                    }]}>
                      {h.badge}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.historyYield}>{h.yieldValue}</Text>
                <Text style={s.historyYieldUnit}>t/ha</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

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
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  backBtn:     { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },

  scroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },

  subtitle: { fontSize: 12, color: '#6B7280', marginBottom: 14 },

  chipRow: { flexDirection: 'row', gap: 8, paddingRight: 4, marginBottom: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 9999, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB', minHeight: 36,
  },
  chipActive:     { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#065F46' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle:    { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardSubtitle: { fontSize: 11, color: '#9CA3AF', marginTop: -4, marginBottom: 12 },

  /* Summary */
  summaryRow:  { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryVal:  { fontSize: 22, fontWeight: '800', color: '#1F6B3F', letterSpacing: -0.4 },
  summaryLbl:  { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  summarySep:  { width: StyleSheet.hairlineWidth, height: 36, backgroundColor: '#E5E7EB' },

  /* Chart */
  chartBox: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', height: 170, paddingTop: 6,
  },
  barWrap: { alignItems: 'center', justifyContent: 'flex-end', flex: 1 },
  barVal:  { fontSize: 11, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  bar:     { width: 30, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  barLbl:  { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 6, lineHeight: 14 },

  /* Variety perf */
  varietyRow:     { paddingVertical: 12, gap: 6 },
  rowBorder:      { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  varietyName:    { fontSize: 13, fontWeight: '700', color: '#111827' },
  varietyProg:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  varietyTrack:   { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  varietyFill:    { height: '100%', borderRadius: 2 },
  varietyPct:     { fontSize: 12, fontWeight: '700', minWidth: 38, textAlign: 'right' },
  varietyYield:   { fontSize: 12, color: '#6B7280' },

  /* History list */
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10, marginTop: 6 },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  historyIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDE68A',
    justifyContent: 'center', alignItems: 'center',
  },
  historyFarm:   { fontSize: 14, fontWeight: '700', color: '#111827' },
  historySeason: { fontSize: 12, color: '#6B7280' },
  historyDate:   { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  historyChipRow:{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  varietyChip: {
    backgroundColor: '#F9FAFB', borderRadius: 9999, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 10, paddingVertical: 3,
  },
  varietyChipText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  badgeChip: {
    borderRadius: 9999, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeChipText:    { fontSize: 11, fontWeight: '600' },
  historyYield:     { fontSize: 20, fontWeight: '800', color: '#D97706', letterSpacing: -0.5 },
  historyYieldUnit: { fontSize: 11, color: '#9CA3AF' },

  /* Empty state */
  emptyBox:   { alignItems: 'center', paddingVertical: 22 },
  emptyTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 8 },
  emptyHint:  { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'center', paddingHorizontal: 12 },

  /* Download */
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 12,
    backgroundColor: '#059669', marginTop: 18,
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  downloadText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});
