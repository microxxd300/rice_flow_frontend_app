import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions, Animated, Easing, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Text as SvgText, Line } from 'react-native-svg';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '../components';

import { useAccessibility } from '../context/AccessibilityContext';
import { useTranslation } from '@/i18n/useTranslation';
import { apiProgress, apiPredictions, apiScan } from '@/services/apiService';
import { useStepWeather } from '@/hooks/useFarmForecast';
import { answerSowing, loadGuide, refreshCycle } from '@/services/guideLoader';
import { useLanguageStore } from '@/store/languageStore';
import { shortDate } from '@/components/SowingQuestion';
import { SOWING_KEY, daysAgoISO } from '@/utils/sowing';
import { ADVICE_TEXT } from '@/utils/stepWeather';
import { useAppStore } from '@/store/appStore';
import { guideSteps, guideProgress, guideDay } from '@/utils/guideSteps';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { cropDays } from '@/utils/cropDays';
import { CAVAN_KG } from '@/utils/harvest';
import { seasonLabel } from '@/utils/formatting';
import { ISSUE_TO_API, LOG_WORD_KEYS, STAGE_NO, cachedActiveCycleLogs, fetchActiveCycleLogs, mergeLogs, stageLabel } from '@/utils/progressLogs';

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
  'Land Prep & Planting', 'Early Growth', 'Tillering', 'Stem Elongation',
  'Panicle Initiation', 'Heading', 'Grain Filling', 'Ripening', 'Harvesting', 'Post-Harvest',
];

// The log form: what the farmer logs decides which fields show
type LogKind = '' | 'step' | 'problem' | 'note';
const LOG_KINDS: { key: Exclude<LogKind, ''>; icon: IoniconsName; label: string }[] = [
  { key: 'step',    icon: 'checkmark-done-outline', label: 'plogKindStep' },
  { key: 'problem', icon: 'warning-outline',        label: 'plogKindProblem' },
  { key: 'note',    icon: 'create-outline',         label: 'plogKindNote' },
];
// What the problem is (values stay English: ISSUE_TO_API sends them to the server)
const PROBLEM_OPTIONS: { value: string; icon: IoniconsName }[] = [
  { value: 'Insect',   icon: 'bug-outline' },
  { value: 'Disease',  icon: 'medkit-outline' },
  { value: 'Flood',    icon: 'water-outline' },
  { value: 'Drought',  icon: 'sunny-outline' },
  { value: 'Nutrient', icon: 'color-palette-outline' },
  { value: 'Other',    icon: 'help-circle-outline' },
];

// The words the farmer sees for each log choice. The saved values stay English: the
// server and STAGE_NO / ISSUE_TO_API read them.


// ── Animated empty-state for Kasaysayan ng Ani ──
// A "ghost" line draws itself from the top-left curving down to zero on the
// baseline, then erases and redraws — visually says "wala pang data, papunta sa zero".
const AnimatedPath = Animated.createAnimatedComponent(Path);

// The server's growth stages run 1..10; from Harvesting (9) on, the harvest is asked for
const STAGE_COUNT      = 10;
// Tallest bar in the Trends yield chart
const BAR_MAX_H        = 120;
const HARVEST_STAGE_NO = 9;

