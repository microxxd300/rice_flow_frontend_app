import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PieChart } from 'react-native-gifted-charts';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Text as SvgText, Line } from 'react-native-svg';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '../components';
import { mockProgressLogs, mockFarmCycles, mockPlantingGuides, mockSeasonalYields } from '../data/mockData';
import { useAccessibility } from '../context/AccessibilityContext';
import { useTranslation } from '@/i18n/useTranslation';
import { apiProgress, apiGuides, apiWeather, apiPredictions, apiScan } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { useLanguageStore } from '@/store/languageStore';

interface ProgressDashboardScreenProps {
  onAddLog?: () => void;
  onViewHistory?: () => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CROP_STAGES = [
  { stage: 'Land Prep & Planting',  date: 'Jun 15',  done: true },
  { stage: 'Early Growth',          date: 'Jun 22',  done: true },
  { stage: 'Tillering',             date: 'Jul 5',   done: true },
  { stage: 'Stem Elongation',       date: 'Jul 20',  done: true },
  { stage: 'Panicle Initiation',    date: 'Today',   done: false, active: true },
  { stage: 'Heading',               date: 'Aug 30',  done: false },
  { stage: 'Grain Filling',         date: 'Sep 15',  done: false },
  { stage: 'Harvest Ready',         date: 'Oct 9',   done: false },
];

const GROWTH_STAGES = [
  'Early Growth', 'Tillering', 'Stem Elongation',
  'Panicle Initiation', 'Heading', 'Grain Filling',
];

const ISSUE_OPTIONS = ['None', 'Insect', 'Disease', 'Drought', 'Flood', 'Other'];


// ── Animated empty-state for Kasaysayan ng Ani ──
// A "ghost" line draws itself from the top-left curving down to zero on the
// baseline, then erases and redraws — visually says "wala pang data, papunta sa zero".
const AnimatedPath = Animated.createAnimatedComponent(Path);

const EmptyYieldChart: React.FC<{ width: number; expectedYield: number | null; onRecord: () => void }> = ({
  width, expectedYield, onRecord,
}) => {
  const svgH    = 90;
  const pad     = { l: 8, r: 8, t: 8, b: 10 };
  const cW      = width - pad.l - pad.r;
  const baseY   = svgH - pad.b;
  // Curve from top-left → drops down to baseline at right
  const dPath = `M ${pad.l},${pad.t + 4}
                 C ${pad.l + cW * 0.30},${pad.t + 10}
                   ${pad.l + cW * 0.45},${baseY - 38}
                   ${pad.l + cW * 0.55},${baseY - 18}
                 S ${pad.l + cW * 0.85},${baseY}
                   ${pad.l + cW},${baseY}`;
  // Approximate path length for dasharray animation
  const LEN = Math.round(cW * 1.25);
  const dashOffset = useRef(new Animated.Value(LEN)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dashOffset, { toValue: 0,    duration: 1800, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.delay(450),
        Animated.timing(dashOffset, { toValue: -LEN, duration: 1400, easing: Easing.in(Easing.cubic),    useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>Yield History</Text>
        {expectedYield != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 9, borderWidth: 1, borderColor: '#FDE68A' }}>
            <Ionicons name="trending-up" size={11} color="#D97706" />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>{expectedYield}t</Text>
          </View>
        )}
      </View>

      <Svg width={width} height={svgH}>
        <Defs>
          <LinearGradient id="emptyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#059669" stopOpacity={0.10} />
            <Stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {/* baseline */}
        <Line x1={pad.l} y1={baseY} x2={pad.l + cW} y2={baseY} stroke="#E5E7EB" strokeWidth={1} />
        {/* faint guide area under the curve */}
        <Path d={`${dPath} L ${pad.l + cW},${baseY} L ${pad.l},${baseY} Z`} fill="url(#emptyGrad)" />
        {/* the animated ghost line */}
        <AnimatedPath
          d={dPath}
          stroke="#059669"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={LEN}
          strokeDashoffset={dashOffset as any}
        />
        {/* end dot pinned at zero */}
        <Circle cx={pad.l + cW} cy={baseY} r={3} fill="#059669" opacity={0.5} />
      </Svg>

      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>
        Wala pang naitalang ani — magrekord ng iyong unang ani.
      </Text>
      <TouchableOpacity
        onPress={onRecord}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginTop: 12,
          paddingVertical: 10, borderRadius: 10,
          backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
        }}
      >
        <Ionicons name="add" size={14} color="#059669" />
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#059669' }}>Record Harvest</Text>
      </TouchableOpacity>
    </View>
  );
};

