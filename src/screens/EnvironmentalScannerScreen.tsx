import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '@/i18n/useTranslation';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { useAppStore } from '@/store/appStore';
import {
  apiScan, apiRecommendations,
  type EnvironmentalScan, type Recommendation,
} from '@/services/apiService';

type Nav = StackNavigationProp<any>;
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type FetchState = 'idle' | 'locating' | 'fetching' | 'done';

const FLOOD_COLOR: Record<string, string> = { high: '#EF4444', moderate: '#D97706', low: '#065F46' };
const FLOOD_BG:    Record<string, string> = { high: '#FEF2F2', moderate: '#FFF7ED', low: '#ECFDF5' };

const num = (v: any): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export const EnvironmentalScannerScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tr = useTranslation();
  const [state,     setState]     = useState<FetchState>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [doneSteps, setDoneSteps] = useState<string[]>([]);

  const FETCH_STEPS = [
    { key: 'gps',       label: tr.envScanGps,       icon: 'navigate-outline'      as IoniconsName },
    { key: 'soil',      label: tr.envScanSoil,      icon: 'layers-outline'        as IoniconsName },
    { key: 'weather',   label: tr.envScanWeather,   icon: 'rainy-outline'         as IoniconsName },
    { key: 'elevation', label: tr.envScanElevation, icon: 'trending-up-outline'   as IoniconsName },
    { key: 'flood',     label: tr.envScanFlood,     icon: 'water-outline'         as IoniconsName },
  ];

  const FLOOD_LABEL: Record<string, string> = { high: tr.valHigh, moderate: tr.valModerate, low: tr.valLow };

  // Real farm + real scan data. The scan runs the actual backend pipeline
  // (SoilGrids + Open-Meteo), then generates a real recommendation so the
  // Planting Guide can produce a guide for this farm.
  const farm = useSelectedFarm() as any;
  const setLatestRecommendation = useAppStore(s => s.setLatestRecommendation);
  const storeRec = useAppStore(s => s.latestRecommendation);
  const [scan, setScan]     = useState<EnvironmentalScan | null>(null);
  const [newRec, setNewRec] = useState<Recommendation | null>(null);
  // Just-generated rec wins; otherwise the store's (loaded per selected farm).
  const rec = newRec ?? storeRec;
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // On open (and on farm switch): show the farm's latest existing scan if any.
  const stopStepTimer = () => {
    if (stepTimer.current) { clearInterval(stepTimer.current); stepTimer.current = null; }
  };
  useEffect(() => stopStepTimer, []);

  useEffect(() => {
    let cancelled = false;
    stopStepTimer();
    setScan(null);
    setNewRec(null);
    setState('idle');
    setDoneSteps([]);
    if (!farm?.id) return;
    apiScan.history(farm.id)
      .then(res => {
        if (cancelled) return;
        const latest = (res.data ?? [])[0] ?? null;
        if (latest) { setScan(latest); setState('done'); }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [farm?.id]);

  const handleFetch = async () => {
    if (!farm?.id) return;
    setState('locating');
    setStepIndex(0);
    setDoneSteps([]);

    // Step animation is visual feedback while the real API call runs. It walks
    // through the first steps and parks on the last one until the call returns.
    let i = 0;
    stopStepTimer();
    stepTimer.current = setInterval(() => {
      if (i < FETCH_STEPS.length - 1) {
        setDoneSteps(prev => [...prev, FETCH_STEPS[i].key]);
        i += 1;
        setStepIndex(i);
      }
    }, 900);

    try {
      // 1. Real environmental scan (SoilGrids + Open-Meteo, saved to backend)
      const scanRes = await apiScan.run(farm.id);
      const newScan = scanRes.data;
      setScan(newScan);

      // 2. Real recommendation from that scan (RSI over all varieties). This is
      //    what the Planting Guide needs to generate a guide for this farm.
      const recRes = await apiRecommendations.generate(newScan.id);
      setNewRec(recRes.data);
      setLatestRecommendation(recRes.data);

      stopStepTimer();
      setDoneSteps(FETCH_STEPS.map(st => st.key));
      setState('done');
    } catch (err: any) {
      stopStepTimer();
      setState('idle');
      setDoneSteps([]);
      const msg = err?.response?.data
        ? JSON.stringify(err.response.data)
        : err?.message || 'Network error';
      Alert.alert(tr.envScreenTitle, msg);
    }
  };

  const handleRetry = () => {
    stopStepTimer();
    setState('idle');
    setStepIndex(0);
    setDoneSteps([]);
  };

  const isFetching = state === 'locating' || state === 'fetching';

  const floodKey  = (scan?.flood_risk ?? 'low').toLowerCase();
  const rainMm    = num((scan as any)?.annual_rainfall_mm) ?? num((scan as any)?.seasonal_rainfall_mm);
  const elevM     = num(scan?.elevation_m);
  const soilPh    = num(scan?.soil_ph);
  const scannedAt = (scan as any)?.scanned_at
    ? String((scan as any).scanned_at).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{tr.envScreenTitle}</Text>
          <Text style={s.headerSub}>{tr.envScreenSub}</Text>
        </View>
        {state === 'done' && (
          <TouchableOpacity style={s.retryBtn} onPress={handleRetry} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={15} color="#6B7280" />
            <Text style={s.retryBtnText}>{tr.envRefresh}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* GPS Location Card */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <View style={s.iconBox}>
              <Ionicons name="navigate" size={18} color="#6B7280" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{farm?.name ?? 'GPS Location'}</Text>
              <Text style={s.cardSub}>{farm?.barangay || '—'}</Text>
            </View>
            <View style={[s.statusPill, state === 'done' ? s.pillActive : s.pillIdle]}>
              <View style={[s.dot, { backgroundColor: state === 'done' ? '#22C55E' : '#9CA3AF' }]} />
              <Text style={[s.pillText, { color: state === 'done' ? '#065F46' : '#9CA3AF' }]}>
                {state === 'done' ? tr.envActive : 'Standby'}
              </Text>
            </View>
          </View>
          {(() => {
            const lat = num(farm?.latitude);
            const lng = num(farm?.longitude);
            if (lat == null || lng == null) return null;
            return (
              <View style={s.coordRow}>
                <Ionicons name="location-outline" size={13} color="#D1D5DB" />
                <Text style={s.coordText}>
                  {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
                  {farm?.area_hectares != null ? ` · ${farm.area_hectares} ha` : ''}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Idle state */}
        {state === 'idle' && (
          <View style={s.idleCard}>
            <View style={s.idleIconCircle}>
              <Ionicons name="cloud-download-outline" size={36} color="#6B7280" />
            </View>
            <Text style={s.idleTitle}>{tr.envIdleTitle}</Text>
            <Text style={s.idleSub}>
              {tr.envIdleSub}
            </Text>

            <View style={s.sourceList}>
              {[
                { icon: 'layers-outline'        as IoniconsName, label: 'Soil Data',      source: 'BSWM' },
                { icon: 'rainy-outline'         as IoniconsName, label: 'Rainfall Data',  source: 'PAGASA' },
                { icon: 'trending-up-outline'   as IoniconsName, label: 'Elevation Data', source: 'NAMRIA' },
                { icon: 'water-outline'         as IoniconsName, label: 'Flood Risk',     source: 'MGB' },
              ].map((item, i, arr) => (
                <View key={item.source} style={[s.sourceRow, i < arr.length - 1 && s.sourceRowBorder]}>
                  <View style={s.sourceIconBox}>
                    <Ionicons name={item.icon} size={15} color="#6B7280" />
                  </View>
                  <Text style={s.sourceLabel}>{item.label}</Text>
                  <View style={s.sourceBadge}>
                    <Text style={s.sourceBadgeText}>{item.source}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={s.fetchBtn} onPress={handleFetch} activeOpacity={0.85}>
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
              <Text style={s.fetchBtnText}>{tr.envFetchBtn}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Fetching state */}
        {isFetching && (
          <View style={s.card}>
            <Text style={s.fetchingTitle}>{tr.envFetchingTitle}</Text>
            <Text style={s.fetchingSub}>{tr.envFetchingSub}</Text>
            <View style={s.stepsWrap}>
              {FETCH_STEPS.map((step, i) => {
                const isDone    = doneSteps.includes(step.key);
                const isActive  = i === stepIndex && !isDone;
                return (
                  <View key={step.key} style={s.stepRow}>
                    <View style={[s.stepIcon, isDone && s.stepIconDone, isActive && s.stepIconActive]}>
                      {isDone
                        ? <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                        : <Ionicons name={step.icon} size={13} color={isActive ? '#FFFFFF' : '#D1D5DB'} />
                      }
                    </View>
                    <Text style={[s.stepLabel, (isDone || isActive) && s.stepLabelActive]}>
                      {step.label}
                    </Text>
                    {isActive && <View style={s.spinner} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Done state — real scan values from the backend */}
        {state === 'done' && scan && (
          <>
            {[
              { icon: 'layers-outline'      as IoniconsName, label: tr.envSoilType,    value: scan.soil_texture || '—',                              sub: soilPh != null ? `pH ${soilPh}` : '—',   source: 'SoilGrids' },
              { icon: 'rainy-outline'       as IoniconsName, label: tr.envRainPerYear, value: rainMm != null ? `${Math.round(rainMm).toLocaleString()} mm` : '—', sub: tr.envAnnualAvg,        source: 'Open-Meteo' },
              { icon: 'trending-up-outline' as IoniconsName, label: tr.envElevation,   value: elevM != null ? `${Math.round(elevM)} m` : '—',        sub: tr.envLowland,                            source: 'Open-Meteo' },
            ].map(item => (
              <View key={item.label} style={s.dataCard}>
                <View style={s.dataCardLeft}>
                  <View style={s.dataIconBox}>
                    <Ionicons name={item.icon} size={16} color="#6B7280" />
                  </View>
                  <View>
                    <Text style={s.dataLabel}>{item.label}</Text>
                    <Text style={s.dataSub}>{item.sub}</Text>
                  </View>
                </View>
                <View style={s.dataRight}>
                  <Text style={s.dataValue}>{item.value}</Text>
                  <View style={s.dataSource}>
                    <Text style={s.dataSourceText}>{item.source}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Flood risk card */}
            <View style={[s.dataCard, { backgroundColor: FLOOD_BG[floodKey] ?? '#FFFFFF', borderColor: '#E5E7EB' }]}>
              <View style={s.dataCardLeft}>
                <View style={s.dataIconBox}>
                  <Ionicons name="water-outline" size={16} color="#6B7280" />
                </View>
                <View>
                  <Text style={s.dataLabel}>{tr.envFloodRisk}</Text>
                  <Text style={s.dataSub}>{tr.envFloodBasis}</Text>
                </View>
              </View>
              <View style={s.dataRight}>
                <Text style={[s.dataValue, { color: FLOOD_COLOR[floodKey] ?? '#111827' }]}>
                  {FLOOD_LABEL[floodKey] ?? scan.flood_risk ?? '—'}
                </Text>
                <View style={s.dataSource}>
                  <Text style={s.dataSourceText}>MGB</Text>
                </View>
              </View>
            </View>

            <View style={s.metaCard}>
              <Ionicons name="time-outline" size={13} color="#D1D5DB" />
              <Text style={s.metaText}>{tr.envScannedOn.replace('{date}', scannedAt).replace('{src}', 'SoilGrids · Open-Meteo')}</Text>
            </View>

            {/* CTA — only once a real recommendation exists for this scan */}
            {rec && (
              <TouchableOpacity
                style={s.ctaBtn}
                onPress={() => navigation.navigate('SuitabilityResults', {
                  farmData: {
                    farmName:  farm?.name,
                    barangay:  farm?.barangay,
                    area:      farm?.area_hectares,
                    ecosystem: farm?.ecosystem,
                    latitude:  num(farm?.latitude),
                    longitude: num(farm?.longitude),
                  },
                  recommendationData: rec,
                  scanData: scan,
                })}
                activeOpacity={0.85}
              >
                <Ionicons name="ribbon-outline" size={18} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={s.ctaTitle}>{tr.envViewRecs}</Text>
                  <Text style={s.ctaSub}>{tr.envViewRecsSub}</Text>
                </View>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F7F9F8' },
  scroll: { padding: 24, paddingBottom: 110 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: '#6B7280', marginTop: 1 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F9FAFB', borderRadius: 9999,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 6, paddingHorizontal: 12,
  },
  retryBtnText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, marginBottom: 12,
  },
  cardRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle:{ fontSize: 14, fontWeight: '700', color: '#111827' },
  cardSub:  { fontSize: 12, color: '#6B7280', marginTop: 2 },
  iconBox:  {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },


  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1 },
  pillActive: { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' },
  pillIdle:   { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  pillText:   { fontSize: 11, fontWeight: '700' },
  coordRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  coordText:  { fontSize: 12, color: '#9CA3AF' },

  idleCard: {
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 20, alignItems: 'center', marginBottom: 12,
  },
  idleIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  idleTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  idleSub:   { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  sourceList: { width: '100%', marginBottom: 20 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  sourceRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  sourceIconBox: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  sourceLabel: { flex: 1, fontSize: 13, color: '#111827', fontWeight: '500' },
  sourceBadge: {
    backgroundColor: '#F9FAFB', borderRadius: 9999,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 3, paddingHorizontal: 9,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },

  fetchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#059669', borderRadius: 10,
    height: 56, paddingHorizontal: 20, width: '100%', justifyContent: 'center',
  },
  fetchBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  fetchingTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  fetchingSub:   { fontSize: 12, color: '#6B7280', marginBottom: 16 },
  stepsWrap:     { gap: 12 },
  stepRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepIcon: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  stepIconDone:    { backgroundColor: '#059669', borderColor: '#059669' },
  stepIconActive:  { backgroundColor: '#059669', borderColor: '#059669' },
  stepLabel:       { flex: 1, fontSize: 13, color: '#9CA3AF' },
  stepLabelActive: { color: '#111827', fontWeight: '500' },
  spinner: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: '#E5E7EB', borderTopColor: '#059669',
  },

  dataCard: {
    borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dataCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dataIconBox: {
    width: 36, height: 36, borderRadius: 9,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  dataLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },
  dataSub:   { fontSize: 11, color: '#6B7280', marginTop: 2 },
  dataRight: { alignItems: 'flex-end', gap: 4 },
  dataValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dataSource: {
    backgroundColor: '#F9FAFB', borderRadius: 9999,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 2, paddingHorizontal: 7,
  },
  dataSourceText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },

  metaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 9, paddingHorizontal: 12, marginBottom: 16,
  },
  metaText: { fontSize: 12, color: '#9CA3AF' },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#059669', borderRadius: 10, padding: 16,
  },
  ctaTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  ctaSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