const EmptyYieldChart: React.FC<{ width: number; onRecord: () => void }> = ({
  width, onRecord,
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
    <View style={[s.card, { padding: 20 }]}>
      {/* The expected yield has its own card above, so no badge here */}
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 14, color: '#111827', fontFamily: 'Inter_600SemiBold' }}>Yield History</Text>
      </View>

      <Svg width={width} height={svgH}>
        <Defs>
          <LinearGradient id="emptyGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#9CA3AF" stopOpacity={0.10} />
            <Stop offset="100%" stopColor="#9CA3AF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {/* baseline */}
        <Line x1={pad.l} y1={baseY} x2={pad.l + cW} y2={baseY} stroke="#E5E7EB" strokeWidth={1} />
        {/* faint guide area under the curve */}
        <Path d={`${dPath} L ${pad.l + cW},${baseY} L ${pad.l},${baseY} Z`} fill="url(#emptyGrad)" />
        {/* the animated ghost line — grey so it reads as a placeholder, not as real yields */}
        <AnimatedPath
          d={dPath}
          stroke="#D1D5DB"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={LEN}
          strokeDashoffset={dashOffset as any}
        />
        {/* end dot pinned at zero */}
        <Circle cx={pad.l + cW} cy={baseY} r={3} fill="#9CA3AF" opacity={0.5} />
      </Svg>

      <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>
        No harvest recorded yet. Record your first harvest to see your yield history.
      </Text>
      <TouchableOpacity
        onPress={onRecord}
        activeOpacity={0.85}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 6, marginTop: 14,
          height: 46, borderRadius: 16,
          backgroundColor: PAGE,
        }}
      >
        <Ionicons name="add" size={16} color="#111827" />
        <Text style={{ fontSize: 13, color: '#111827', fontFamily: 'Inter_600SemiBold' }}>Record Harvest</Text>
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
  const logWord = (value: string): string => (tr as any)[LOG_WORD_KEYS[value]] ?? value;

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
  const selectedFarm = useSelectedFarm();
  const selectedFarmId = selectedFarm?.id;
  // Loaded before in this session (or preloaded when the app opened): shown at once and
  // refreshed quietly, so the tab does not flash skeletons on every visit
  const cached = cachedActiveCycleLogs(selectedFarmId);
  // Real active cycle only (null until loaded or when there is none) — never a sample cycle
  const [loadedCycle,  setCurrentCycle] = useState<any>(cached?.cycle ?? null);
  const [logStage,     setLogStage]     = useState('');
  const [logDate,      setLogDate]      = useState(daysAgoISO(0));   // the phone's day, not UTC's
  const [pickDate,     setPickDate]     = useState(false);
  const [logIssue,     setLogIssue]     = useState('');
  const [logSeverity,  setLogSeverity]  = useState<'' | 'Low' | 'Medium' | 'High'>('');
  const [logAction,    setLogAction]    = useState('');
  const [logNotes,     setLogNotes]     = useState('');
  const [openStage,    setOpenStage]    = useState(false);
  const [growthStages, setGrowthStages] = useState<any[]>(cached?.stages ?? []);
  const [savingLog,    setSavingLog]    = useState(false);
  // The guide step this log finishes: opened from "Log this step", or the current step
  const [logStep,      setLogStep]      = useState<string | null>(null);
  const [logKind,      setLogKind]      = useState<LogKind>('');
  const finishesStep = logKind === 'step';

  const { activeCycle, farms } = useAppStore();
  // A newer copy of this cycle in the store (refreshCycle, after a log or a sowing answer)
  // wins, so its stage and dates change at once
  const currentCycle = activeCycle && loadedCycle && activeCycle.id === loadedCycle.id ? activeCycle : loadedCycle;
  // The log's growth stage fills in from the crop's stage (the cycle follows the guide);
  // the farmer only picks one to correct it
  const autoStage  = stageLabel((currentCycle as any)?.stage?.stage_no);
  const shownStage = logStage || autoStage;
  // Skeletons only when there is nothing to show yet
  const [cycleLoading, setCycleLoading] = useState(!cached);

  // Load real cycles and logs on mount AND whenever the selected farm changes
  useEffect(() => {
    const load = async () => {
      try {
        const { cycle, stages, logs } = await fetchActiveCycleLogs(selectedFarmId);
        setGrowthStages(stages);
        if (cycle) {
          setCurrentCycle(cycle);
          useAppStore.getState().setActiveCycle(cycle);
          if (logs.length > 0) {
            useAppStore.getState().setProgressLogs(mergeLogs(logs, useAppStore.getState().progressLogs));
          }
        }
      } catch {}
      finally { setCycleLoading(false); }
    };
    const known = cachedActiveCycleLogs(selectedFarmId);
    if (known) {
      setCurrentCycle(known.cycle);
      setGrowthStages(known.stages);
    }
    setCycleLoading(!known);
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
  // The planted crop's season (sowing to expected harvest) first; the top variety's otherwise
  const cycleDays       = cropDays(plantingDateStr, (currentCycle as any)?.expected_harvest_date)?.total
    ?? variety?.maturity_days ?? 115;
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
  // Sowing still ahead: the cycle follows the guide's sowing day, which is set
  // after seed and land preparation. Days until then, else null.
  const daysToSowing    = (() => {
    if (!plantingDateStr || hasRealCycle) return null;
    const d = new Date(plantingDateStr);
    if (isNaN(d.getTime())) return null;
    const until = Math.ceil((d.getTime() - today.getTime()) / 86400000);
    return until > 0 && until <= 60 ? until : null;
  })();
  const sowingLabel     = daysToSowing ? tr.cycSowIn.replace('{n}', String(daysToSowing)) : null;
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
  // The server's date follows the variety actually planted (the farmer's pick)
  const serverHarvest   = (currentCycle as any)?.expected_harvest_date
    ? new Date((currentCycle as any).expected_harvest_date) : null;
  const plannedStart    = cycleStart ?? (daysToSowing ? new Date(plantingDateStr) : null);
  const harvestDate     = !plannedStart ? null
    : serverHarvest && !isNaN(serverHarvest.getTime()) ? serverHarvest
    : new Date(plannedStart.getTime() + cycleDays * 86400000);
  const harvestLabel    = harvestDate ? `${MONTHS_SHORT[harvestDate.getMonth()]} ${harvestDate.getDate()}` : 'Oct 9';
  // The server's stage: days since sowing or the guide steps logged, whichever is further
  const serverStage     = stageLabel((currentCycle as any)?.stage?.stage_no);
  const activeStage     = serverStage ? logWord(serverStage) : (() => {
    const i = Math.min(CROP_STAGES.length - 1, Math.floor((cyclePct / 100) * CROP_STAGES.length));
    return CROP_STAGES[i]?.stage ?? 'Panicle Initiation';
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
          farm_id:           farmId,
          variety_id:        currentCycle?.variety ?? variety?.id,
          season:            currentCycle?.season,
        });
        const tons = +(res.data.predicted_yield_t_ha * farmArea).toFixed(1);
        setPredictedYield(tons);
        setPredModel(res.data.model_used);
        setPredR2(res.data.r2_score);
      } catch {}
    })();
  }, [selectedFarmId, variety, farmArea, currentCycle?.id]);

  // The PalayCheck guide, one step at a time (same rule as the Planting tab and Home)
  const completedSteps = useAppStore(s => s.completedGuideSteps);
  const guideList      = guideSteps(latestGuide);
  const guideNow       = guideProgress(guideList, completedSteps);
  const logStepTarget  = guideList.find(st => st.id === (logStep ?? guideNow.current?.id));
  // Today's day of the guide (0 = sowing); a step before it is overdue
  const guideToday     = guideDay(latestGuide);

  // "Log this step" opens the form for one step; a closed form forgets it
  const openLogFor = (stepId: string) => {
    setLogStep(stepId);
    setLogKind('step');
    setShowAddLog(true);
  };
  const closeLog = () => {
    setShowAddLog(false);
    setLogStep(null);
    setLogKind('');
    setLogDate(daysAgoISO(0));
    setPickDate(false);
  };
  // Sent from the Planting tab or Home's Upcoming Tasks
  const pendingLogStep = useAppStore(s => s.pendingLogStep);
  useEffect(() => {
    if (!pendingLogStep) return;
    setSelectedTab('logs');
    openLogFor(pendingLogStep);
    useAppStore.getState().setPendingLogStep(null);
  }, [pendingLogStep]);

  // What the weather means for the step this log finishes
  const { adviceFor } = useStepWeather();
  const logWeather = finishesStep ? adviceFor(logStepTarget) : null;

  // Real seasonal yields — one record per cycle that has a saved yield
  const [realYields, setRealYields] = useState<{ season: string; yieldTons: number; tHa: number | null }[]>([]);
  useEffect(() => {
    const load = async () => {
      try {
        const farmId    = selectedFarmId;
        const cyclesRes = await apiProgress.listCycles(farmId);
        const cycles    = cyclesRes.data ?? [];
        const out: { season: string; yieldTons: number; tHa: number | null }[] = [];
        for (const c of cycles) {
          try {
            const y = await apiProgress.getYield(c.id);
            // The yield record carries kilograms (same field the Reports screen reads)
            const kg = y.data?.net_yield_kg;
            if (kg != null) {
              out.push({ season: seasonLabel(c), yieldTons: +(kg / 1000).toFixed(1), tHa: c.yield_per_ha ?? null });
            }
          } catch {}
        }
        setRealYields(out.reverse());   // the server lists the newest first
      } catch {}
    };
    load();
  }, [selectedFarmId]);

  const handleSaveLog = async () => {
    if (savingLog) return;
    if (!currentCycle?.id) {
      Alert.alert(tr.plogNoSeasonT, tr.plogNoSeasonB);
      return;
    }
    if (logKind === 'problem' && !logIssue) {
      Alert.alert(tr.plogKindProblem, tr.plogNeedIssue);
      return;
    }
    if (logKind === 'note' && !logNotes.trim()) {
      Alert.alert(tr.plogKindNote, tr.plogNeedNote);
      return;
    }
    // Only a problem log has an issue
    const issueClean = logKind === 'problem' ? logIssue.trim() : '';
    const issueIsReal = !!issueClean;
    const stageName   = shownStage;
    const doneStep    = finishesStep && logStepTarget && !isNaN(Number(logStepTarget.id)) ? logStepTarget : null;

    // Save to the server first; the log only shows in the app once the server has it.
    // Notes are required by the server, so a log without notes falls back to its step/stage/issue.
    const observation = logNotes.trim() || doneStep?.title
      || [stageName, issueIsReal ? issueClean : ''].filter(Boolean).join(' · ') || 'Field check';
    let saved: any;
    setSavingLog(true);
    try {
      const res = await apiProgress.createLog({
        farm_cycle:   currentCycle.id,
        log_date:     logDate,
        growth_stage: growthStages.find((g: any) => g.stage_no === STAGE_NO[stageName])?.id ?? null,
        issue_type:   issueIsReal ? (ISSUE_TO_API[issueClean] ?? 'other') : '',
        severity:     issueIsReal ? (logSeverity || 'Low').toLowerCase() : '',
        action_taken: issueIsReal ? logAction.trim() : '',
        observation,
        guide_step:   doneStep ? Number(doneStep.id) : null,
      });
      saved = res.data;
    } catch {
      Alert.alert(tr.plogNotSavedT, tr.plogNotSavedB);
      return;
    } finally {
      setSavingLog(false);
    }

    const newLog = {
      id:            String(saved.id),
      cycleId:       String(currentCycle.id),
      logDate,
      growthStage:   stageName,
      observedIssue: issueClean || 'None',
      severity:      issueIsReal ? (logSeverity || 'Low') : '',
      actionTaken:   issueIsReal ? logAction.trim() : '',
      notes:         logNotes.trim() || doneStep?.title || '',
    };
    useAppStore.getState().addProgressLog(newLog);
    // The server marked the step done with the log; the guide moves on to the next step
    if (doneStep) useAppStore.getState().markGuideStepDone(doneStep.id);

    // In-app notification (always fires) with deep-link to the relevant guide category
    {
      const text = `${logIssue} ${logNotes}`.toLowerCase();
      let category: string | undefined;
      let label    = '';
      let icon     = 'document-text-outline';
      if (/peste|insekto|pesticide|brown ?spot|blast|sheath|disease|sakit/i.test(text)) {
        category = 'pest_prevention'; label = 'Pest Prevention'; icon = 'shield-checkmark-outline';
      } else if (/dilaw|yellow|nutrient|nitrogen|potassium|pataba|fertilizer/i.test(text)) {
        category = 'fertilizer';      label = 'Fertilizer';          icon = 'flask-outline';
      } else if (/water|flood|baha|tubig|drain|patubig|tagtuyot|\btuyot\b|drought/i.test(text)) {
        category = 'irrigation';      label = 'Irrigation';          icon = 'water-outline';
      } else if (/harvest|anihan|panicle|grain|\bani\b/i.test(text)) {
        category = 'harvesting';      label = 'Harvesting';          icon = 'basket-outline';
      }
      useAppStore.getState().addNotification({
        title: label ? `Check the ${label} guide` : 'Field log saved',
        body:  label
          ? `Based on your log, check the ${label} guide.`
          : 'Your field observation was recorded.',
        category, icon,
      });
    }
    setLogIssue(''); setLogSeverity(''); setLogAction(''); setLogNotes('');
    setLogStage(''); closeLog();
    afterGuideLog(doneStep?.key, saved?.sowing_estimate);
  };

  // The crop cycle follows the guide: after a step is logged, its stage (and, for the
  // sowing step, every date) comes back from the server
  const afterGuideLog = (stepKey: string | undefined, sowingEstimate: string | undefined) => {
    const language = useLanguageStore.getState().language;
    const recId = useAppStore.getState().latestRecommendation?.id;
    if (stepKey === SOWING_KEY && recId) {
      loadGuide(recId, language).catch(() => {});   // the plan moved to the real sowing day
    }
    void refreshCycle();
    if (sowingEstimate) {
      // A later step logged before sowing: confirm the sowing day it implies
      const date = shortDate(sowingEstimate, tr);
      Alert.alert(tr.sowEstTitle.replace('{date}', date), tr.sowEstBody.replace('{date}', date), [
        { text: tr.sowLater, style: 'cancel' },
        { text: tr.sowEstChange, onPress: () => navigation.navigateDeprecated('PlantingTab') },
        { text: tr.sowEstYes, onPress: () => {
          answerSowing(true, sowingEstimate, language).catch(() => Alert.alert(tr.sowAskTitle, tr.sowFailed));
        } },
      ]);
    } else if (stepKey === 'harvest') {
      // The season ends when its yield is saved
      Alert.alert(tr.harvestAskTitle, tr.harvestAskBody, [
        { text: tr.sowLater, style: 'cancel' },
        { text: tr.harvestAskYes, onPress: () => navigation.navigateDeprecated('YieldRecord') },
      ]);
    }
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
    const title = (log.growthStage ? logWord(log.growthStage) : '') || log.notes || '—';

    return (
      <View key={idx} style={[s.logRow, !isLast && s.logRowDivider]}>
        <View style={s.logDateCol}>
          <Text style={[s.logDateMo,  T && { fontSize: 11 }]}>{fmtMonth(log.logDate)}</Text>
          <Text style={[s.logDateDay, T && { fontSize: 19 }]}>{fmtDay(log.logDate)}</Text>
        </View>
        <View style={s.logContentCol}>
          {/* A step log may have no stage: its note (the step) is the title then */}
          <Text style={[s.logRowTitle, T && { fontSize: 16 }]} numberOfLines={2}>{title}</Text>
          {subBits.length > 0 ? (
            <Text style={[s.logRowSub, T && { fontSize: 13 }]} numberOfLines={2}>
              {subBits.join(' · ')}
            </Text>
          ) : null}
          {log.notes && title !== log.notes ? (
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
          <View>
            <Text style={[s.headerTitle, T && { fontSize: 24 }]}>{tr.progressHeader}</Text>
            <Text style={s.headerSub}>
              {currentCycle
                ? seasonLabel(currentCycle).replace(' ', ' Season ')
                : tr.plogNoCycle}
            </Text>
          </View>
        </View>
        <View style={s.headerBtn}><NotificationBell color="#111827" size={20} /></View>
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
                <Text
                  style={[s.segText, active && s.segTextActive, T && { fontSize: 14 }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB 1: OVERVIEW: how the crop is doing (Home has what to do today) */}
        {selectedTab === 'overview' && (() => {
          const cW2 = Dimensions.get('window').width - 80;
          const days      = cropDays(plantingDateStr, (currentCycle as any)?.expected_harvest_date);
          const stageNo   = (currentCycle as any)?.stage?.stage_no ?? null;
          const nextStage = stageNo != null && stageNo < STAGE_COUNT ? logWord(stageLabel(stageNo + 1)) : '';
          const stepsDone = guideList.filter(st => completedSteps.includes(st.id)).length;
          const problems  = storeLogs.filter((l: any) => {
            const issue = String(l.observedIssue ?? l.observed_issue ?? '').trim();
            return !!issue && issue !== 'None' && issue !== 'Wala';
          }).length;
          const showYield  = hasRealCycle && predictedYield != null;
          const sacks      = showYield ? Math.round((predictedYield! * 1000) / CAVAN_KG) : null;
          const harvestDue = stageNo != null && stageNo >= HARVEST_STAGE_NO && (currentCycle as any)?.yield_per_ha == null;
          return (
            <>
              {/* The season: today's stage on the 10-stage track, the day and the harvest date */}
              <View style={[s.card, s.ovCard]}>
                <View style={s.ovHead}>
                  <Text style={s.ovLabel}>{tr.ovStageNow}</Text>
                  {cycleLoading && <ActivityIndicator size="small" color="#059669" />}
                </View>
                {cycleLoading
                  ? <SkelBar w={190} h={26} br={6} />
                  : <Text style={[s.ovStage, T && { fontSize: 24 }]}>{currentCycle ? activeStage : tr.plogNoCycle}</Text>}
                {!!nextStage && !cycleLoading && (
                  <Text style={[s.ovSub, T && { fontSize: 14 }]}>{tr.ovNext.replace('{stage}', nextStage)}</Text>
                )}
                <View style={s.stageTrack}>
                  {Array.from({ length: STAGE_COUNT }, (_, i) => i + 1).map(no => (
                    <View
                      key={no}
                      style={[s.stageSeg, stageNo != null && no < stageNo && s.stageSegDone, no === stageNo && s.stageSegNow]}
                    />
                  ))}
                </View>
                <View style={s.ovStats}>
                  {[
                    { lbl: tr.cycCurrent,       val: days && days.day >= 1 ? `${tr.cycDayPrefix} ${days.day}` : (sowingLabel ?? '—') },
                    { lbl: tr.cycDone,          val: days && days.total && days.day >= 1 ? `${Math.round(days.share * 100)}%` : '—' },
                    { lbl: tr.progressExpected, val: harvestDate ? harvestLabel : '—' },
                  ].map(c => (
                    <View key={c.lbl} style={{ flex: 1 }}>
                      <Text style={[s.ovStatLbl, T && { fontSize: 13 }]} numberOfLines={1}>{c.lbl}</Text>
                      {cycleLoading
                        ? <View style={{ marginTop: 6 }}><SkelBar w={52} h={16} br={4} /></View>
                        : <Text style={[s.ovStatVal, T && { fontSize: 18 }]}>{c.val}</Text>}
                    </View>
                  ))}
                </View>
              </View>

              {/* Expected harvest from the yield model, in tons and sacks */}
              <View style={[s.card, s.ovCard]}>
                <Text style={s.ovLabel}>{tr.cycExpectedYield}</Text>
                <View style={s.ovBigRow}>
                  <Text style={s.ovBig}>{showYield ? predictedYield!.toFixed(1) : '—'}</Text>
                  {showYield && <Text style={s.ovBigUnit}>{tr.ovTons}</Text>}
                </View>
                <Text style={[s.ovSub, T && { fontSize: 14 }]}>
                  {sacks != null
                    ? tr.ovSacks.replace('{n}', String(sacks)).replace('{ha}', String(farmArea))
                    : tr.ovYieldLater}
                </Text>
                {harvestDue && (
                  <TouchableOpacity style={s.ovDarkBtn} onPress={() => navigation.navigateDeprecated('YieldRecord')} activeOpacity={0.85}>
                    <Ionicons name="basket-outline" size={17} color="#FFFFFF" />
                    <Text style={s.ovDarkBtnText}>{tr.harvestAskYes}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* This season in three tiles */}
              <View style={s.tiles}>
                {[
                  { lbl: tr.cycHealth,     val: healthScore != null ? String(healthScore) : '—', unit: healthScore != null ? '/100' : '' },
                  { lbl: tr.ovStepsDone,   val: guideList.length ? String(stepsDone) : '—',      unit: guideList.length ? `/${guideList.length}` : '' },
                  { lbl: tr.ovProblems,    val: String(problems),                                  unit: '' },
                ].map(m => (
                  <View key={m.lbl} style={s.tile}>
                    <Text style={[s.tileLbl, T && { fontSize: 13 }]} numberOfLines={2}>{m.lbl}</Text>
                    <View style={s.tileValRow}>
                      <Text style={[s.tileVal, T && { fontSize: 26 }]}>{m.val}</Text>
                      {!!m.unit && <Text style={s.tileUnit}>{m.unit}</Text>}
                    </View>
                  </View>
                ))}
              </View>

              {/* Card 3: Yield trend — animated empty state (line draws down to zero) */}
              {realYields.length === 0 ? (
                <EmptyYieldChart
                  width={cW2}
                  onRecord={() => navigation.navigateDeprecated('YieldRecord')}
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
                        <Text style={s.predBadgeText}>{expectedYield}t expected</Text>
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
                        { color: '#D97706', label: 'Latest', dot: true },
                        { color: '#1F6B3F', label: 'Past seasons', dot: true },
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
                onPress={() => navigation.navigateDeprecated('YieldRecord')}
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
                  Log your first field observation{'\n'}to get started.
                </Text>
              </View>
            )}
          </>
        )}

        {/* TAB 3: TRENDS: how this farm changes from season to season */}
        {selectedTab === 'trends' && (() => {
          const shortLabel = (season: string) =>
            season.replace('Dry ', 'D').replace('Wet ', 'W').replace('20', "'");
          // Past harvests (t/ha, oldest first), then this season's expected yield
          const past     = realYields.filter(y => y.tHa != null).slice(-5);
          const thisTHa  = hasRealCycle && predictedYield != null && (currentCycle as any)?.yield_per_ha == null
            ? +(predictedYield / Math.max(farmArea, 0.1)).toFixed(1) : null;
          const bars = [
            ...past.map((y, i) => ({ key: `p${i}`, label: shortLabel(y.season), value: y.tHa as number, now: false })),
            ...(thisTHa != null ? [{ key: 'now', label: tr.trThisSeason, value: thisTHa, now: true }] : []),
          ];
          const maxV     = Math.max(1, ...bars.map(b => b.value));
          const headline = thisTHa ?? (past.length ? past[past.length - 1].tHa as number : null);
          const prev     = thisTHa != null ? past[past.length - 1]?.tHa : past[past.length - 2]?.tHa;
          const delta    = headline != null && prev ? Math.round(((headline - prev) / prev) * 100) : null;

          return (
            <>
              {/* ── Yield per season: bars like the reference's score chart ── */}
              <View style={[s.trendCard, { marginTop: 4 }]}>
                <Text style={s.ovLabel}>{tr.trYieldTitle}</Text>
                {bars.length === 0 ? (
                  <Text style={[s.ovSub, { marginTop: 0 }]}>{tr.yieldNeedCycle}</Text>
                ) : (
                  <>
                    <View style={s.ovBigRow}>
                      <Text style={s.ovBig}>{headline != null ? headline.toFixed(1) : '—'}</Text>
                      <Text style={s.ovBigUnit}>t/ha</Text>
                      {delta != null && (
                        <View style={[s.deltaPill, { backgroundColor: delta >= 0 ? '#E8F5EF' : '#FDECEC' }]}>
                          <Ionicons name={delta >= 0 ? 'arrow-up' : 'arrow-down'} size={12} color={delta >= 0 ? '#059669' : '#B91C1C'} />
                          <Text style={[s.deltaText, { color: delta >= 0 ? '#059669' : '#B91C1C' }]}>{Math.abs(delta)}%</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.ovSub, T && { fontSize: 14 }]}>
                      {thisTHa != null ? tr.trExpectedNow : tr.trLastHarvest}
                      {delta != null ? ` · ${tr.trVsLast}` : ''}
                    </Text>
                    <View style={s.bars}>
                      {bars.map(b => (
                        <View key={b.key} style={s.barCol}>
                          <Text style={[s.barVal, b.now && { color: '#059669' }]}>{b.value.toFixed(1)}</Text>
                          <View style={[s.bar, {
                            height: Math.max(8, Math.round((b.value / maxV) * BAR_MAX_H)),
                            backgroundColor: b.now ? '#059669' : '#111827',
                            opacity: b.now ? 0.85 : 1,
                          }]} />
                          <Text style={[s.barLbl, b.now && { color: '#059669' }]} numberOfLines={1}>{b.label}</Text>
                        </View>
                      ))}
                    </View>
                    {past.length === 0 && <Text style={[s.ovSub, { marginTop: 12 }]}>{tr.trRecordToCompare}</Text>}
                  </>
                )}
              </View>

              {/* ── Plant health: one score, three things it watches ── */}
              {(() => {
                if (recentLogs.length === 0) {
                  return (
                    <View style={[s.trendCard, { alignItems: 'center', paddingVertical: 28 }]}>
                      <View style={s.logEmptyIconWrap}><Ionicons name="shield-checkmark-outline" size={26} color="#059669" /></View>
                      <Text style={[s.logEmptySub, { color: '#111827' }]}>{tr.healthNoLogs}</Text>
                    </View>
                  );
                }
                // Classify each recent log into one of 3 categories using the same regex as notifications
                const SEV_RANK: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
                const worst = (cat: 'insekto' | 'sakit' | 'tubig'): string => {
                  const re = cat === 'insekto'
                    ? /insect|\bpest\b|peste|insekto|brown ?planthopper|stem ?borer/i
                    : cat === 'sakit'
                    ? /sakit|blast|sheath|brown ?spot|disease/i
                    : /water|weather|flood|baha|tubig|drain|patubig|tagtuyot|\btuyot\b|drought/i;
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

                const tiles = [
                  { icon: 'bug-outline'   as const, label: tr.healthInsect,  value: insekto },
                  { icon: 'leaf-outline'  as const, label: tr.healthDisease, value: sakit },
                  { icon: 'water-outline' as const, label: tr.healthWater,   value: labelFor('tubig', tubig) },
                ];
                return (
                  <TouchableOpacity style={s.trendCard} onPress={() => setSelectedTab('logs')} activeOpacity={0.85}>
                    <View style={s.ovHead}>
                      <Text style={s.ovLabel}>{tr.progressPlantHealth}</Text>
                      <Text style={[s.deltaText, { color: overallColor }]}>{overallLabel}</Text>
                    </View>
                    <View style={s.ovBigRow}>
                      <Text style={s.ovBig}>{hs == null ? '—' : hs}</Text>
                      {hs != null && <Text style={s.ovBigUnit}>/100</Text>}
                    </View>
                    <Text style={[s.ovSub, T && { fontSize: 14 }]}>{tr.healthFromLogs.replace('{n}', String(recentLogs.length))}</Text>
                    <View style={[s.tiles, { marginTop: 16, marginBottom: 0 }]}>
                      {tiles.map(t => (
                        <View key={t.label} style={s.innerTile}>
                          <Ionicons name={t.icon} size={18} color="#111827" />
                          <Text style={[s.tileLbl, { marginTop: 10 }, T && { fontSize: 13 }]} numberOfLines={1}>{t.label}</Text>
                          <Text style={[s.innerTileVal, { color: colorFor(t.value) }]} numberOfLines={1}>{t.value}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* ── Guide on time: steps checked so far, by kind ── */}
              {(() => {
                const steps: any[] = Array.isArray((latestGuide as any)?.steps) ? (latestGuide as any).steps : [];
                const checkedIds = new Set(completedSteps);
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
                  const overdue = inCat.filter(s => !checkedIds.has(String(s.id)) && (s.daysAfterPlanting ?? 0) < guideToday).length;
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

                // Score only the steps that are due by today, so steps months ahead don't
                // pull the score down (all steps checked so far = 100%)
                const dueSteps   = steps.filter(s => (s.daysAfterPlanting ?? 0) < guideToday);
                const dueDone    = dueSteps.filter(s => checkedIds.has(String(s.id))).length;
                const adherence  = dueSteps.length > 0 ? Math.round((dueDone / dueSteps.length) * 100) : 100;
                const badge =
                  adherence >= 80 ? { label: tr.adhBadgeOnTrack, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' }
                  : adherence >= 50 ? { label: tr.adhBadgeImprove, color: '#D97706', bg: '#FFF7ED', border: '#FDE68A' }
                  :                   { label: tr.adhBadgeReview, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };

                if (buckets.length === 0) {
                  return (
                    <View style={[s.trendCard, { alignItems: 'center', paddingVertical: 24 }]}>
                      <View style={s.logEmptyIconWrap}><Ionicons name="book-outline" size={26} color="#059669" /></View>
                      <Text style={s.logEmptyTitle}>{tr.progressNoGuide}</Text>
                      <Text style={s.logEmptySub}>{tr.guideOpenTabHint}</Text>
                    </View>
                  );
                }
                return (
                  <TouchableOpacity style={s.trendCard} onPress={() => navigation.navigateDeprecated('PlantingTab')} activeOpacity={0.85}>
                    <View style={s.ovHead}>
                      <Text style={s.ovLabel}>{tr.progressGuideAdh}</Text>
                      <View style={[s.deltaPill, { backgroundColor: badge.bg }]}>
                        <Text style={[s.deltaText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>
                    <View style={s.ovBigRow}>
                      <Text style={s.ovBig}>{adherence}</Text>
                      <Text style={s.ovBigUnit}>%</Text>
                    </View>
                    <Text style={[s.ovSub, T && { fontSize: 14 }]}>
                      {tr.adhDayOf.replace('{d}', String(CURRENT_DAY)).replace('{total}', String(cycleDays))}
                    </Text>
                    <View style={{ marginTop: 14, gap: 14 }}>
                      {buckets.map(item => (
                        <View key={item.cat}>
                          <View style={s.ovHead}>
                            <Text style={[s.rowLabel, { fontFamily: 'Inter_600SemiBold' }, T && { fontSize: 15 }]}>{item.label}</Text>
                            <Text style={[s.ovStatLbl, item.done && { color: '#059669' }]}>{item.doneCt}/{item.total} · {item.status}</Text>
                          </View>
                          <View style={[s.progBg, { marginTop: 6, height: 8 }]}>
                            <View style={[s.progFill, { height: 8, width: `${Math.round((item.doneCt / item.total) * 100)}%` }]} />
                          </View>
                          <Text style={[s.ovStatLbl, { marginTop: 4 }]}>{item.detail}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* The whole history, every season and farm */}
              <TouchableOpacity
                onPress={() => navigation.navigateDeprecated('ReportsHome')}
                activeOpacity={0.85}
                style={s.ovDarkBtn}
              >
                <Ionicons name="document-text-outline" size={17} color="#FFFFFF" />
                <Text style={s.ovDarkBtnText}>{tr.progressFullReport}</Text>
              </TouchableOpacity>
            </>
          );
        })()}
      </ScrollView>

      {/* ADD LOG MODAL */}
      <Modal visible={showAddLog} transparent animationType="slide" onRequestClose={closeLog}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={closeLog} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[s.modalTitle, T && { fontSize: 19 }]}>{tr.plogModalTitle}</Text>
                <Text style={[s.modalSub, T && { fontSize: 14 }]}>{tr.plogModalSub}</Text>
              </View>
              <TouchableOpacity onPress={closeLog} style={s.modalCloseBtn} activeOpacity={0.75}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={s.modalContextRow}>
              {[
                { icon: 'home-outline' as const,     label: (selectedFarm as any)?.name ?? '—' },
                { icon: 'calendar-outline' as const, label: hasRealCycle ? `${tr.cycDayPrefix} ${CURRENT_DAY}` : sowingLabel ?? tr.plogNoCycle },
                { icon: 'sunny-outline' as const,    label: currentCycle ? seasonLabel(currentCycle) : '—' },
              ].map(c => (
                <View key={c.label} style={s.contextChip}>
                  <Ionicons name={c.icon} size={12} color="#6B7280" />
                  <Text style={[s.contextChipText, T && { fontSize: 13 }]}>{c.label}</Text>
                </View>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* What is this log? Only that kind's fields follow */}
              <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogWhat}</Text>
              <View style={s.kindRow}>
                {LOG_KINDS.filter(k => k.key !== 'step' || !!logStepTarget).map(k => {
                  const active = logKind === k.key;
                  return (
                    <TouchableOpacity
                      key={k.key}
                      style={[s.kindBtn, active && s.kindBtnOn]}
                      onPress={() => setLogKind(k.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name={k.icon} size={22} color={active ? '#FFFFFF' : '#059669'} />
                      <Text style={[s.kindText, active && s.kindTextOn, T && { fontSize: 14 }]}>{(tr as any)[k.label]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Finished a step: the guide moves on once this log is saved */}
              {logKind === 'step' && !!logStepTarget && (
                <View style={[s.stepToggle, s.stepToggleOn]}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stepToggleLabel, T && { fontSize: 13 }]}>{tr.plogFinishesStep}</Text>
                    <Text style={[s.stepToggleTitle, T && { fontSize: 15 }]} numberOfLines={2}>{logStepTarget.title}</Text>
                  </View>
                </View>
              )}
              {logWeather && (
                <View style={[s.logWeather, logWeather.level === 'stop' && s.logWeatherStop]}>
                  <Ionicons
                    name={logWeather.level === 'stop' ? 'warning' : 'rainy-outline'}
                    size={15}
                    color={logWeather.level === 'stop' ? '#B91C1C' : '#92400E'}
                  />
                  <Text style={[s.logWeatherText, logWeather.level === 'stop' && { color: '#B91C1C' }, T && { fontSize: 14 }]}>
                    {(tr as any)[ADVICE_TEXT[logWeather.code]]}
                  </Text>
                </View>
              )}

              {/* A problem: what it is, how bad, what was done */}
              {logKind === 'problem' && (
                <>
                  <View style={s.mFieldWrap}>
                    <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogWhatIssue} <Text style={s.mReq}>*</Text></Text>
                    <View style={s.issueGrid}>
                      {PROBLEM_OPTIONS.map(opt => {
                        const active = logIssue === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[s.issueBtn, active && s.issueBtnOn]}
                            onPress={() => setLogIssue(opt.value)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name={opt.icon} size={22} color={active ? '#FFFFFF' : '#111827'} />
                            <Text style={[s.issueText, active && s.issueTextOn, T && { fontSize: 13 }]} numberOfLines={2}>
                              {logWord(opt.value)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={s.mFieldWrap}>
                    <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogSeverity}</Text>
                    <View style={[s.segWrap, { marginTop: 0, marginBottom: 0 }]}>
                      {(['Low', 'Medium', 'High'] as const).map(opt => {
                        const active = (logSeverity || 'Low') === opt;
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
                              {logWord(opt)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={s.mFieldWrap}>
                    <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogAction}</Text>
                    <View style={s.mInputBox}>
                      <Ionicons name="hammer-outline" size={16} color="#9CA3AF" />
                      <TextInput
                        style={[s.mInput, T && { fontSize: 16 }]}
                        placeholder={tr.plogActionPh}
                        placeholderTextColor="#9CA3AF"
                        value={logAction}
                        onChangeText={setLogAction}
                      />
                    </View>
                  </View>
                </>
              )}

              {!!logKind && (
                <>
                  {/* The note: the whole log for a note, optional otherwise */}
                  <View style={s.mFieldWrap}>
                    <Text style={[s.mLabel, T && { fontSize: 14 }]}>
                      {logKind === 'note' ? tr.plogNotes : tr.plogNoteOpt}
                      {logKind === 'note' && <Text style={s.mReq}> *</Text>}
                    </Text>
                    <View style={[s.mInputBox, { alignItems: 'flex-start', paddingTop: 14, height: undefined, minHeight: 80 }]}>
                      <Ionicons name="document-text-outline" size={16} color="#9CA3AF" style={{ marginTop: 2 }} />
                      <TextInput
                        style={[s.mInput, { textAlignVertical: 'top', minHeight: 60 }, T && { fontSize: 16 }]}
                        placeholder={tr.plogNotesPh}
                        placeholderTextColor="#9CA3AF"
                        value={logNotes}
                        onChangeText={setLogNotes}
                        multiline
                      />
                    </View>
                  </View>

                  {/* The day: one tap for today or yesterday, typing only for another day */}
                  <View style={s.mFieldWrap}>
                    <Text style={[s.mLabel, T && { fontSize: 14 }]}>{tr.plogDate}</Text>
                    <View style={s.dateRow}>
                      {[{ label: tr.plogToday, value: daysAgoISO(0) }, { label: tr.plogYesterday, value: daysAgoISO(1) }].map(d => {
                        const active = !pickDate && logDate === d.value;
                        return (
                          <TouchableOpacity
                            key={d.value}
                            style={[s.dateChip, active && s.dateChipOn]}
                            onPress={() => { setLogDate(d.value); setPickDate(false); }}
                            activeOpacity={0.8}
                          >
                            <Text style={[s.dateChipText, active && s.dateChipTextOn, T && { fontSize: 14 }]}>{d.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      <TouchableOpacity
                        style={[s.dateChip, pickDate && s.dateChipOn]}
                        onPress={() => setPickDate(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={15} color={pickDate ? '#FFFFFF' : '#111827'} />
                        <Text style={[s.dateChipText, pickDate && s.dateChipTextOn, T && { fontSize: 14 }]}>{tr.plogPickDate}</Text>
                      </TouchableOpacity>
                    </View>
                    {pickDate && (
                      <View style={[s.mInputBox, { marginTop: 8 }]}>
                        <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                        <TextInput
                          style={[s.mInput, T && { fontSize: 16 }]}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#9CA3AF"
                          value={logDate}
                          onChangeText={setLogDate}
                        />
                      </View>
                    )}
                  </View>

                  {/* The stage fills in from the crop; one line, changed only if wrong */}
                  <TouchableOpacity style={s.stageLine} onPress={() => setOpenStage(v => !v)} activeOpacity={0.75}>
                    <Ionicons name="leaf-outline" size={14} color="#6B7280" />
                    <Text style={[s.stageLineText, T && { fontSize: 13 }]} numberOfLines={1}>
                      {tr.plogStageLine.replace('{stage}', shownStage ? logWord(shownStage) : '—')}
                    </Text>
                    <Text style={[s.stageLineChange, T && { fontSize: 13 }]}>{tr.plogChange}</Text>
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
                          <Text style={[s.mDropItemText, shownStage === opt && s.mDropItemActive, T && { fontSize: 15 }]}>{logWord(opt)}</Text>
                          {shownStage === opt && <Ionicons name="checkmark" size={16} color="#059669" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 }}>
                <TouchableOpacity style={s.mCancelBtn} onPress={closeLog} activeOpacity={0.7}>
                  <Text style={[s.mCancelBtnText, T && { fontSize: 15 }]}>{tr.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.mSaveBtn, (savingLog || !logKind) && { opacity: 0.5 }]}
                  onPress={handleSaveLog}
                  disabled={savingLog || !logKind}
                  activeOpacity={0.85}
                >
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

const PAGE = '#F1F2F1';   // the page gray behind the white cards (as on Home)

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE },
  stepToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, marginBottom: 16, backgroundColor: PAGE },
  stepToggleOn: { backgroundColor: '#E8F5EF' },
  stepCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  stepCheckOn:     { backgroundColor: '#059669', borderColor: '#059669' },
  stepToggleLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  stepToggleTitle: { fontSize: 13, color: '#111827', fontWeight: '700', marginTop: 2 },
  logWeather: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: -6, marginBottom: 16,
    borderWidth: 1, borderColor: '#FDE68A', backgroundColor: '#FFF7ED', borderRadius: 10, padding: 10,
  },
  logWeatherStop: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  logWeatherText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#92400E', fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingBottom: 130 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4,
  },
  titleIcon:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 21, color: '#111827', fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  headerSub:   { fontSize: 13, color: '#6B7280', marginTop: 1, fontFamily: 'Inter_500Medium' },
  headerBtn:   { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  bellDot:     { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' },

  /* Segmented control */
  segWrap: {
    flexDirection: 'row',
    backgroundColor: '#E4E6E4',
    borderRadius: 16,
    padding: 4,
    marginTop: 14,
    marginBottom: 4,
  },
  segItem: {
    flex: 1, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 12,
  },
  segItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segText:       { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  segTextActive: { color: '#111827', fontFamily: 'Inter_700Bold' },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#9CA3AF',
    letterSpacing: 0.8, marginTop: 24, marginBottom: 10,
  },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16,
    marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  /* Overview */
  ovCard:      { padding: 20, marginTop: 4 },
  ovHead:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ovLabel:     { fontSize: 14, color: '#111827', fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  ovStage:     { fontSize: 22, color: '#111827', fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  ovSub:       { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_500Medium', marginTop: 4 },
  stageTrack:  { flexDirection: 'row', gap: 4, marginTop: 16 },
  stageSeg:    { flex: 1, height: 10, borderRadius: 5, backgroundColor: PAGE },
  stageSegDone:{ backgroundColor: '#111827' },
  stageSegNow: { backgroundColor: '#059669' },
  ovStats:     { flexDirection: 'row', marginTop: 18 },
  ovStatLbl:   { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  ovStatVal:   { fontSize: 16, color: '#111827', fontFamily: 'Inter_700Bold', marginTop: 4 },
  ovBigRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  ovBig:       { fontSize: 48, lineHeight: 54, color: '#111827', fontFamily: 'Inter_700Bold', letterSpacing: -1.5 },
  ovBigUnit:   { fontSize: 16, color: '#6B7280', fontFamily: 'Inter_600SemiBold', marginBottom: 9 },
  ovDarkBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 18, backgroundColor: '#111827', marginTop: 16 },
  ovDarkBtnText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  tiles:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  innerTile:   { flex: 1, backgroundColor: PAGE, borderRadius: 18, padding: 12 },
  innerTileVal:{ fontSize: 15, marginTop: 2, fontFamily: 'Inter_700Bold' },
  deltaPill:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 9, marginLeft: 4, marginBottom: 9 },
  deltaText:   { fontSize: 12, fontFamily: 'Inter_700Bold' },
  bars:        { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 18, minHeight: BAR_MAX_H + 44 },
  barCol:      { alignItems: 'center', flex: 1, maxWidth: 64 },
  barVal:      { fontSize: 12, color: '#111827', marginBottom: 6, fontFamily: 'Inter_700Bold' },
  bar:         { width: 28, borderRadius: 14 },
  barLbl:      { fontSize: 11, color: '#6B7280', marginTop: 8, fontFamily: 'Inter_500Medium' },
  tile:        {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, minHeight: 112, justifyContent: 'space-between',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  tileLbl:     { fontSize: 12, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  tileValRow:  { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  tileVal:     { fontSize: 24, color: '#111827', fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  tileUnit:    { fontSize: 11, color: '#6B7280', fontFamily: 'Inter_600SemiBold', marginLeft: 2, marginBottom: 4 },

  trendCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  trendHarvestPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3DC', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  trendHarvestPillText: { fontSize: 12, color: '#B45309', fontFamily: 'Inter_700Bold' },
  cardHighlight: { borderColor: '#059669' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },

  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  rowLabel: { fontSize: 14, color: '#111827', fontFamily: 'Inter_500Medium' },
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
  logList: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 6, paddingHorizontal: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },

  /* Empty state — shows when there are no real logs yet */
  logEmpty: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  logEmptyIconWrap: { width: 60, height: 60, borderRadius: 20, backgroundColor: PAGE, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logEmptyTitle: { fontSize: 15, color: '#111827', marginBottom: 6, fontFamily: 'Inter_700Bold' },
  logEmptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19, fontFamily: 'Inter_500Medium' },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 12, gap: 14 },
  logRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  logDateCol: { width: 54, height: 54, borderRadius: 16, backgroundColor: PAGE, alignItems: 'center', justifyContent: 'center' },
  logDateMo: { fontSize: 10, color: '#6B7280', letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: 'Inter_600SemiBold' },
  logDateDay: { fontSize: 19, color: '#111827', lineHeight: 23, fontFamily: 'Inter_700Bold' },
  logContentCol: { flex: 1, paddingTop: 2 },
  logRowTitle: { fontSize: 15, color: '#111827', fontFamily: 'Inter_700Bold' },
  logRowSub: { fontSize: 13, color: '#374151', marginTop: 3, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  logRowNote: { fontSize: 13, color: '#6B7280', marginTop: 3, lineHeight: 18 },
  logRowSev: { fontSize: 11, alignSelf: 'flex-start', marginTop: 2, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: PAGE, overflow: 'hidden', fontFamily: 'Inter_700Bold' },

  /* Log tab buttons */
  logBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 12 },
  logActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 18 },
  logActionBtnPrimary: { backgroundColor: '#111827' },
  logActionBtnPrimaryText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  logActionBtnGhost: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  logActionBtnGhostText: { fontSize: 15, color: '#111827', fontFamily: 'Inter_600SemiBold' },

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
  progBg: { height: 10, backgroundColor: PAGE, borderRadius: 5, overflow: 'hidden' },
  progFill: { height: 10, borderRadius: 5, backgroundColor: '#059669' },
  progLabel: { fontSize: 12, color: '#6B7280', marginTop: 6, fontWeight: '600' },

  /* Modal */
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 32, maxHeight: '92%' },
  modalHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  modalTitle: { fontSize: 20, color: '#111827', letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  modalSub: { fontSize: 13, color: '#6B7280', marginTop: 2, fontFamily: 'Inter_500Medium' },
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: PAGE, justifyContent: 'center', alignItems: 'center' },
  modalContextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  contextChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PAGE, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  contextChipText: { fontSize: 12, color: '#374151', fontFamily: 'Inter_600SemiBold' },
  modalFieldLabel: {
    fontSize: 11, fontWeight: '600', color: '#9CA3AF',
    letterSpacing: 0.8, marginBottom: 8, marginTop: 14,
  },
  modalInput: { borderRadius: 16, backgroundColor: PAGE, paddingHorizontal: 16, minHeight: 52, justifyContent: 'center' },
  modalTextArea:  { minHeight: 88, justifyContent: 'flex-start', paddingVertical: 8 },
  modalInputText: { fontSize: 15, color: '#111827', flex: 1 },
  stageChipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  stageChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: PAGE, minHeight: 44, justifyContent: 'center' },
  stageChipActive: { backgroundColor: '#111827' },
  stageChipText: { fontSize: 14, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  stageChipTextActive: { color: '#FFFFFF' },
  modalActions: { gap: 8, marginTop: 16, marginBottom: 8 },

  /* Modal professional form */
  mFieldWrap: { marginBottom: 22 },
  mLabel: { fontSize: 14, color: '#111827', marginBottom: 10, fontFamily: 'Inter_700Bold' },
  mReq:        { color: '#EF4444' },
  mHint: { fontSize: 12, color: '#6B7280', marginTop: -4, marginBottom: 10, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  kindBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 4, borderRadius: 18, backgroundColor: PAGE },
  kindBtnOn: { backgroundColor: '#111827' },
  kindText: { fontSize: 13, color: '#111827', textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  kindTextOn:  { color: '#FFFFFF' },
  issueGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  issueBtn: { width: '31%', alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 16, backgroundColor: PAGE },
  issueBtnOn: { backgroundColor: '#111827' },
  issueText: { fontSize: 12.5, color: '#111827', textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  issueTextOn: { color: '#FFFFFF' },
  dateRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: PAGE, minHeight: 44, paddingHorizontal: 16 },
  dateChipOn: { backgroundColor: '#111827' },
  dateChipText: { fontSize: 14, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  dateChipTextOn: { color: '#FFFFFF' },
  stageLine: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: PAGE, marginBottom: 4 },
  stageLineText: { flex: 1, fontSize: 13, color: '#111827', fontFamily: 'Inter_500Medium' },
  stageLineChange: { fontSize: 13, color: '#059669', fontFamily: 'Inter_700Bold' },
  mInputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: PAGE, paddingHorizontal: 16, height: 52 },
  mInput: { flex: 1, fontSize: 15, color: '#111827', fontFamily: 'Inter_500Medium' },
  mDropMenu: { marginTop: 6, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  mDropItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  mDropItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  mDropItemText:   { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  mDropItemActive: { color: '#059669', fontWeight: '700' },
  /* Primary action — solid green, white text */
  mSaveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, backgroundColor: '#111827', borderRadius: 18 },
  mSaveBtnText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },

  /* Secondary action — ghost with hairline border */
  mCancelBtn: { flex: 1, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: PAGE },
  mCancelBtnText: { fontSize: 15, color: '#111827', fontFamily: 'Inter_600SemiBold' },

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