import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { apiFarms, apiScan, apiRecommendations } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';

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

export const AnalysisLoadingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<any>();
  const farmData   = route.params?.farmData ?? {};

  const [completedCount, setCompletedCount] = useState(0);
  const ringPulse = useRef(new Animated.Value(1)).current;

  // API results stored in refs to avoid stale closures
  const recommendationRef = useRef<any>(null);
  const scanRef           = useRef<any>(null);
  const apiDoneRef        = useRef(false);
  const animDoneRef       = useRef(false);
  const navigatedRef      = useRef(false);

  const tryNavigate = () => {
    if (apiDoneRef.current && animDoneRef.current && !navigatedRef.current) {
      navigatedRef.current = true;
      navigation.navigate('SuitabilityResults', {
        farmData,
        recommendationData: recommendationRef.current,
        scanData: scanRef.current,
      });
    }
  };

  // Run the real API chain once on mount
  useEffect(() => {
    const run = async () => {
      let step = 'init';
      try {
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
        };
        step = 'create farm';
        const farmRes = await apiFarms.create(farmPayload);
        const farm = farmRes.data;
        useAppStore.getState().addFarm(farm);

        try {
          step = 'run scan';
          const scanRes = await apiScan.run(farm.id);
          const scan = scanRes.data;
          scanRef.current = scan;

          if (scan.flood_risk === 'High') {
            useAppStore.getState().addNotification({
              title:    'Warning: High flood risk',
              body:     'Your farm has high flood risk. Check the Irrigation guide.',
              category: 'irrigation',
              icon:     'warning-outline',
            });
          }

          step = 'generate recommendation';
          const recRes = await apiRecommendations.generate(scan.id);
          recommendationRef.current = recRes.data;
          useAppStore.getState().setLatestRecommendation(recRes.data);

          useAppStore.getState().addNotification({
            title: 'Your recommendations are ready',
            body:  'View the Top 3 rice varieties matched to your farm.',
            icon:  'ribbon-outline',
          });
        } catch (innerErr) {
          try { await apiFarms.delete(farm.id); } catch {}
          useAppStore.getState().removeFarm?.(farm.id);
          throw innerErr;
        }
      } catch (err: any) {
        const msg = err?.response?.data
          ? JSON.stringify(err.response.data)
          : err?.message || String(err);
        Alert.alert(`Failed at: ${step}`, msg);
      } finally {
        apiDoneRef.current = true;
        tryNavigate();
      }
    };
    run();
  }, []);

  // Advance one step at a time
  useEffect(() => {
    if (completedCount >= STEPS.length) {
      animDoneRef.current = true;
      tryNavigate();
      return;
    }
    const t = setTimeout(() => setCompletedCount(c => c + 1), STEP_DURATION);
    return () => clearTimeout(t);
  }, [completedCount]);

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
  const pct      = Math.round((Math.min(completedCount, STEPS.length) / STEPS.length) * 100);
  const activeLabel = STEPS[Math.min(completedCount, STEPS.length - 1)].label;

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
          {isDone
            ? 'Your recommendations are ready.'
            : activeLabel + '…'}
        </Text>

        {/* Overall progress — one thin bar + "n / N" count */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.progressCount}>{Math.min(completedCount, STEPS.length)} / {STEPS.length}</Text>
        </View>

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
                    ? <View style={s.activeDot} />
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
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  body: {
    flex: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32,
    alignItems: 'center',
  },

  hero: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 22,
  },

  title:    { fontSize: 20, fontWeight: '700', color: '#111827', letterSpacing: -0.4, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19, marginBottom: 28, minHeight: 38 },

  /* Overall progress */
  progressWrap: { width: '100%', marginBottom: 24 },
  progressTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: '#F3F4F6', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#059669', borderRadius: 2 },
  progressCount: {
    fontSize: 11, fontWeight: '600', color: '#9CA3AF',
    textAlign: 'right', marginTop: 6,
  },

  /* Step list — flat */
  steps: { width: '100%' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  label:       { flex: 1, fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  labelDone:   { color: '#374151' },
  labelActive: { color: '#111827', fontWeight: '700' },

  activeDot:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#059669' },
  pendingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#E5E7EB' },
});