// Animated empty-state donut — stroke drains to zero, loops continuously
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const EmptyYieldDonut: React.FC<{ size?: number; stroke?: number }> = ({ size = 116, stroke = 10 }) => {
  const r  = (size - stroke) / 2;
  const C  = 2 * Math.PI * r;
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(offset, { toValue: C,    duration: 1800, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.delay(400),
        Animated.timing(offset, { toValue: 0,    duration: 1400, easing: Easing.out(Easing.cubic),  useNativeDriver: false }),
        Animated.delay(200),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#F3F4F6" strokeWidth={stroke} fill="none"
        />
        {/* Animated ring */}
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#059669" strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset as any}
          rotation="-90"
          originX={size / 2} originY={size / 2}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>None</Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' }}>prediksyon</Text>
      </View>
    </View>
  );
};

export const ProgressDashboardScreen: React.FC<ProgressDashboardScreenProps> = ({
  onViewHistory,
}) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route      = useRoute<RouteProp<{ params: { tab?: string; highlight?: string } }, 'params'>>();
  const { isLargeText } = useAccessibility();
  const T = isLargeText;
  const tr = useTranslation();

  const TABS: { id: string; label: string; iconName: IoniconsName }[] = [
    { id: 'overview', label: tr.progressOverview, iconName: 'bar-chart-outline' },
    { id: 'logs',     label: tr.progressLogs,     iconName: 'document-text-outline' },
    { id: 'trends',   label: tr.progressTrends,   iconName: 'trending-up-outline' },
  ];

  const initialTab     = (route.params?.tab as 'overview' | 'logs' | 'trends') ?? 'overview';
  const yieldJustSaved = route.params?.highlight === 'yield';
  const [selectedTab,  setSelectedTab]  = useState<'overview' | 'logs' | 'trends'>(initialTab);
  const [showAddLog,   setShowAddLog]   = useState(false);
  // Source of truth = persisted store.progressLogs; backend logs merged on mount. Mock only as fallback.
  const storeLogs = useAppStore(s => s.progressLogs);
  const localLogs = storeLogs;
  const [currentCycle, setCurrentCycle] = useState<any>(mockFarmCycles[0]);
  const [logStage,     setLogStage]     = useState('');
  const [logDate,      setLogDate]      = useState(new Date().toISOString().split('T')[0]);
  const [logIssue,     setLogIssue]     = useState('');
  const [logSeverity,  setLogSeverity]  = useState<'' | 'Low' | 'Medium' | 'High'>('');
  const [logAction,    setLogAction]    = useState('');
  const [logNotes,     setLogNotes]     = useState('');
  const [openStage,    setOpenStage]    = useState(false);
  const [openIssue,    setOpenIssue]    = useState(false);

  const hasIssue = logIssue && logIssue !== 'None';

  const { activeCycle, farms } = useAppStore();
  const selectedFarm = useSelectedFarm();
  const selectedFarmId = selectedFarm?.id;
  const [cycleLoading, setCycleLoading] = useState(true);

  // Load real cycles and logs on mount AND whenever the selected farm changes
  useEffect(() => {
    const load = async () => {
      try {
        const farmId = selectedFarmId;
        const cyclesRes = await apiProgress.listCycles(farmId);
        const cycles = cyclesRes.data;
        if (cycles.length > 0) {
          const active = cycles.find((c: any) => c.status === 'active') ?? cycles[0];
          setCurrentCycle(active);
          useAppStore.getState().setActiveCycle(active);

          const logsRes = await apiProgress.listLogs(active.id);
          if (logsRes.data.length > 0) {
            // Normalize real log shape to match mock shape
            const normalized = logsRes.data.map((l: any) => ({
              id:            String(l.id),
              cycleId:       String(l.farm_cycle),
              logDate:       l.log_date,
              growthStage:   l.growth_stage,
              observedIssue: l.issue_type || 'None',
              actionTaken:   l.action_taken,
              notes:         l.observation,
            }));
            // Merge backend logs with existing local logs (dedupe by id), persist
            const existing = useAppStore.getState().progressLogs;
            const merged = [
              ...normalized,
              ...existing.filter((e: any) => !normalized.some((n: any) => n.id === e.id)),
            ];
            useAppStore.getState().setProgressLogs(merged);
          }
        }
      } catch {}
      finally { setCycleLoading(false); }
    };
    setCycleLoading(true);
    load();
  }, [selectedFarmId]);

  // Shimmer sweep — gradient highlight moves left→right across all skeletons
  const shimmerX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!cycleLoading) return;
    const loop = Animated.loop(
      Animated.timing(shimmerX, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [cycleLoading]);

  // Indeterminate stripe sliding across the progress bar while loading
  const stripeX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!cycleLoading) return;
    const loop = Animated.loop(
      Animated.timing(stripeX, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [cycleLoading]);

  // 3-dot wave for the "Tinitingnan..." indicator
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!cycleLoading) return;
    const bounce = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 350, easing: Easing.in(Easing.cubic),  useNativeDriver: true }),
          Animated.delay(550 - delay),
        ]),
      );
    const a = bounce(dot1, 0), b = bounce(dot2, 120), c = bounce(dot3, 240);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [cycleLoading]);

  // Loaded progress bar refs (animation effect runs after cyclePct is computed, below)
  const fillAnim  = useRef(new Animated.Value(0)).current;
  const fillSweep = useRef(new Animated.Value(0)).current;

  // Reusable shimmer-skeleton box — gray base with a moving white-ish gradient sweep
  const SkelBar = ({ w, h, br = 6 }: { w: number; h: number; br?: number }) => (
    <View style={{ width: w, height: h, borderRadius: br, backgroundColor: '#EDEFF1', overflow: 'hidden' }}>
      <Animated.View style={{
        position: 'absolute', top: 0, bottom: 0, width: w * 0.55,
        transform: [{ translateX: shimmerX.interpolate({ inputRange: [0, 1], outputRange: [-w * 0.6, w] }) }],
      }}>
        <ExpoGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );

  // ─── Real derived values for the Buod / Mga Trend cards ───
  const { latestRecommendation, latestGuide } = useAppStore();
  const variety = latestRecommendation?.results?.[0]?.variety;

  const plantingDateStr = (currentCycle as any)?.planting_date ?? (currentCycle as any)?.plantingDate;
  const today           = new Date();
  const cycleDays       = variety?.maturity_days ?? 115;
  // Only treat the planting date as valid if it falls inside a sensible window
  // (not in the future, not older than one full cycle). Otherwise, no real cycle
  // is running yet — UI shows "Day 1" / "—" instead of fabricating mid-cycle state.
  const cycleStart      = (() => {
    if (!plantingDateStr) return null;
    const d = new Date(plantingDateStr);
    if (isNaN(d.getTime())) return null;
    const daysSince = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (daysSince < 0 || daysSince > cycleDays + 30) return null;
    return d;
  })();
  const hasRealCycle    = cycleStart !== null;
  const CURRENT_DAY     = cycleStart
    ? Math.min(cycleDays, Math.max(1, Math.floor((today.getTime() - cycleStart.getTime()) / 86400000) + 1))
    : 1;
  const cyclePct        = hasRealCycle
    ? Math.min(100, Math.round(((CURRENT_DAY - 1) / cycleDays) * 100))
    : 0;

  // Animate the loaded progress fill (0% → cyclePct%) + continuous shimmer sweep on it
  useEffect(() => {
    if (cycleLoading) return;
    Animated.timing(fillAnim, {
      toValue:  cyclePct,
      duration: 900,
      easing:   Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const loop = Animated.loop(
      Animated.timing(fillSweep, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [cycleLoading, cyclePct]);
  const MONTHS_SHORT    = [
    tr.monShortJan, tr.monShortFeb, tr.monShortMar, tr.monShortApr,
    tr.monShortMay, tr.monShortJun, tr.monShortJul, tr.monShortAug,
    tr.monShortSep, tr.monShortOct, tr.monShortNov, tr.monShortDec,
  ];
  const harvestDate     = cycleStart ? new Date(cycleStart.getTime() + cycleDays * 86400000) : null;
  const harvestLabel    = harvestDate ? `${MONTHS_SHORT[harvestDate.getMonth()]} ${harvestDate.getDate()}` : 'Oct 9';
  const activeStage     = (() => {
    const i = Math.min(CROP_STAGES.length - 1, Math.floor((cyclePct / 100) * CROP_STAGES.length));
    return CROP_STAGES[i]?.stage ?? 'Mag-uhay';
  })();

  // Health score from recent issue-tagged logs — severity-weighted
  // Low = -3, Medium = -7, High = -12; floor 60. Null until the farmer logs at least once.
  const recentLogs = storeLogs.slice(0, 10);
  const healthScore: number | null = (() => {
    if (recentLogs.length === 0) return null;
    const SEV_PENALTY: Record<string, number> = { Low: 3, Medium: 7, High: 12 };
    let penalty = 0;
    for (const l of recentLogs as any[]) {
      const issue = String(l.observedIssue ?? l.observed_issue ?? '').trim();
      if (!issue || issue === 'None' || issue === 'Wala') continue;
      const sev = String(l.severity ?? '').trim();
      penalty += SEV_PENALTY[sev] ?? 5;
    }
    return Math.max(60, 100 - penalty);
  })();

  // Expected yield — call the trained linear-regression model on the backend.
  // Falls back to variety_avg × area only if the model call fails (no scan/network).
  const farmArea       = (selectedFarm as any)?.area_hectares ?? 2.5;
  const yieldPerHa     = variety?.avg_yield_t_ha ?? 6.5;
  const [predictedYield, setPredictedYield] = useState<number | null>(null);
  const [predModel,      setPredModel]      = useState<string | null>(null);
  const [predR2,         setPredR2]         = useState<number | null>(null);
  // expectedYield = variety_avg × area fallback for charts; metric card uses
  // predictedYield directly so it shows "—" until the model has responded.
  const expectedYield  = predictedYield ?? +(yieldPerHa * farmArea).toFixed(1);

  useEffect(() => {
    const farmId = selectedFarmId;
    if (!farmId) return;
    (async () => {
      try {
        // Pull the most recent environmental scan to feed all 11 model features
        let scan: any = null;
        try {
          const scanRes = await apiScan.history(farmId);
          scan = (scanRes.data ?? [])[0] ?? null;
        } catch {}
        const farmRow: any = selectedFarm;
        const res = await apiPredictions.predict({
          area_ha:           farmArea,
          soil_ph:           scan?.soil_ph,
          organic_matter:    scan?.organic_matter,
          avg_temperature:   scan?.avg_temperature,
          seasonal_rainfall: scan?.seasonal_rainfall ?? scan?.seasonal_rainfall_mm,
          humidity:          scan?.humidity ?? scan?.humidity_pct,
          elevation_m:       scan?.elevation_m ?? farmRow?.elevation_m,
          flood_risk:        scan?.flood_risk,
          ecosystem:         farmRow?.ecosystem,
          maturity_days:     variety?.maturity_days,
          variety_avg_yield: variety?.avg_yield_t_ha,
        });
        const tons = +(res.data.predicted_yield_t_ha * farmArea).toFixed(1);
        setPredictedYield(tons);
        setPredModel(res.data.model_used);
        setPredR2(res.data.r2_score);
      } catch {}
    })();
  }, [selectedFarmId, variety, farmArea]);

  // Use Gemini-generated guide steps if we have them, else fall back to mock
  const guideSteps = (Array.isArray((latestGuide as any)?.steps) && (latestGuide as any).steps.length > 0)
    ? (latestGuide as any).steps
    : (mockPlantingGuides[0]?.steps ?? []);

  // Live temperature for the metric tile (from Open-Meteo via Django)
  const [liveTemp, setLiveTemp] = useState<number | null>(null);
  const farmLat = (selectedFarm as any)?.latitude;
  const farmLng = (selectedFarm as any)?.longitude;
  useEffect(() => {
    if (farmLat == null || farmLng == null) return;
    apiWeather.current(farmLat, farmLng)
      .then(res => setLiveTemp(Math.round(res.data.current.temperature)))
      .catch(() => {});
  }, [farmLat, farmLng]);

  // Real seasonal yields — one record per cycle that has a saved yield
  const [realYields, setRealYields] = useState<{ season: string; yieldTons: number }[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const farmId    = selectedFarmId;
        const cyclesRes = await apiProgress.listCycles(farmId);
        const cycles    = cyclesRes.data ?? [];
        const out: { season: string; yieldTons: number }[] = [];
        for (const c of cycles) {
          try {
            const y = await apiProgress.getYield(c.id);
            const tons = y.data?.total_yield_tons ?? y.data?.yield_tons;
            if (tons != null) {
              out.push({ season: `${c.season ?? ''} ${c.year ?? ''}`.trim(), yieldTons: +tons });
            }
          } catch {}
        }
        setRealYields(out);
      } catch {}
    };
    load();
  }, [selectedFarmId]);

  const CAT_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    planting:        { label: 'Pagtatanim', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    fertilizer:      { label: 'Pataba',     color: '#D97706', bg: '#FFF7ED', border: '#FDE68A' },
    pest_prevention: { label: 'Pag-aalaga', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    irrigation:      { label: 'Tubig',      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    harvesting:      { label: 'Pag-aani',   color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  };

  const handleSaveLog = async () => {
    const issueClean = logIssue.trim();
    const issueIsReal = !!issueClean && issueClean !== 'Wala';
    const newLog = {
      id:            `log_${Date.now()}`,
      cycleId:       String(currentCycle?.id ?? 'cycle_001'),
      logDate,
      growthStage:   logStage,
      observedIssue: issueClean || 'None',
      severity:      issueIsReal ? (logSeverity || 'Low') : '',
      actionTaken:   issueIsReal ? logAction.trim() : '',
      notes:         logNotes.trim(),
    };
    // Optimistic UI update — persist to the store so it survives app restart
    useAppStore.getState().addProgressLog(newLog);

    // In-app notification (always fires) with deep-link to the relevant guide category
    {
      const text = `${logIssue} ${logNotes}`.toLowerCase();
      let category: string | undefined;
      let label    = '';
      let icon     = 'document-text-outline';
      if (/peste|insekto|pesticide|brown ?spot|blast|sheath|disease|sakit/i.test(text)) {
        category = 'pest_prevention'; label = 'Pag-aalaga sa Peste'; icon = 'shield-checkmark-outline';
      } else if (/dilaw|yellow|nutrient|nitrogen|potassium|pataba|fertilizer/i.test(text)) {
        category = 'fertilizer';      label = 'Pataba';              icon = 'flask-outline';
      } else if (/water|flood|baha|tubig|drain|patubig|tagtuyot|\btuyot\b|drought/i.test(text)) {
        category = 'irrigation';      label = 'Patubig';             icon = 'water-outline';
      } else if (/harvest|anihan|panicle|grain|\bani\b/i.test(text)) {
        category = 'harvesting';      label = 'Pag-aani';            icon = 'basket-outline';
      }
      useAppStore.getState().addNotification({
        title: label ? `Tingnan ang gabay sa ${label}` : 'Naitala ang inyong log',
        body:  label
          ? `Base sa inyong log, tingnan ang gabay sa ${label}.`
          : 'Naitala ang inyong pagsusuri sa bukid.',
        category, icon,
      });

      // Silent background refresh of the planting guide using all recent logs.
      const recId = useAppStore.getState().latestRecommendation?.id;
      if (recId) {
        apiGuides.generate(recId, {
          season:   useAppStore.getState().latestGuide?.season ?? 'Wet Season',
          logs:     useAppStore.getState().progressLogs.slice(0, 10),
          language: useLanguageStore.getState().language,
        })
          .then(res => useAppStore.getState().setLatestGuide(res.data))
          .catch(() => {});
      }
    }
    setLogIssue(''); setLogSeverity(''); setLogAction(''); setLogNotes('');
    setLogStage(''); setShowAddLog(false);

    // Persist to backend
    try {
      await apiProgress.createLog({
        farm_cycle:   currentCycle?.id,
        log_date:     logDate,
        growth_stage: logStage,
        issue_type:   logIssue.trim() === 'Wala' ? '' : logIssue.trim(),
        action_taken: logAction.trim(),
        observation:  logNotes.trim(),
      });
    } catch {}
  };

  // Format ISO date → "Jun 15" (short month + day)
  const MO_SHORT = [
    tr.monShortJan, tr.monShortFeb, tr.monShortMar, tr.monShortApr,
    tr.monShortMay, tr.monShortJun, tr.monShortJul, tr.monShortAug,
    tr.monShortSep, tr.monShortOct, tr.monShortNov, tr.monShortDec,
  ];
  const fmtMonth = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return MO_SHORT[d.getMonth()];
  };
  const fmtDay = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return String(d.getDate());
  };

  const renderLogRow = (log: typeof localLogs[0], idx: number, isLast: boolean) => {
    const hasIssue = log.observedIssue && log.observedIssue !== 'None';
    const sev      = String((log as any).severity ?? '').trim();
    const sevColor =
      sev === 'High'     ? '#DC2626'
      : sev === 'Medium' ? '#D97706'
      : sev === 'Low'     ? '#059669'
      : '#9CA3AF';

    // Build the subtitle line (issue + action) — kept inline & compact
    const subBits: string[] = [];
    if (hasIssue) subBits.push(log.observedIssue);
    if (hasIssue && log.actionTaken) subBits.push(log.actionTaken);

    return (
      <View key={idx} style={[s.logRow, !isLast && s.logRowDivider]}>
        <View style={s.logDateCol}>
          <Text style={[s.logDateMo,  T && { fontSize: 11 }]}>{fmtMonth(log.logDate)}</Text>
          <Text style={[s.logDateDay, T && { fontSize: 19 }]}>{fmtDay(log.logDate)}</Text>
        </View>
        <View style={s.logContentCol}>
          <Text style={[s.logRowTitle, T && { fontSize: 15 }]} numberOfLines={1}>{log.growthStage}</Text>
          {subBits.length > 0 ? (
            <Text style={[s.logRowSub, T && { fontSize: 13 }]} numberOfLines={2}>
              {subBits.join(' · ')}
            </Text>
          ) : null}
          {log.notes ? (
            <Text style={[s.logRowNote, T && { fontSize: 13 }]} numberOfLines={2}>{log.notes}</Text>
          ) : null}
        </View>
        {hasIssue && sev ? (
          <Text style={[s.logRowSev, { color: sevColor }]}>{sev}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={s.titleIcon}>
            <Ionicons name="analytics-outline" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[s.headerTitle, T && { fontSize: 17 }]}>{tr.progressHeader}</Text>
            <Text style={s.headerSub}>{currentCycle?.season ?? 'Wet'} Season {currentCycle?.year ?? new Date().getFullYear()}</Text>
          </View>
        </View>
        <NotificationBell color="#059669" size={22} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Segmented control (standard iOS-style tab switcher) */}
        <View style={s.segWrap}>
          {TABS.map(t => {
            const active = selectedTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[s.segItem, active && s.segItemActive]}
                onPress={() => setSelectedTab(t.id as any)}
                activeOpacity={0.75}
              >
                <Text style={[s.segText, active && s.segTextActive, T && { fontSize: 14 }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB 1: BUOD */}
        {selectedTab === 'overview' && (() => {
          const cW2 = Dimensions.get('window').width - 80;
          return (
            <>
              {/* Card 1: Status — flat (with shimmer loading state) */}
              <View style={[s.card, { marginTop: 16, marginBottom: 10, padding: 16 }]}>
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.6 }}>{tr.activeStageLabel}</Text>
                    {cycleLoading && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 10, color: '#059669', fontWeight: '600' }}>{tr.progressViewing}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 6 }}>
                          {[dot1, dot2, dot3].map((d, i) => (
                            <Animated.View key={i} style={{
                              width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: '#059669',
                              opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
                              transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
                            }} />
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                  {cycleLoading ? (
                    <SkelBar w={180} h={20} br={6} />
                  ) : (
                    <Text style={{ fontSize: T ? 17 : 16, fontWeight: '700', color: '#111827' }}>
                      {activeStage}
                    </Text>
                  )}
                </View>

                {/* Progress pill */}
                <View style={{ height: 4, backgroundColor: '#F3F4F6', borderRadius: 999, marginBottom: 14, overflow: 'hidden' }}>
                  {cycleLoading ? (
                    <Animated.View style={{
                      position: 'absolute', top: 0, bottom: 0, width: 110,
                      transform: [{
                        translateX: stripeX.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-110, Dimensions.get('window').width - 40],
                        }),
                      }],
                    }}>
                      <ExpoGradient
                        colors={['rgba(5,150,105,0)', '#059669', 'rgba(5,150,105,0)']}
                        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                        style={{ flex: 1, borderRadius: 999 }}
                      />
                    </Animated.View>
                  ) : (
                    <Animated.View style={{
                      height: 4, borderRadius: 999, overflow: 'hidden',
                      backgroundColor: '#059669',
                      width: fillAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                    }}>
                      {/* Continuous shimmer sweep on the green fill */}
                      <Animated.View style={{
                        position: 'absolute', top: 0, bottom: 0, width: 60,
                        transform: [{
                          translateX: fillSweep.interpolate({
                            inputRange:  [0, 1],
                            outputRange: [-60, Dimensions.get('window').width - 40],
                          }),
                        }],
                      }}>
                        <ExpoGradient
                          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                          style={{ flex: 1 }}
                        />
                      </Animated.View>
                    </Animated.View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {[
                    { val: cycleLoading ? null : (hasRealCycle ? `${tr.cycDayPrefix} ${CURRENT_DAY}` : '—'), lbl: tr.cycCurrent,        valColor: '#111827' },
                    { val: cycleLoading ? null : `${cyclePct}%`,                                              lbl: tr.cycDone,           valColor: '#059669' },
                    { val: cycleLoading ? null : (hasRealCycle ? harvestLabel : '—'),                          lbl: tr.cycExpectedYield,  valColor: '#111827' },
                  ].map((c, i, arr) => (
                    <React.Fragment key={c.lbl}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        {c.val == null
                          ? <View style={{ marginBottom: 4 }}><SkelBar w={46} h={14} br={4} /></View>
                          : <Text style={{ fontSize: 14, fontWeight: '700', color: c.valColor }}>{c.val}</Text>
                        }
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{c.lbl}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={{ width: 1, height: 26, backgroundColor: '#E5E7EB' }} />}
                    </React.Fragment>
                  ))}
                </View>
              </View>

              {/* Card 2: 3-column metrics — flat, with per-tile skeleton when data not yet loaded */}
              <View style={[s.card, { padding: 0, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}>
                  {[
                    { icon: 'shield-checkmark-outline' as const, value: healthScore != null ? String(healthScore) : '—',                        sub: healthScore != null ? '/100' : '',                        label: tr.cycHealth,          loading: cycleLoading },
                    { icon: 'trending-up-outline'      as const, value: (hasRealCycle && predictedYield != null) ? predictedYield.toFixed(1) : '—', sub: (hasRealCycle && predictedYield != null) ? 't' : '',     label: tr.cycExpectedYield,   loading: false },
                    { icon: 'thermometer-outline'      as const, value: liveTemp != null ? String(liveTemp) : '—',                             sub: liveTemp != null ? '°C' : '',                             label: tr.cycTemperature,     loading: liveTemp == null },
                  ].map((m, i) => (
                    <React.Fragment key={m.label}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Ionicons name={m.icon} size={14} color="#9CA3AF" style={{ marginBottom: 6 }} />
                        {m.loading ? (
                          <Skeleton w={48} h={T ? 26 : 24} br={5} style={{ marginBottom: 6 }} />
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                            <Text style={{ fontSize: T ? 24 : 22, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>{m.value}</Text>
                            <Text style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 2, fontWeight: '600' }}>{m.sub}</Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 4 }}>{m.label}</Text>
                      </View>
                      {i < 2 && <View style={{ width: 1, height: 38, backgroundColor: '#E5E7EB' }} />}
                    </React.Fragment>
                  ))}
                </View>
              </View>

              {/* Card 3: Yield trend — animated empty state (line draws down to zero) */}
              {realYields.length === 0 ? (
                <EmptyYieldChart
                  width={cW2}
                  expectedYield={hasRealCycle && predictedYield != null ? predictedYield : null}
                  onRecord={() => navigation.navigate('YieldRecord')}
                />
              ) : (() => {
                const data  = realYields;
                const vals  = data.map(y => y.yieldTons);
                const labs  = data.map(y =>
                  y.season.replace('Dry ', 'D').replace('Wet ', 'W').replace('20', "'")
                );
                const avg   = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));

                const pad  = { t: 12, b: 30, l: 32, r: 12 };
                const svgH = 150;
                const cW   = cW2 - pad.l - pad.r;
                const cH   = svgH - pad.t - pad.b;
                const bY   = pad.t + cH;
                const maxV = Math.max(...vals) + 1.5;
                const minV = Math.min(...vals) - 1;
                const toY  = (v: number) => pad.t + (1 - (v - minV) / (maxV - minV)) * cH;
                // For a single point, center it on the chart; otherwise distribute evenly
                const toX  = (i: number) =>
                  data.length === 1 ? pad.l + cW / 2 : pad.l + (i / (data.length - 1)) * cW;
                const pts  = vals.map((v, i) => ({ x: toX(i), y: toY(v) }));

                const mkLine = (p: { x: number; y: number }[]) => {
                  let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`;
                  for (let i = 1; i < p.length; i++) {
                    const cx = ((p[i - 1].x + p[i].x) / 2).toFixed(1);
                    d += ` C${cx},${p[i - 1].y.toFixed(1)} ${cx},${p[i].y.toFixed(1)} ${p[i].x.toFixed(1)},${p[i].y.toFixed(1)}`;
                  }
                  return d;
                };

                const line  = mkLine(pts);
                const area  = `${line} L${pts[pts.length - 1].x},${bY} L${pts[0].x},${bY} Z`;
                const last  = pts[pts.length - 1];
                const avgY  = toY(avg);
                const yTicks = [0.25, 0.5, 0.75].map(r => {
                  const v = minV + (maxV - minV) * r;
                  return { v: parseFloat(v.toFixed(1)), y: toY(v) };
                });

                return (
                  <View style={[s.card, { padding: 14, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{tr.progressYieldHistory}</Text>
                      <View style={s.predBadge}>
                        <Ionicons name="trending-up" size={11} color="#D97706" />
                        <Text style={s.predBadgeText}>{expectedYield}t</Text>
                      </View>
                    </View>

                    <Svg width={cW2} height={svgH}>
                      <Defs>
                        <LinearGradient id="buodGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0%" stopColor="#1F6B3F" stopOpacity={0.20} />
                          <Stop offset="100%" stopColor="#1F6B3F" stopOpacity={0} />
                        </LinearGradient>
                      </Defs>

                      {yTicks.map(tick => (
                        <React.Fragment key={tick.v}>
                          <Line x1={pad.l} y1={tick.y} x2={pad.l + cW} y2={tick.y} stroke="#F3F4F6" strokeWidth={1} />
                          <SvgText x={pad.l - 4} y={tick.y + 3.5} textAnchor="end" fontSize={8} fill="#9CA3AF">{tick.v}t</SvgText>
                        </React.Fragment>
                      ))}

                      <Line x1={pad.l} y1={bY} x2={pad.l + cW} y2={bY} stroke="#E5E7EB" strokeWidth={1} />
                      <Line x1={pad.l} y1={avgY} x2={pad.l + cW} y2={avgY} stroke="#FCD34D" strokeWidth={1.5} strokeDasharray="4,3" />
                      <SvgText x={pad.l + cW + 2} y={avgY + 3.5} fontSize={7.5} fill="#D97706" fontWeight="bold">avg</SvgText>

                      <Path d={area} fill="url(#buodGrad)" />
                      <Path d={line} stroke="#1F6B3F" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />

                      {pts.slice(0, -1).map((p, i) => (
                        <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#1F6B3F" opacity={0.4} />
                      ))}

                      <Circle cx={last.x} cy={last.y} r={10} fill="#D97706" opacity={0.12} />
                      <Circle cx={last.x} cy={last.y} r={5}  fill="#FFFFFF" />
                      <Circle cx={last.x} cy={last.y} r={3}  fill="#D97706" />

                      {pts.map((p, i) => (
                        <SvgText
                          key={`x${i}`}
                          x={p.x}
                          y={svgH - 4}
                          textAnchor="middle"
                          fontSize={8.5}
                          fill={i === data.length - 1 ? '#D97706' : '#9CA3AF'}
                          fontWeight={i === data.length - 1 ? 'bold' : 'normal'}
                        >
                          {labs[i]}
                        </SvgText>
                      ))}
                    </Svg>

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      {[
                        { color: '#D97706', label: 'Pinakabago', dot: true },
                        { color: '#1F6B3F', label: 'Nakaraang Season', dot: true },
                        { color: '#FCD34D', label: `Avg ${avg}t`, dot: false },
                      ].map(l => (
                        <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <View style={{ width: l.dot ? 8 : 14, height: l.dot ? 8 : 2, backgroundColor: l.color, borderRadius: l.dot ? 2 : 0 }} />
                          <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '500' }}>{l.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {/* Card 4: Todo list */}
              {(() => {
                const todos = guideSteps
                  .filter((s: any) => s.daysAfterPlanting >= CURRENT_DAY)
                  .sort((a: any, b: any) => a.daysAfterPlanting - b.daysAfterPlanting)
                  .slice(0, 4);
                if (!todos.length) return null;
                return (
                  <View style={[s.card, { padding: 0, overflow: 'hidden', marginBottom: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.3 }}>SUSUNOD NA GAWAIN</Text>
                      <TouchableOpacity onPress={() => setShowAddLog(true)} style={s.todoLogBtn} activeOpacity={0.8}>
                        <Ionicons name="add" size={13} color="#059669" />
                        <Text style={s.todoLogBtnText}>{tr.homeAddLog}</Text>
                      </TouchableOpacity>
                    </View>
                    {todos.map((step: any, i: number) => {
                      const cat    = CAT_CONFIG[step.category] ?? CAT_CONFIG.planting;
                      const isNext = i === 0;
                      return (
                        <View key={step.id} style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: i < todos.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: '#F3F4F6' }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: isNext ? cat.color : '#D1D5DB', marginTop: 5 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: T ? 13 : 12, color: isNext ? '#111827' : '#9CA3AF', lineHeight: 19, fontWeight: isNext ? '500' : '400' }}>
                              {step.instruction}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </>
          );
        })()}

        {/* TAB 2: MGA TALA (LOGS) */}
        {selectedTab === 'logs' && (
          <>
            <View style={s.logBtnRow}>
              <TouchableOpacity
                style={[s.logActionBtn, s.logActionBtnPrimary]}
                onPress={() => setShowAddLog(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text style={[s.logActionBtnPrimaryText, T && { fontSize: 15 }]}>{tr.homeAddLog}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.logActionBtn, s.logActionBtnGhost]}
                onPress={() => navigation.navigate('YieldRecord')}
                activeOpacity={0.7}
              >
                <Ionicons name="basket-outline" size={16} color="#6B7280" />
                <Text style={[s.logActionBtnGhostText, T && { fontSize: 15 }]}>{tr.progressRecordYieldShort}</Text>
              </TouchableOpacity>
            </View>

            {localLogs.length > 0 ? (
              <View style={s.logList}>
                {localLogs.map((log, idx) => renderLogRow(log, idx, idx === localLogs.length - 1))}
              </View>
            ) : (
              <View style={s.logEmpty}>
                <View style={s.logEmptyIconWrap}>
                  <Ionicons name="document-text-outline" size={28} color="#9CA3AF" />
                </View>
                <Text style={s.logEmptyTitle}>{tr.progressNoLogsTitle}</Text>
                <Text style={s.logEmptySub}>
                  Mag-log ng iyong unang obserbasyon{'\n'}sa bukid upang magsimula.
                </Text>
              </View>
            )}
          </>
        )}

        {/* TAB 3: MGA TREND */}
        {selectedTab === 'trends' && (() => {
          const chartW = Dimensions.get('window').width - 80;
          const shortLabel = (season: string) =>
            season.replace('Dry ', 'D').replace('Wet ', 'W').replace('20', "'");

          const buildLine = (pts: { x: number; y: number }[]) => {
            let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
            for (let i = 1; i < pts.length; i++) {
              const cpx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
              d += ` C${cpx},${pts[i - 1].y.toFixed(1)} ${cpx},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
            }
            return d;
          };

          const StatsRow = ({ items }: { items: { label: string; value: string; color: string }[] }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 8 }}>
              {items.map((stat, i) => (
                <React.Fragment key={stat.label}>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: stat.color, letterSpacing: -0.3 }}>{stat.value}</Text>
                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{stat.label}</Text>
                  </View>
                  {i < items.length - 1 && <View style={{ width: 1, height: 32, backgroundColor: '#E5E7EB' }} />}
                </React.Fragment>
              ))}
            </View>
          );

          return (
            <>
              {/* ── Yield Forecast — only when a real cycle is running AND the LR model has responded ── */}
              {(() => {
                // No real cycle yet → show a clean "start a cycle" empty state instead of fabricated numbers
                if (!hasRealCycle || predictedYield == null) {
                  return (
                    <View style={[s.trendCard, { marginTop: 20, alignItems: 'center', paddingVertical: 28 }]}>
                      <Ionicons name="trending-up-outline" size={28} color="#D1D5DB" />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 8, textAlign: 'center', paddingHorizontal: 12 }}>
                        {tr.yieldNeedCycle}
                      </Text>
                    </View>
                  );
                }

                const daysLeft      = Math.max(0, cycleDays - CURRENT_DAY);
                const prevYield     = realYields.length > 0 ? realYields[realYields.length - 1].yieldTons : null;
                const deltaPct      = prevYield != null && prevYield > 0
                  ? +(((predictedYield - prevYield) / prevYield) * 100).toFixed(1)
                  : null;
                const varietyName   = variety?.common_name ?? 'NSIC Rc160';

                return (
                  <TouchableOpacity
                    style={[s.trendCard, { marginTop: 20 }]}
                    onPress={() => navigation.navigate('RecommendationResults')}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{varietyName}</Text>
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{tr.progressExpected}</Text>
                      </View>
                      <View style={s.trendHarvestPill}>
                        <Ionicons name="time-outline" size={12} color="#D97706" />
                        <Text style={s.trendHarvestPillText}>{harvestLabel}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                      <PieChart
                        donut
                        data={[
                          { value: cyclePct,        color: '#059669' },
                          { value: 100 - cyclePct,  color: '#F3F4F6' },
                        ]}
                        radius={58}
                        innerRadius={44}
                        strokeColor="#FFFFFF"
                        strokeWidth={2}
                        centerLabelComponent={() => (
                          <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>{predictedYield.toFixed(1)}t</Text>
                            <Text style={{ fontSize: 9, fontWeight: '600', color: '#9CA3AF', marginTop: 1 }}>{tr.donutPrediction}</Text>
                          </View>
                        )}
                      />

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 6 }}>{tr.donutCyclePct.replace('{p}', String(cyclePct))}</Text>

                        <View style={{ marginBottom: 10 }}>
                          <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.5, lineHeight: 26 }}>
                            {(predictedYield / Math.max(farmArea, 0.1)).toFixed(1)}<Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '600' }}> t/ha</Text>
                          </Text>
                          <Text style={{ fontSize: 11, color: '#6B7280' }}>{tr.donutExpectedAni}</Text>
                        </View>

                        {deltaPct != null && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name={deltaPct >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color={deltaPct >= 0 ? '#059669' : '#DC2626'} />
                            <Text style={{ fontSize: 11, color: deltaPct >= 0 ? '#059669' : '#DC2626', fontWeight: '600' }}>
                              {tr.donutVsPrev.replace('{d}', `${deltaPct >= 0 ? '+' : ''}${deltaPct}`)}
                            </Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                          {tr.donutDaysLeft.replace('{n}', String(daysLeft))}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* (Kasaysayan ng Ani lives in Buod — kept off Trends to avoid duplicate) */}

              {/* ── Plant Health ── derived from real progressLogs (severity-weighted). Empty state when no logs. */}
              {(() => {
                if (recentLogs.length === 0) {
                  return (
                    <View style={[s.trendCard, { marginTop: 20, alignItems: 'center', paddingVertical: 28 }]}>
                      <Ionicons name="shield-checkmark-outline" size={28} color="#D1D5DB" />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 8, textAlign: 'center', paddingHorizontal: 12 }}>
                        {tr.healthNoLogs}
                      </Text>
                    </View>
                  );
                }

                // Classify each recent log into one of 3 categories using the same regex as notifications
                const SEV_RANK: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
                const worst = (cat: 'insekto' | 'sakit' | 'tubig'): string => {
                  const re = cat === 'insekto'
                    ? /peste|insekto|brown ?planthopper|stem ?borer/i
                    : cat === 'sakit'
                    ? /sakit|blast|sheath|brown ?spot|disease/i
                    : /water|flood|baha|tubig|drain|patubig|tagtuyot|\btuyot\b|drought/i;
                  let worstSev = 0; let worstName = tr.healthNone;
                  for (const l of recentLogs as any[]) {
                    const text = `${l.observedIssue ?? l.observed_issue ?? ''} ${l.notes ?? ''}`;
                    if (!re.test(text)) continue;
                    const sev = String(l.severity ?? '').trim();
                    const rank = SEV_RANK[sev] ?? 1;
                    if (rank > worstSev) { worstSev = rank; worstName = sev || 'Low'; }
                  }
                  return worstName;
                };

                const insekto = worst('insekto');
                const sakit   = worst('sakit');
                const tubig   = worst('tubig');
                const colorFor = (v: string) =>
                  v === 'High'     ? '#DC2626'
                  : v === 'Medium' ? '#D97706'
                  : v === 'Low'     ? '#D97706'
                  :                      '#059669';
                const labelFor = (cat: 'tubig', v: string) => {
                  if (cat === 'tubig' && v === tr.healthNone) return tr.healthAdequate;
                  return v;
                };

                const hs = healthScore;
                const overallLabel = hs == null ? '—'
                  : hs >= 90 ? 'Excellent'
                  : hs >= 75 ? 'Healthy'
                  : hs >= 60 ? 'Monitor'
                  :            'Warning';
                const overallColor = hs == null ? '#9CA3AF'
                  : hs >= 90 ? '#059669'
                  : hs >= 75 ? '#059669'
                  : hs >= 60 ? '#D97706'
                  :            '#DC2626';

                const rows = [
                  { icon: 'bug-outline'   as const, label: tr.healthInsect,  value: insekto },
                  { icon: 'leaf-outline'  as const, label: tr.healthDisease, value: sakit },
                  { icon: 'water-outline' as const, label: tr.healthWater,   value: labelFor('tubig', tubig) },
                ];

                return (
                  <TouchableOpacity
                    style={[s.trendCard, { marginTop: 20 }]}
                    onPress={() => setSelectedTab('logs')}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{tr.progressPlantHealth}</Text>
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{tr.healthFromLogs.replace('{n}', String(recentLogs.length))}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: overallColor }}>{overallLabel}</Text>
                    </View>
                    {rows.map((row, i, arr) => (
                      <View key={row.label} style={[s.listRow, i === arr.length - 1 && { borderBottomWidth: 0, marginBottom: 12 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Ionicons name={row.icon} size={16} color="#9CA3AF" />
                          <Text style={[s.rowLabel, T && { fontSize: 15 }]}>{row.label}</Text>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colorFor(row.value) }}>{row.value}</Text>
                      </View>
                    ))}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>{tr.progressOverallHealth}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: overallColor }}>{hs == null ? '—' : `${hs}%`}</Text>
                    </View>
                    <View style={s.progBg}>
                      <View style={[s.progFill, { width: `${hs ?? 0}%`, backgroundColor: overallColor }]} />
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* ── GABAY ── only counts steps the farmer ACTUALLY checked in the Gabay tab */}
              {(() => {
                const steps: any[] = Array.isArray((latestGuide as any)?.steps) ? (latestGuide as any).steps : [];
                const checkedIds = new Set(useAppStore.getState().completedGuideSteps);
                const CAT_LABELS: Record<string, string> = {
                  planting:        tr.catPlanting,
                  fertilizer:      tr.catFertilizer,
                  pest_prevention: tr.catPest,
                  irrigation:      tr.catIrrigation,
                  harvesting:      tr.catHarvesting,
                };
                const buckets = Object.keys(CAT_LABELS).map(cat => {
                  const inCat   = steps.filter(s => s.category === cat);
                  const done    = inCat.filter(s => checkedIds.has(String(s.id))).length;
                  const overdue = inCat.filter(s => !checkedIds.has(String(s.id)) && (s.daysAfterPlanting ?? 0) < CURRENT_DAY).length;
                  const next    = inCat.find(s => !checkedIds.has(String(s.id)));
                  const allDone = inCat.length > 0 && done === inCat.length;
                  return {
                    cat,
                    label:  CAT_LABELS[cat],
                    detail: inCat.length === 0
                      ? '—'
                      : allDone
                        ? tr.adhAllDone
                        : overdue > 0
                          ? tr.adhUnchecked.replace('{n}', String(overdue))
                          : next
                            ? tr.adhNext.replace('{d}', String(next.daysAfterPlanting))
                            : tr.adhNothingPending,
                    status: inCat.length === 0
                      ? '—'
                      : allDone
                        ? tr.adhStatusDone
                        : overdue > 0
                          ? tr.adhStatusNotYet
                          : done > 0
                            ? tr.adhStatusInProgress
                            : tr.adhStatusNotYet,
                    done:   allDone,
                    total:  inCat.length,
                    doneCt: done,
                  };
                }).filter(b => b.total > 0);

                const totalSteps = buckets.reduce((sum, b) => sum + b.total, 0);
                const totalDone  = buckets.reduce((sum, b) => sum + b.doneCt, 0);
                const adherence  = totalSteps > 0 ? Math.round((totalDone / totalSteps) * 100) : 0;
                const badge =
                  adherence >= 80 ? { label: tr.adhBadgeOnTrack, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' }
                  : adherence >= 50 ? { label: tr.adhBadgeImprove, color: '#D97706', bg: '#FFF7ED', border: '#FDE68A' }
                  :                   { label: tr.adhBadgeReview, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };

                if (buckets.length === 0) {
                  return (
                    <View style={[s.trendCard, { marginTop: 20, alignItems: 'center', paddingVertical: 24 }]}>
                      <Ionicons name="book-outline" size={28} color="#D1D5DB" />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 8 }}>{tr.progressNoGuide}</Text>
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'center' }}>
                        {tr.guideOpenTabHint}
                      </Text>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    style={[s.trendCard, { marginTop: 20 }]}
                    onPress={() => navigation.navigate('PlantingTab')}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{tr.progressGuideAdh}</Text>
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{tr.adhDayOf.replace('{d}', String(CURRENT_DAY)).replace('{total}', String(cycleDays))}</Text>
                      </View>
                      <View style={{ backgroundColor: badge.bg, borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: badge.border }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: badge.color }}>{badge.label}</Text>
                      </View>
                    </View>
                    {buckets.map((item, i, arr) => (
                      <View key={item.cat} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: '#F3F4F6' }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: item.done ? '#ECFDF5' : '#F9FAFB', borderWidth: 1.5, borderColor: item.done ? '#059669' : '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                          {item.done
                            ? <Ionicons name="checkmark" size={14} color="#059669" />
                            : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#D1D5DB' }} />
                          }
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: item.done ? '#111827' : '#9CA3AF' }}>{item.label}</Text>
                          <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1 }}>{item.detail} · {item.doneCt}/{item.total}</Text>
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: item.done ? '#059669' : '#9CA3AF' }}>{item.status}</Text>
                      </View>
                    ))}
                    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '500' }}>{tr.progressOverallAdh}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1F6B3F' }}>{adherence}%</Text>
                      </View>
                      <View style={s.progBg}>
                        <View style={[s.progFill, { width: `${adherence}%` }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* "Buong Kasaysayan" → goes to Reports screen (full historical view across all seasons/farms) */}
              <TouchableOpacity
                onPress={() => navigation.navigate('ReportsHome')}
                activeOpacity={0.85}
                style={{ height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', marginTop: 16, flexDirection: 'row', gap: 6 }}
              >
                <Ionicons name="document-text-outline" size={16} color="#374151" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>{tr.progressFullReport}</Text>
              </TouchableOpacity>
            </>
          );
        })()}
      </ScrollView>

      {/* ADD LOG MODAL */}
      <Modal visible={showAddLog} transparent animationType="slide" onRequestClose={() => setShowAddLog(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setShowAddLog(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalTitle, T && { fontSize: 19 }]}>{tr.plogModalTitle}</Text>
                <Text style={[s.modalSub, T && { fontSize: 14 }]}>{tr.plogModalSub}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddLog(false)} style={s.modalCloseBtn} activeOpacity={0.75}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={s.modalContextRow}>
              {[
                { icon: 'home-outline' as const,     label: 'Santos Family Farm' },
                { icon: 'calendar-outline' as const, label: 'Day 45' },
                { icon: 'sunny-outline' as const,    label: 'Wet Season 2024' },
              ].map(c => (
                <View key={c.label} style={s.contextChip}>
                  <Ionicons name={c.icon} size={12} color="#6B7280" />
                  <Text style={[s.contextChipText, T && { fontSize: 13 }]}>{c.label}</Text>
                </View>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Petsa ng Tala */}
              <View style={s.mFieldWrap}>
                <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogDate} <Text style={s.mReq}>*</Text></Text>
                <View style={s.mInputBox}>
                  <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                  <TextInput
                    style={[s.mInput, T && { fontSize: 16 }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#D1D5DB"
                    value={logDate}
                    onChangeText={setLogDate}
                  />
                </View>
              </View>

              {/* Yugto ng Paglaki */}
              <View style={s.mFieldWrap}>
                <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogStage} <Text style={s.mReq}>*</Text></Text>
                <View>
                  <TouchableOpacity
                    style={s.mInputBox}
                    onPress={() => { setOpenStage(v => !v); setOpenIssue(false); }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="leaf-outline" size={16} color="#9CA3AF" />
                    <Text style={[s.mInput, { color: logStage ? '#111827' : '#D1D5DB' }, T && { fontSize: 16 }]}>
                      {logStage || 'Pumili ng yugto...'}
                    </Text>
                    <Ionicons name={openStage ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                  {openStage && (
                    <View style={s.mDropMenu}>
                      {GROWTH_STAGES.map((opt, i) => (
                        <TouchableOpacity
                          key={opt}
                          style={[s.mDropItem, i < GROWTH_STAGES.length - 1 && s.mDropItemBorder]}
                          onPress={() => { setLogStage(opt); setOpenStage(false); }}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.mDropItemText, logStage === opt && s.mDropItemActive, T && { fontSize: 15 }]}>{opt}</Text>
                          {logStage === opt && <Ionicons name="checkmark" size={16} color="#059669" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Nakitang Isyu */}
              <View style={s.mFieldWrap}>
                <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogIssue} <Text style={s.mReq}>*</Text></Text>
                <View>
                  <TouchableOpacity
                    style={s.mInputBox}
                    onPress={() => { setOpenIssue(v => !v); setOpenStage(false); }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="warning-outline" size={16} color="#9CA3AF" />
                    <Text style={[s.mInput, { color: logIssue ? '#111827' : '#D1D5DB' }, T && { fontSize: 16 }]}>
                      {logIssue || 'Pumili ng isyu...'}
                    </Text>
                    <Ionicons name={openIssue ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                  {openIssue && (
                    <View style={s.mDropMenu}>
                      {ISSUE_OPTIONS.map((opt, i) => (
                        <TouchableOpacity
                          key={opt}
                          style={[s.mDropItem, i < ISSUE_OPTIONS.length - 1 && s.mDropItemBorder]}
                          onPress={() => {
                            setLogIssue(opt);
                            setOpenIssue(false);
                            if (opt === 'Wala') { setLogSeverity(''); setLogAction(''); }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.mDropItemText, logIssue === opt && s.mDropItemActive, T && { fontSize: 15 }]}>{opt}</Text>
                          {logIssue === opt && <Ionicons name="checkmark" size={16} color="#059669" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Conditional: only show severity + aksyon when there's an actual issue */}
              {hasIssue && (
                <>
                  {/* Gaano kalala? — segmented control, matches the Buod/Tala/Trends tabs */}
                  <View style={s.mFieldWrap}>
                    <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogSeverity} <Text style={s.mReq}>*</Text></Text>
                    <View style={[s.segWrap, { marginTop: 0, marginBottom: 0 }]}>
                      {(['Low', 'Medium', 'High'] as const).map(opt => {
                        const active = logSeverity === opt;
                        const activeColor =
                          opt === 'Low'     ? '#059669'
                          : opt === 'Medium' ? '#D97706'
                          :                        '#DC2626';
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[s.segItem, active && s.segItemActive]}
                            onPress={() => setLogSeverity(opt)}
                            activeOpacity={0.75}
                          >
                            <Text style={[s.segText, active && { color: activeColor, fontWeight: '700' }, T && { fontSize: 14 }]}>
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Aksyon na Ginawa */}
                  <View style={s.mFieldWrap}>
                    <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogAction}</Text>
                    <View style={s.mInputBox}>
                      <Ionicons name="hammer-outline" size={16} color="#9CA3AF" />
                      <TextInput
                        style={[s.mInput, T && { fontSize: 16 }]}
                        placeholder={tr.plogActionPh}
                        placeholderTextColor="#D1D5DB"
                        value={logAction}
                        onChangeText={setLogAction}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Mga Tala */}
              <View style={[s.mFieldWrap, { marginBottom: 0 }]}>
                <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogNotes}</Text>
                <View style={[s.mInputBox, { alignItems: 'flex-start', paddingTop: 14, height: undefined, minHeight: 90 }]}>
                  <Ionicons name="document-text-outline" size={16} color="#9CA3AF" style={{ marginTop: 2 }} />
                  <TextInput
                    style={[s.mInput, { textAlignVertical: 'top', minHeight: 70 }, T && { fontSize: 16 }]}
                    placeholder={tr.plogNotesPh}
                    placeholderTextColor="#D1D5DB"
                    value={logNotes}
                    onChangeText={setLogNotes}
                    multiline
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 }}>
                <TouchableOpacity style={s.mCancelBtn} onPress={() => setShowAddLog(false)} activeOpacity={0.7}>
                  <Text style={[s.mCancelBtnText, T && { fontSize: 15 }]}>{tr.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.mSaveBtn} onPress={handleSaveLog} activeOpacity={0.85}>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={[s.mSaveBtnText, T && { fontSize: 15 }]}>{tr.save}</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  scroll: { paddingHorizontal: 24, paddingBottom: 110 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  titleIcon:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  headerBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  bellDot:     { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' },

  /* Segmented control */
  segWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    padding: 3,
    marginTop: 20,
    marginBottom: 4,
  },
  segItem: {
    flex: 1, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  segItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segText:       { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  segTextActive: { color: '#111827', fontWeight: '700' },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#9CA3AF',
    letterSpacing: 0.8, marginTop: 24, marginBottom: 10,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },

  trendCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
  },
  trendHarvestPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF7ED', borderRadius: 9999,
    paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  trendHarvestPillText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  cardHighlight: { borderColor: '#059669' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },

  listRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  /* Graph card */
  graphCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  graphCardHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  graphStagePill: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  graphStageDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  graphStageLabel: { fontSize: 14, fontWeight: '700', color: '#065F46', flex: 1 },
  graphCardSub:   { fontSize: 11, color: '#6B7280', marginBottom: 12 },
  graphPctText:   { fontSize: 15, fontWeight: '800', color: '#059669' },
  graphBarBg:   { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 16 },
  graphBarFill: { height: 4, backgroundColor: '#059669', borderRadius: 2 },
  graphTrackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  graphLine:     { flex: 1, height: 2, backgroundColor: '#E5E7EB' },
  graphLineDone: { backgroundColor: '#059669' },
  graphDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  graphDotDone:   { backgroundColor: '#059669', borderColor: '#059669' },
  graphDotActive: { backgroundColor: '#FFFFFF', borderColor: '#059669', borderWidth: 2.5 },
  graphDotPulse:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' },
  graphFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  graphFooterSide:    { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  graphFooterMid:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  graphFooterMidText: { fontSize: 11, color: '#059669', fontWeight: '700' },

  /* Task card (Gawain Ngayon) */
  taskCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden',
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  taskCardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  taskCatChip: {
    backgroundColor: '#ECFDF5', borderRadius: 9999,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#D1FAE5',
  },
  taskCatChipText: { fontSize: 11, fontWeight: '700', color: '#065F46' },
  taskDayChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF7ED', borderRadius: 9999,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  taskDayChipText: { fontSize: 11, fontWeight: '600', color: '#D97706' },
  taskCardBody: { padding: 14 },
  taskCardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  taskCardInst:  { fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 14 },
  taskCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 46, borderRadius: 10,
    backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#059669',
  },
  taskCardBtnText: { fontSize: 14, fontWeight: '700', color: '#059669' },

  /* Health */
  healthRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  healthIconWrap: {
    width: 26, height: 26, borderRadius: 7,
    backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  healthStatus:   { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  healthScoreBox: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  healthScoreNum: { fontSize: 22, fontWeight: '800', color: '#059669', letterSpacing: -1 },
  healthScoreDen: { fontSize: 11, color: '#9CA3AF' },
  healthBarRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  healthBarBg:    { flex: 1, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  healthBarFill:  { height: 4, backgroundColor: '#059669', borderRadius: 2 },
  healthBarPct:   { fontSize: 11, fontWeight: '700', color: '#059669', minWidth: 32, textAlign: 'right' },
  healthChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  healthChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', borderRadius: 9999,
    paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  healthChipText: { fontSize: 11, fontWeight: '600', color: '#065F46' },

  /* Log list — single container with hairline-separated rows (apps-log style) */
  logList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden',
  },

  /* Empty state — shows when there are no real logs yet */
  logEmpty: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 32, paddingHorizontal: 24,
    alignItems: 'center',
  },
  logEmptyIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  logEmptyTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6 },
  logEmptySub:   { fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 18 },
  logRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 14, paddingHorizontal: 14, gap: 14,
  },
  logRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  logDateCol:    { width: 42, alignItems: 'center' },
  logDateMo:     { fontSize: 10, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase' },
  logDateDay:    { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 1, lineHeight: 22 },
  logContentCol: { flex: 1 },
  logRowTitle:   { fontSize: 14, fontWeight: '600', color: '#111827' },
  logRowSub:     { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 17 },
  logRowNote:    { fontSize: 12, color: '#9CA3AF', marginTop: 3, lineHeight: 17, fontStyle: 'italic' },
  logRowSev:     { fontSize: 11, fontWeight: '700', alignSelf: 'flex-start', marginTop: 2 },

  /* Log tab buttons */
  logBtnRow: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 14 },
  logActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, height: 50, borderRadius: 12,
  },
  logActionBtnPrimary: {
    backgroundColor: '#059669',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logActionBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  logActionBtnGhost: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
  },
  logActionBtnGhostText:   { fontSize: 14, fontWeight: '600', color: '#374151' },

  /* Yield trend */
  yieldSectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  newBadge: {
    backgroundColor: '#F9FAFB', borderRadius: 9999,
    paddingVertical: 4, paddingHorizontal: 9, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#111827' },
  yieldCardHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 14,
  },
  yieldCardSub:  { fontSize: 12, color: '#6B7280', marginTop: 2 },
  seeAllBtn:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText:    { fontSize: 11, fontWeight: '700', color: '#059669' },
  yieldChartContainer: { marginBottom: 12 },
  yieldBarsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 4 },
  yieldBarCol:  { flex: 1, alignItems: 'center' },
  yieldBar:     { width: '78%', borderRadius: 4 },
  yieldBarTopVal: { fontSize: 10, fontWeight: '700', color: '#111827', marginBottom: 3 },
  yieldBarSeason: { fontSize: 8, color: '#9CA3AF', textAlign: 'center', marginTop: 4, lineHeight: 12 },
  yieldBaseline:  { height: 1.5, backgroundColor: '#E5E7EB', borderRadius: 1, marginBottom: 8 },
  yieldStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  yieldStat:      { flex: 1, alignItems: 'center' },
  yieldStatVal:   { fontSize: 16, fontWeight: '700', color: '#059669', letterSpacing: -0.3 },
  yieldStatLabel: { fontSize: 10, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  yieldStatSub:   { fontSize: 10, color: '#9CA3AF' },
  yieldStatDiv:   { width: 1, height: 36, backgroundColor: '#E5E7EB' },

  /* Progress bar */
  progBg:    { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  progFill:  { height: 4, borderRadius: 2, backgroundColor: '#059669' },
  progLabel: { fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: '600' },

  /* Modal */
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 24, paddingBottom: 32, maxHeight: '92%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  modalSub:   { fontSize: 13, color: '#6B7280', marginTop: 1 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  contextChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F9FAFB', borderRadius: 9999, borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 5, paddingHorizontal: 10,
  },
  contextChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  modalFieldLabel: {
    fontSize: 11, fontWeight: '600', color: '#9CA3AF',
    letterSpacing: 0.8, marginBottom: 8, marginTop: 14,
  },
  modalInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, minHeight: 52, justifyContent: 'center',
  },
  modalTextArea:  { minHeight: 88, justifyContent: 'flex-start', paddingVertical: 8 },
  modalInputText: { fontSize: 15, color: '#111827', flex: 1 },
  stageChipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  stageChip: {
    paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9999,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF',
    minHeight: 44, justifyContent: 'center',
  },
  stageChipActive:     { backgroundColor: '#059669', borderColor: '#059669' },
  stageChipText:       { fontSize: 13, fontWeight: '600', color: '#111827' },
  stageChipTextActive: { color: '#FFFFFF' },
  modalActions: { gap: 8, marginTop: 16, marginBottom: 8 },

  /* Modal professional form */
  mFieldWrap:  { marginBottom: 20 },
  mLabel:      { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  mReq:        { color: '#EF4444' },
  mInputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, height: 52,
  },
  mInput: { flex: 1, fontSize: 15, color: '#111827' },
  mDropMenu: {
    marginTop: 4, backgroundColor: '#FFFFFF',
    borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  mDropItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  mDropItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  mDropItemText:   { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  mDropItemActive: { color: '#059669', fontWeight: '700' },
  /* Primary action — solid green, white text */
  mSaveBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 50, backgroundColor: '#059669', borderRadius: 12,
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mSaveBtnText:  { fontSize: 14, color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.2 },

  /* Secondary action — ghost with hairline border */
  mCancelBtn: {
    flex: 1, height: 50, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  mCancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  /* ── BUOD tab: Farm Banner (Card 1) ── */
  bannerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden',
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  bannerAccent: { height: 4, backgroundColor: '#059669' },
  bannerTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  bannerFarm:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  bannerVariety: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  bannerStagePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ECFDF5', borderRadius: 9999,
    paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  bannerLiveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' },
  bannerStageText:{ fontSize: 11, fontWeight: '600', color: '#059669' },
  bannerTrack: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 10,
  },
  bannerLine:     { flex: 1, height: 2, backgroundColor: '#E5E7EB' },
  bannerLineDone: { backgroundColor: '#059669' },
  bannerDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center',
  },
  bannerDotDone:  { backgroundColor: '#059669' },
  bannerDotActive:{ backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: '#059669' },
  bannerDotPulse: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#059669' },
  bannerBarBg: {
    height: 4, backgroundColor: '#E5E7EB', borderRadius: 2,
    marginHorizontal: 16, marginBottom: 14,
  },
  bannerBarFill:  { height: 4, backgroundColor: '#059669', borderRadius: 2 },
  bannerStats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  bannerStat:    { flex: 1, alignItems: 'center' },
  bannerStatVal: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  bannerStatLbl: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  bannerStatDiv: { width: 1, height: 32, backgroundColor: '#E5E7EB', alignSelf: 'center' },

  /* ── BUOD tab: Predicted Harvest Graph (Card 2) ── */
  predCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  predHeader:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  predTitle:     { fontSize: 13, fontWeight: '700', color: '#111827' },
  predSub:       { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  predBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF7ED', borderRadius: 9999,
    paddingVertical: 4, paddingHorizontal: 8,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  predBadgeText: { fontSize: 11, fontWeight: '700', color: '#D97706' },
  predBarsRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 104, marginBottom: 4 },
  predBarCol:    { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  predBarVal:    { fontSize: 9, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  predBar:       { width: '78%', borderRadius: 3 },
  predBarDashed: { borderRadius: 4 },
  predBarLabel:  { fontSize: 8, color: '#9CA3AF', textAlign: 'center', marginTop: 4, lineHeight: 11 },
  predBaseline:  { height: 1.5, backgroundColor: '#E5E7EB', borderRadius: 1, marginBottom: 10 },
  predFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6',
  },
  predFooterChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  predDot:        { width: 8, height: 8, borderRadius: 2 },
  predFooterText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  /* ── BUOD tab: Upcoming Tasks (Card 3) ── */
  todoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  todoHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  todoLogBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', borderRadius: 9999,
    paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  todoLogBtnText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  todoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  todoDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  todoDotActive:     { backgroundColor: '#059669' },
  todoTitle:         { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
  todoDayBadge:      { backgroundColor: '#F3F4F6', borderRadius: 9999, paddingVertical: 3, paddingHorizontal: 8 },
  todoDayBadgeActive:{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  todoDayText:       { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  todoDayTextActive: { color: '#059669' },
});