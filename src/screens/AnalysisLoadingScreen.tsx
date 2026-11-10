import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiFarms, apiScan, apiRecommendations } from '@/services/apiService';
import { fetchActiveCycleLogs } from '@/utils/progressLogs';
import { useAppStore } from '@/store/appStore';
import { useLanguageStore } from '@/store/languageStore';
import { translations } from '@/i18n/translations';

type Nav = StackNavigationProp<any>;
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const STEPS: { label: string; icon: IoniconsName }[] = [
  { label: 'Reading location',           icon: 'location-outline'    },
  { label: 'Checking soil profile',      icon: 'layers-outline'      },
  { label: 'Fetching rainfall data',     icon: 'rainy-outline'       },
  { label: 'Measuring elevation',        icon: 'trending-up-outline' },
  { label: 'Assessing flood risk',       icon: 'water-outline'       },
  { label: 'Scoring rice varieties',     icon: 'calculator-outline'  },
  { label: 'Picking the best match',     icon: 'ribbon-outline'      },
];

// Each step min display time (ms) — API may be slower, we wait for both
const STEP_DURATION = 900;
// After this long the screen says the soil and weather check can take up to a minute
const SLOW_AFTER_S = 12;
// While the server works on the last step the bar keeps creeping toward this, never 100 %
const WAIT_CAP = 0.97;
const WAIT_EASE_S = 15;      // how quickly it creeps (time constant, seconds)
// The steps advance on a timer, so the last one is reached this many seconds in
const LAST_STEP_AT_S = ((STEPS.length - 1) * STEP_DURATION) / 1000;

// The farm setup screens are in English, so this one is too
const TEXT = {
  errorTitle:   'We could not finish the analysis',
  networkError: 'RiceFlow could not be reached. Check your internet connection and try again.',
  genericError: 'Something went wrong while checking your farm. Please try again.',
  keepOpen:     'Please keep the app open.',
  slow:         'Checking soil and weather can take up to a minute.',
  tryAgain:     'Try again',
  back:         'Back',
};

/** A failed request with no answer from the server (offline, dropped, timed out). */
const isNetworkError = (err: any) =>
  !err?.response && /network|fetch failed|connection|timed? ?out|abort/i.test(String(err?.message ?? err));

