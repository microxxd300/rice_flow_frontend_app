import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Text as SvgText, Line } from 'react-native-svg';
import { mockSeasonalYields } from '../data/mockData';
import { useAccessibility } from '../context/AccessibilityContext';
import { apiProgress } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const MAX_BAR_H = 110;

function barColor(_variety: string, isLatest: boolean) {
  return isLatest ? '#D97706' : '#059669';
}

const buildLine = (pts: { x: number; y: number }[]) => {
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
    d += ` C${cpx},${pts[i - 1].y.toFixed(1)} ${cpx},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
  }
  return d;
};

export const YieldProgressScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isLargeText } = useAccessibility();
  const T = isLargeText;
  const chartW = Dimensions.get('window').width - 80;
  const { farms } = useAppStore();

  const [yields, setYields] = useState(mockSeasonalYields);

  useEffect(() => {
    const load = async () => {
      try {
        const farmId = farms[0]?.id;
        const cyclesRes = await apiProgress.listCycles(farmId);
        const cycles = cyclesRes.data as any[];
        const realYields: typeof mockSeasonalYields = [];
        for (const cycle of cycles) {
          try {
            const yr = await apiProgress.getYield(cycle.id);
            const data = yr.data as any;
            realYields.push({
              season: `${cycle.season} ${cycle.year}`,
              variety: cycle.variety_name ?? 'Uri',
              yieldTons: parseFloat((data.net_yield_kg / 1000).toFixed(2)),
              area: data.area_harvested_ha ?? 1,
              rsi: 8.0,
              bags: Math.round(data.net_yield_kg / 50),
            });
          } catch {}
        }
        if (realYields.length > 0) setYields(realYields);
      } catch {}
    };
    load();
  }, []);

  const AVG_YIELD = useMemo(
    () => parseFloat((yields.reduce((s, y) => s + y.yieldTons, 0) / yields.length).toFixed(1)),
    [yields],
  );
  const MAX_YIELD = useMemo(() => Math.max(...yields.map(y => y.yieldTons)), [yields]);
  const FIRST_YIELD = useMemo(() => yields[0]?.yieldTons ?? 0, [yields]);
  const LAST_YIELD  = useMemo(() => yields[yields.length - 1]?.yieldTons ?? 0, [yields]);
  const GROWTH_PCT  = useMemo(
    () => FIRST_YIELD > 0 ? parseFloat(((LAST_YIELD - FIRST_YIELD) / FIRST_YIELD * 100).toFixed(1)) : 0,
    [FIRST_YIELD, LAST_YIELD],
  );

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={s.titleIcon}>
            <Ionicons name="trending-up-outline" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[s.headerTitle, T && { fontSize: 15 }]}>Progreso ng Ani</Text>
            <Text style={s.headerSub}>Santos Family Farm · 2.5 ha</Text>
          </View>
        </View>
        <NotificationBell color="#059669" size={22} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero stats */}
        <View style={s.heroCard}>
          <View style={s.heroStat}>
            <Text style={[s.heroVal, T && { fontSize: 32 }]}>
              {LAST_YIELD}<Text style={s.heroUnit}>t</Text>
            </Text>
            <Text style={s.heroLabel}>Pinakabagong Ani</Text>
          </View>
          <View style={s.heroDiv} />
          <View style={s.heroStat}>
            <Text style={[s.heroVal, { color: '#D97706' }, T && { fontSize: 32 }]}>
              +{GROWTH_PCT}<Text style={[s.heroUnit, { color: '#D97706' }]}>%</Text>
            </Text>
            <Text style={s.heroLabel}>Paglago mula 2022</Text>
          </View>
          <View style={s.heroDiv} />
          <View style={s.heroStat}>
            <Text style={[s.heroVal, T && { fontSize: 32 }]}>
              {yields.length}
            </Text>
            <Text style={s.heroLabel}>Mga Season</Text>
          </View>
        </View>

        {/* Summary chips */}
        <View style={s.summaryRow}>
          {[
            { icon: 'trophy-outline'      as IoniconsName, label: 'Pinakamataas', value: `${MAX_YIELD} t`,  color: '#D97706' },
            { icon: 'stats-chart-outline' as IoniconsName, label: 'Average',      value: `${AVG_YIELD} t`, color: '#1F6B3F' },
            { icon: 'ribbon-outline'      as IoniconsName, label: 'RSI ngayon',   value: `${yields[yields.length - 1]?.rsi ?? 0}/10`, color: '#2563EB' },
          ].map(c => (
            <View key={c.label} style={s.summaryChip}>
              <Ionicons name={c.icon} size={16} color={c.color} />
              <Text style={[s.summaryVal, { color: c.color }, T && { fontSize: 17 }]}>{c.value}</Text>
              <Text style={[s.summaryLabel, T && { fontSize: 11 }]}>{c.label}</Text>
            </View>
          ))}
        </View>

        {/* Smooth area chart */}
        <Text style={[s.sectionLabel, T && { fontSize: 13 }]}>TREND NG ANI BAWAT SEASON</Text>
        <View style={s.chartCard}>
          {(() => {
            const data = yields;
            const vals = data.map(y => y.yieldTons);
            const labs = data.map(y =>
              y.season.replace('Dry ', 'D').replace('Wet ', 'W').replace('20', "'")
            );

            // Layout constants
            const pad  = { t: 12, b: 30, l: 32, r: 8 };
            const svgH = 160;
            const cW   = chartW - pad.l - pad.r;
            const cH   = svgH - pad.t - pad.b;
            const bY   = pad.t + cH;

            // Scale helpers
            const maxV = Math.max(...vals) + 1.5;
            const minV = Math.min(...vals) - 1;
            const toY  = (v: number) => pad.t + (1 - (v - minV) / (maxV - minV)) * cH;
            const toX  = (i: number) => pad.l + (i / (data.length - 1)) * cW;

            // Points
            const pts  = vals.map((v, i) => ({ x: toX(i), y: toY(v) }));
            const line = buildLine(pts);
            const area = `${line} L${pts[pts.length - 1].x},${bY} L${pts[0].x},${bY} Z`;
            const last = pts[pts.length - 1];
            const avgY = toY(AVG_YIELD);

            // Y-axis grid ticks (3 evenly spaced)
            const yTicks = [
              minV + (maxV - minV) * 0.25,
              minV + (maxV - minV) * 0.5,
              minV + (maxV - minV) * 0.75,
            ].map(v => ({ v: parseFloat(v.toFixed(1)), y: toY(v) }));

            return (
              <Svg width={chartW} height={svgH}>
                <Defs>
                  <LinearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#1F6B3F" stopOpacity={0.20} />
                    <Stop offset="100%" stopColor="#1F6B3F" stopOpacity={0} />
                  </LinearGradient>
                </Defs>

                {/* Y-axis grid lines + labels */}
                {yTicks.map(tick => (
                  <React.Fragment key={tick.v}>
                    <Line x1={pad.l} y1={tick.y} x2={pad.l + cW} y2={tick.y} stroke="#F3F4F6" strokeWidth={1} />
                    <SvgText x={pad.l - 4} y={tick.y + 3.5} textAnchor="end" fontSize={8} fill="#9CA3AF">{tick.v}t</SvgText>
                  </React.Fragment>
                ))}

                {/* Baseline */}
                <Line x1={pad.l} y1={bY} x2={pad.l + cW} y2={bY} stroke="#E5E7EB" strokeWidth={1} />

                {/* Average dashed line */}
                <Line x1={pad.l} y1={avgY} x2={pad.l + cW} y2={avgY} stroke="#FCD34D" strokeWidth={1.5} strokeDasharray="4,3" />
                <SvgText x={pad.l + cW + 2} y={avgY + 3.5} fontSize={7.5} fill="#D97706" fontWeight="bold">avg</SvgText>

                {/* Area fill */}
                <Path d={area} fill="url(#yieldGrad)" />

                {/* Line */}
                <Path d={line} stroke="#1F6B3F" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data dots (all except last) */}
                {pts.slice(0, -1).map((p, i) => (
                  <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#1F6B3F" opacity={0.4} />
                ))}

                {/* Bullseye on latest point */}
                <Circle cx={last.x} cy={last.y} r={10} fill="#D97706" opacity={0.12} />
                <Circle cx={last.x} cy={last.y} r={5}  fill="#FFFFFF" />
                <Circle cx={last.x} cy={last.y} r={3}  fill="#D97706" />

                {/* X-axis labels */}
                {pts.map((p, i) => {
                  const isLast = i === data.length - 1;
                  return (
                    <SvgText
                      key={`x${i}`}
                      x={p.x}
                      y={svgH - 4}
                      textAnchor="middle"
                      fontSize={8.5}
                      fill={isLast ? '#D97706' : '#9CA3AF'}
                      fontWeight={isLast ? 'bold' : 'normal'}
                    >
                      {labs[i]}
                    </SvgText>
                  );
                })}
              </Svg>
            );
          })()}

          {/* Legend */}
          <View style={s.legendRow}>
            {[
              { color: '#D97706', label: 'Pinakabago (latest)' },
              { color: '#059669', label: 'Nakaraang Season'    },
              { color: '#FCD34D', label: `Avg ${AVG_YIELD}t`, dashed: true },
            ].map(l => (
              <View key={l.label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: l.color, borderRadius: l.dashed ? 0 : 2 }]} />
                <Text style={[s.legendLabel, T && { fontSize: 11 }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Per-season records */}
        <Text style={[s.sectionLabel, T && { fontSize: 13 }]}>REKORD BAWAT SEASON</Text>
        <View style={s.seasonList}>
          {[...yields].reverse().map((y, i) => {
            const originalIdx = yields.length - 1 - i;
            const isLatest    = originalIdx === yields.length - 1;
            const prev        = yields[originalIdx - 1];
            const delta       = prev ? parseFloat((y.yieldTons - prev.yieldTons).toFixed(1)) : null;
            const barW        = Math.round((y.yieldTons / MAX_YIELD) * 100);
            const color       = barColor(y.variety, isLatest);
            const isLast      = i === yields.length - 1;

            return (
              <View key={i} style={[s.seasonRow, !isLast && s.seasonRowBorder]}>
                {/* Left: season + variety */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={[s.seasonName, T && { fontSize: 15 }]}>{y.season}</Text>
                    {isLatest && (
                      <View style={s.latestPill}>
                        <Text style={s.latestPillText}>Pinakabago</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.varietyText, T && { fontSize: 11 }]}>{y.variety}</Text>
                  <View style={{ marginTop: 12 }}>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${barW}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>

                {/* Right: yield + sako + delta */}
                <View style={{ alignItems: 'flex-end', marginLeft: 16, gap: 2 }}>
                  <Text style={[s.yieldVal, { color }, T && { fontSize: 20 }]}>
                    {y.yieldTons}<Text style={s.yieldUnit}>t</Text>
                  </Text>
                  <Text style={[s.sakoText, T && { fontSize: 11 }]}>{y.bags} sako · RSI {y.rsi}</Text>
                  {delta !== null && (
                    <View style={[s.deltaBadge, {
                      backgroundColor: delta >= 0 ? '#E8F5E9' : '#FEF2F2',
                      borderColor:     delta >= 0 ? '#A7F3D0' : '#FECACA',
                    }]}>
                      <Ionicons name={delta >= 0 ? 'trending-up' : 'trending-down'} size={11} color={delta >= 0 ? '#059669' : '#DC2626'} />
                      <Text style={[s.deltaText, { color: delta >= 0 ? '#059669' : '#DC2626' }, T && { fontSize: 11 }]}>
                        {delta >= 0 ? '+' : ''}{delta}t
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>



      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAF8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  titleIcon:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  headerBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  bellDot:     { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' },

  scroll: { paddingHorizontal: 24, paddingBottom: 110 },

  heroCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB', marginTop: 20, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  heroStat:  { flex: 1, alignItems: 'center' },
  heroDiv:   { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  heroVal:   { fontSize: 26, fontWeight: '800', color: '#1F6B3F', letterSpacing: -0.5 },
  heroUnit:  { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  heroLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  summaryChip: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12,
    alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#E5E7EB',
  },
  summaryVal:   { fontSize: 15, fontWeight: '700', color: '#1F6B3F', letterSpacing: -0.3 },
  summaryLabel: { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.8, marginTop: 24, marginBottom: 10,
  },

  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
  },
  legendRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6', marginTop: 8,
  },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { fontSize: 11, color: '#6B7280' },

  seasonList: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1,
  },
  seasonRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 18,
  },
  seasonRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  seasonName:  { fontSize: 15, fontWeight: '700', color: '#111827' },
  varietyText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  yieldVal:    { fontSize: 22, fontWeight: '800', color: '#1F6B3F', letterSpacing: -0.5 },
  yieldUnit:   { fontSize: 13, fontWeight: '500', color: '#9CA3AF' },
  sakoText:    { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  latestPill: {
    backgroundColor: '#E8F5E9', borderRadius: 9999, borderWidth: 1, borderColor: '#A7F3D0',
    paddingVertical: 2, paddingHorizontal: 7,
  },
  latestPillText: { fontSize: 9, fontWeight: '700', color: '#1F6B3F' },
  deltaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: 9999, paddingVertical: 3, paddingHorizontal: 7,
  },
  deltaText:   { fontSize: 11, fontWeight: '700' },
  barBg:       { height: 3, backgroundColor: '#E5E7EB', borderRadius: 2 },
  barFill:     { height: 3, borderRadius: 2 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 56, borderRadius: 16,
    backgroundColor: '#1F6B3F', marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.1 },
});