export const AnalysisLoadingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<any>();
  const farmData   = route.params?.farmData ?? {};
  const existingFarm = route.params?.existingFarm;   // the next crop on a farm already saved

  const [completedCount, setCompletedCount] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);     // seconds since this attempt started
  const [attempt, setAttempt] = useState(0);     // bumped by "Try again"
  const ringPulse = useRef(new Animated.Value(1)).current;
  const [progress] = useState(() => new Animated.Value(0));  // 0..1, drives the bar width
  const [shine]    = useState(() => new Animated.Value(0));  // 0..1, sweeps across the bar
  const [trackWidth, setTrackWidth] = useState(0);

  // API results stored in refs to avoid stale closures
  const recommendationRef = useRef<any>(null);
  const scanRef           = useRef<any>(null);
  const apiDoneRef        = useRef(false);
  const animDoneRef       = useRef(false);
  const navigatedRef      = useRef(false);
  const startedRef        = useRef(-1);      // attempt already started: guards against a duplicate farm

  const tryNavigate = () => {
    if (apiDoneRef.current && animDoneRef.current && !navigatedRef.current) {
      navigatedRef.current = true;
      navigation.navigateDeprecated('SuitabilityResults', {
        farmData,
        recommendationData: recommendationRef.current,
        scanData: scanRef.current,
      });
    }
  };

  // Run the real API chain once per attempt. The guard prevents a second run —
  // and thus a duplicate farm — if the effect re-fires (StrictMode double-invoke,
  // fast refresh, or a remount).
  useEffect(() => {
    if (startedRef.current === attempt) return;
    startedRef.current = attempt;
    const run = async () => {
      let failed = false;
      let step = 'init';
      try {
        // The next crop in the same season: the saved top 3 still fit, so no new scan
        if (existingFarm) {
          step = 'reuse top 3';
          const reused = await apiRecommendations.reuse(existingFarm.id).catch(() => null);
          if (reused) {
            recommendationRef.current = reused.data.recommendation;
            scanRef.current = reused.data.scan;
            useAppStore.getState().startNewCrop();
            useAppStore.getState().setLatestRecommendation(reused.data.recommendation);
            const { cycle } = await fetchActiveCycleLogs(existingFarm.id);
            useAppStore.getState().setActiveCycle(cycle);
            animDoneRef.current = true;   // nothing was analyzed, so no steps to wait through
            return;
          }
        }

        step = 'build payload';
        // Round GPS coords to 6 decimals (~11 cm). The backend field is
        // DecimalField(max_digits=10, decimal_places=7), so a raw GPS value with
        // many decimals (e.g. 125.68301234567) exceeds 10 total digits and is
        // rejected. 6 decimals keeps it safely within the limit.
        const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
        const rawLat = farmData.latitude  ?? 7.3086;
        const rawLng = farmData.longitude ?? 125.6830;
        const farmPayload = {
          name:           farmData.farmName    || 'My Farm',
          barangay:       farmData.barangay    || '',
          area_hectares:  farmData.area        ? parseFloat(farmData.area) : 1.0,
          latitude:       round6(rawLat),
          longitude:      round6(rawLng),
          ecosystem:      farmData.ecosystem   || 'irrigated_lowland',
          elevation_m:    farmData.elevation_m ?? null,
          slope_pct:      null,
          location_confirmed: !!farmData.location_confirmed,
        };
        step = 'create farm';
        let farm = existingFarm;
        if (!farm) {
          const farmRes = await apiFarms.create(farmPayload);
          farm = farmRes.data;
          useAppStore.getState().addFarm(farm);
        }

        try {
          step = 'run scan';
          const scanRes = await apiScan.run(farm.id);
          const scan = scanRes.data;
          scanRef.current = scan;

          if (scan.flood_risk === 'High') {
            const words = translations[useLanguageStore.getState().language];
            useAppStore.getState().addNotification({
              title:    words.floodHighTitle,
              body:     words.floodHighBody,
              category: 'irrigation',
              icon:     'warning-outline',
            });
          }

          step = 'generate recommendation';
          const recRes = await apiRecommendations.generate(scan.id);
          recommendationRef.current = recRes.data;
          if (existingFarm) useAppStore.getState().startNewCrop();
          useAppStore.getState().setLatestRecommendation(recRes.data);
          if (existingFarm) {
            // The recommendation has just started the new crop cycle
            const { cycle } = await fetchActiveCycleLogs(farm.id);
            useAppStore.getState().setActiveCycle(cycle);
          }

          useAppStore.getState().addNotification({
            title: 'Your recommendations are ready',
            body:  'View the Top 3 rice varieties matched to your farm.',
            icon:  'ribbon-outline',
          });
        } catch (innerErr) {
          if (!existingFarm) {   // never delete a farm the farmer already had
            try { await apiFarms.delete(farm.id); } catch {}
            useAppStore.getState().removeFarm?.(farm.id);
          }
          throw innerErr;
        }
      } catch (err: any) {
        // The farm was removed above, so "Try again" starts cleanly; stay on this screen
        failed = true;
        console.warn(`[ANALYSIS] failed at ${step}:`, err?.response?.data ?? err?.message ?? err);
        setError(isNetworkError(err) ? TEXT.networkError : TEXT.genericError);
      } finally {
        if (!failed) {
          apiDoneRef.current = true;
          setApiDone(true);
          tryNavigate();
        }
      }
    };
    run();
  }, [attempt]);

  // Seconds counter: shows the farmer the app is still working (stops on an answer)
  useEffect(() => {
    if (apiDone || error) return;
    const start = Date.now() - elapsed * 1000;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only per attempt or when it ends
  }, [attempt, apiDone, error]);

  // A shine sweeps across the bar the whole time, so it never looks frozen
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(shine, {
      toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [shine]);

  // Advance one step at a time. The last step stays active until the server has
  // answered, so the screen never says "complete" while it is still waiting.
  useEffect(() => {
    if (error) return;
    if (completedCount >= STEPS.length) {
      animDoneRef.current = true;
      tryNavigate();
      return;
    }
    if (completedCount === STEPS.length - 1 && !apiDone) return;
    const t = setTimeout(() => setCompletedCount(c => c + 1), STEP_DURATION);
    return () => clearTimeout(t);
  }, [completedCount, apiDone, error]);

  const tryAgain = () => {
    apiDoneRef.current = false;
    animDoneRef.current = false;
    setApiDone(false);
    setElapsed(0);
    progress.setValue(0);
    setError(null);
    setCompletedCount(0);
    setAttempt(a => a + 1);
  };

  // Continuous gentle pulse on the leaf hero
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, { toValue: 1.06, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringPulse, { toValue: 1,    duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const isDone   = completedCount >= STEPS.length;
  const activeLabel = STEPS[Math.min(completedCount, STEPS.length - 1)].label;

  // Steps fill the bar; while the server works on the last one it keeps creeping
  // toward WAIT_CAP (slower and slower), and jumps to full once the answer is in
  const waiting = completedCount === STEPS.length - 1 && !apiDone;
  const stepFraction = Math.min(completedCount, STEPS.length) / STEPS.length;
  const waitSeconds  = waiting ? Math.max(0, elapsed - LAST_STEP_AT_S) : 0;
  const fraction = waiting
    ? stepFraction + (WAIT_CAP - stepFraction) * (1 - Math.exp(-waitSeconds / WAIT_EASE_S))
    : stepFraction;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: fraction, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();
  }, [fraction, progress]);
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const shineX   = shine.interpolate({ inputRange: [0, 1], outputRange: [-80, Math.max(trackWidth, 80)] });

  if (error) {
    return (
      <SafeAreaView style={s.root}>
        <View style={[s.body, { justifyContent: 'center' }]}>
          <View style={[s.hero, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
          </View>
          <Text style={s.title}>{TEXT.errorTitle}</Text>
          <Text style={s.subtitle}>{error}</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={tryAgain} activeOpacity={0.85}>
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={s.primaryBtnText}>{TEXT.tryAgain}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={s.secondaryBtnText}>{TEXT.back}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.body}>

        {/* Hero — single small leaf with subtle pulse, no nested rings */}
        <Animated.View style={[s.hero, !isDone && { transform: [{ scale: ringPulse }] }]}>
          <Ionicons name={isDone ? 'checkmark' : 'leaf'} size={26} color="#059669" />
        </Animated.View>

        <Text style={s.title}>
          {isDone ? 'Analysis complete' : 'Analyzing your farm'}
        </Text>
        <Text style={s.subtitle}>
          {isDone ? 'Your recommendations are ready.' : activeLabel + '…'}
        </Text>

        {/* Overall progress: a bar that keeps moving (creeps + shine), the seconds so
            far, and the "n / N" step count */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack} onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
            <Animated.View style={[s.progressFill, { width: barWidth }]}>
              {!isDone && (
                <Animated.View style={[s.progressShine, { transform: [{ translateX: shineX }] }]} />
              )}
            </Animated.View>
          </View>
          <View style={s.progressMeta}>
            <Text style={s.progressCount}>{isDone ? '' : `${elapsed} s`}</Text>
            <Text style={s.progressCount}>{Math.min(completedCount, STEPS.length)} / {STEPS.length}</Text>
          </View>
        </View>

        {!isDone && (
          <View style={s.keepOpen}>
            <Ionicons name="hourglass-outline" size={14} color="#047857" />
            <Text style={s.keepOpenText}>
              {TEXT.keepOpen}{elapsed >= SLOW_AFTER_S ? ` ${TEXT.slow}` : ''}
            </Text>
          </View>
        )}

        {/* Step list — flat hairline rows */}
        <View style={s.steps}>
          {STEPS.map((step, i) => {
            const done   = i < completedCount;
            const active = i === completedCount && !isDone;
            return (
              <View key={i} style={[s.row, i < STEPS.length - 1 && s.rowDivider]}>
                <Ionicons
                  name={step.icon}
                  size={15}
                  color={done || active ? '#059669' : '#D1D5DB'}
                />
                <Text style={[
                  s.label,
                  done && s.labelDone,
                  active && s.labelActive,
                ]}>
                  {step.label}
                </Text>
                {done
                  ? <Ionicons name="checkmark-circle" size={15} color="#059669" />
                  : active
                    ? <ActivityIndicator size="small" color="#059669" style={s.stepSpinner} />
                    : <View style={s.pendingDot} />
                }
              </View>
            );
          })}
        </View>

      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F2F1' },
  body: {
    flex: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32,
    alignItems: 'center',
  },

  hero: { width: 76, height: 76, borderRadius: 26, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 22, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },

  title: { fontSize: 24, color: '#111827', letterSpacing: -0.5, textAlign: 'center', marginBottom: 8, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24, minHeight: 40, fontFamily: 'Inter_500Medium' },

  /* Overall progress */
  progressWrap: { width: '100%', marginBottom: 24 },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: '#E4E6E4', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#059669', borderRadius: 5, overflow: 'hidden' },
  progressShine: { position: 'absolute', top: 0, bottom: 0, width: 80, backgroundColor: 'rgba(255,255,255,0.45)' },
  progressMeta:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressCount: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },

  keepOpen: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, alignSelf: 'stretch', backgroundColor: '#E8F5EF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  keepOpenText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#047857', fontWeight: '600' },

  /* Step list — flat */
  steps: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2, paddingHorizontal: 16, paddingVertical: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  label: { flex: 1, fontSize: 14, color: '#9CA3AF', fontFamily: 'Inter_500Medium' },
  labelDone:   { color: '#374151' },
  labelActive: { color: '#111827', fontFamily: 'Inter_700Bold' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', backgroundColor: '#111827', borderRadius: 20, height: 56 },
  primaryBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  secondaryBtn:     { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  secondaryBtnText: { fontSize: 15, color: '#111827', fontFamily: 'Inter_600SemiBold' },

  stepSpinner: { transform: [{ scale: 0.8 }] },
  pendingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#E5E7EB' },
});
