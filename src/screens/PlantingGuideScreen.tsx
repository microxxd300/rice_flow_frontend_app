import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAccessibility } from '../context/AccessibilityContext';
import { apiRecommendations, apiScan, apiWeather } from '@/services/apiService';
import { loadGuide } from '@/services/guideLoader';
import { plantingCalendar } from '@/utils/plantingCalendar';
import { useAppStore } from '@/store/appStore';
import { guideSteps, guideProgress, guideDay } from '@/utils/guideSteps';
import { ADVICE_TEXT } from '@/utils/stepWeather';
import { rainfedWaitAdvice } from '@/utils/seasonAdvice';
import { useStepWeather } from '@/hooks/useFarmForecast';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/i18n/useTranslation';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { NotificationBell } from '@/components/NotificationBell';
import { SowingQuestion } from '@/components/SowingQuestion';

// Open-Meteo 2023–2025 average rain per month (mm) in Panabo City. Used until the
// farm's own monthly rainfall loads, or when the phone is offline.
const PANABO_MONTHLY_RAIN = [332, 206, 197, 201, 361, 377, 249, 278, 262, 269, 243, 281];

// Colors for the current-month alert under the calendar (same as the month legend)
const ALERT_TONE: Record<string, { bg: string; border: string; fg: string; icon: 'warning' | 'information-circle' | 'checkmark-circle' }> = {
  danger:  { bg: '#FEF2F2', border: '#FECACA', fg: '#DC2626', icon: 'warning' },
  caution: { bg: '#FFF7ED', border: '#FDE68A', fg: '#D97706', icon: 'information-circle' },
  safe:    { bg: '#ECFDF5', border: '#A7F3D0', fg: '#059669', icon: 'checkmark-circle' },
};

/**
 * Build the "Best months to plant" calendar from the farm's monthly rainfall, its
 * ecosystem and flood risk, and the variety's season and maturity (see plantingCalendar).
 * Returns the same shape the screen already renders.
 */
function buildClimateCalendar(
  variety: any, tr: any,
  farm: { monthlyRain?: number[] | null; ecosystem?: string; floodRisk?: string },
) {
  const labels      = [
    tr.monShortJan2, tr.monShortFeb2, tr.monShortMar2, tr.monShortApr2,
    tr.monShortMay2, tr.monShortJun2, tr.monShortJul2, tr.monShortAug2,
    tr.monShortSep2, tr.monShortOct2, tr.monShortNov2, tr.monShortDec2,
  ];
  const fullMonths  = [
    tr.monFullJan, tr.monFullFeb, tr.monFullMar, tr.monFullApr,
    tr.monFullMay, tr.monFullJun, tr.monFullJul, tr.monFullAug,
    tr.monFullSep, tr.monFullOct, tr.monFullNov, tr.monFullDec,
  ];
  const rain = farm.monthlyRain?.length === 12 ? farm.monthlyRain : PANABO_MONTHLY_RAIN;

  const cal = plantingCalendar(rain, {
    ecosystem:     farm.ecosystem || variety?.ecosystem,
    floodRisk:     farm.floodRisk,
    varietySeason: variety?.season,
    maturityDays:  variety?.maturity_days,
  });
  const months = cal.map((m, i) => ({
    label: labels[i], rainfall: m.rainfall, status: m.status, reason: m.reason,
  }));

  const currentIdx    = new Date().getMonth();
  const currentMonth  = fullMonths[currentIdx];
  const current       = cal[currentIdx];
  const bestMonths    = months
    .map((m, i) => (m.status === 'safe' ? fullMonths[i] : null))
    .filter((x): x is string => !!x);

  const varName = variety?.common_name || 'rice';
  const drought = current.reason === 'drought';
  const alert =
    current.status === 'danger'
      ? { level: 'danger',
          title:   drought ? tr.climateAlertDrought : tr.climateAlertDanger,
          message: (drought ? tr.climateMsgDrought : tr.climateMsgDanger).replace('{month}', currentMonth) }
      : current.status === 'caution'
      ? { level: 'caution', title: tr.climateAlertCaution,
          message: (drought ? tr.climateMsgDrought : tr.climateMsgCaution).replace('{month}', currentMonth) }
      : { level: 'safe',    title: tr.climateAlertSafe,
          message: tr.climateMsgSafe.replace('{month}', currentMonth).replace('{variety}', varName) };

  return { location: 'Panabo City, Davao del Norte', currentMonth, alert, bestMonths, months };
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Weather warning on the step card: stop = do not do the step now, caution = take care
const WX_TONE = {
  stop:    { bg: '#FEF2F2', border: '#FECACA', fg: '#B91C1C' },
  caution: { bg: '#FFF7ED', border: '#FDE68A', fg: '#92400E' },
};

/** "2:05 PM" */
function clock(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

type CatConfig = {
  label: string; icon: IoniconsName;
  color: string; bg: string; border: string;
};

export const PlantingGuideScreen: React.FC = () => {
  const { isLargeText } = useAccessibility();
  const T = isLargeText;
  const language = useLanguageStore(s => s.language);
  const tr = useTranslation();

  const CAT_CONFIG: Record<string, CatConfig> = {
    planting:        { label: tr.guidePlanting,   icon: 'leaf-outline',             color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    fertilizer:      { label: tr.guideFertilizer, icon: 'flask-outline',            color: '#D97706', bg: '#FFF7ED', border: '#FDE68A' },
    pest_prevention: { label: tr.guidePest,       icon: 'shield-checkmark-outline', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    irrigation:      { label: tr.guideIrrigation, icon: 'water-outline',            color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    harvesting:      { label: tr.guideHarvest,    icon: 'basket-outline',           color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  };

  const completedIds = useAppStore(s => s.completedGuideSteps);
  // The step whose explanation is open, so a new step starts with it closed
  const [explainedId, setExplainedId] = useState<string | null>(null);

  const navigation = useNavigation<StackNavigationProp<any>>();

  // Only a real guide counts. Without one the screen shows a loading/empty state,
  // never demo steps, which would read as advice for a farm that was never scanned.
  const latestGuide  = useAppStore(s => s.latestGuide);
  const hasRealGuide = !!(latestGuide && Array.isArray(latestGuide.steps) && latestGuide.steps.length > 0);
  // The guide only stores the variety id; its name comes from the recommendation it was made from
  const recForGuide      = useAppStore(s => s.latestRecommendation) as any;
  const guideVariety     = (recForGuide?.results ?? [])
    .map((r: any) => r.variety)
    .find((v: any) => v?.id === (latestGuide as any)?.variety);
  const guideVarietyName = guideVariety?.common_name ?? '';

  // PalayCheck, one step at a time: the current step is the first one not done
  // (the same rule as Home's Upcoming Tasks and Progress' Next Tasks)
  const steps    = useMemo(() => guideSteps(latestGuide), [latestGuide]);
  const progress = useMemo(() => guideProgress(steps, completedIds), [steps, completedIds]);
  const current  = progress.current;
  const today    = guideDay(latestGuide);
  const pct      = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const explainOpen = !!current && explainedId === current.id;
  // The app's shared forecast (useFarmForecast): warnings for the current step
  const { adviceFor, updatedAt } = useStepWeather();

  // Data-driven "Angkop na Buwan sa Pagtatanim" — built from the chosen variety's
  // preferred season, Davao Type IV climate pattern, and today's date. The guide's
  // variety (the farmer's pick), else the top-ranked one.
  const calendarVariety = guideVariety ?? (useAppStore.getState().latestRecommendation as any)?.results?.[0]?.variety;
  // The farm's own monthly rainfall and flood risk (loaded below); Panabo averages until then
  const [monthlyRain, setMonthlyRain] = useState<number[] | null>(null);
  const [floodRisk,   setFloodRisk]   = useState<string | undefined>(undefined);
  const calendarFarm = useSelectedFarm() as any;
  const climate = useMemo(() => buildClimateCalendar(calendarVariety, tr, {
    monthlyRain, floodRisk, ecosystem: calendarFarm?.ecosystem,
  }), [calendarVariety?.season, calendarVariety?.common_name, calendarVariety?.maturity_days, tr,
       monthlyRain, floodRisk, calendarFarm?.ecosystem]);

  useEffect(() => {
    const lat = calendarFarm?.latitude, lng = calendarFarm?.longitude;
    if (lat == null || lng == null) return;
    let cancelled = false;
    apiWeather.monthlyRainfall(Number(lat), Number(lng))
      .then(res => { if (!cancelled) setMonthlyRain(res.data.months); })
      .catch(() => {});   // keep the Panabo averages
    apiScan.history(calendarFarm.id)
      .then(res => { if (!cancelled) setFloodRisk((res.data ?? [])[0]?.flood_risk); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [calendarFarm?.id, calendarFarm?.latitude, calendarFarm?.longitude]);

  // A step is finished by logging it: open the Progress log form for this step
  const logStep = (id: string) => {
    useAppStore.getState().setPendingLogStep(id);
    navigation.navigateDeprecated('ProgressTab', { screen: 'ProgressDashboardHome' });
  };

  const dayLabel = (d: number) =>
    d < 0    ? tr.guideDayBeforePlant.replace('{n}', String(Math.abs(d)))
    : d === 0 ? tr.guideDayPlanting
    :           tr.guideDayAfter.replace('{n}', String(d));

  // Self-heal: if there's no recommendation in the store (e.g. fresh app reload
  // after an old session), fetch the latest one for the user's farm.
  const setLatestRecommendation = useAppStore(s => s.setLatestRecommendation);
  const selectedFarm            = useSelectedFarm();
  const selectedFarmId          = selectedFarm?.id;
  const latestRec               = useAppStore(s => s.latestRecommendation);
  // recChecked = the history fetch for the CURRENT farm has finished (with or
  // without a result). Distinguishes "still checking" from "farm truly has no
  // recommendation" so the empty state never flashes during the fetch.
  const [recChecked, setRecChecked] = useState(false);
  useEffect(() => {
    if (latestRec) { setRecChecked(true); return; }
    setRecChecked(false);
    const farmId = selectedFarmId;
    if (!farmId) {
      console.log('[GUIDE] No farmId — cannot fetch recommendation history');
      setRecChecked(true);
      return;
    }
    console.log('[GUIDE] Fetching recommendation history for farm', farmId);
    apiRecommendations.history(farmId)
      .then(res => {
        const recs = res.data;
        console.log('[GUIDE] Got', recs?.length ?? 0, 'recommendations');
        if (recs && recs.length > 0) {
          const latest = recs.reduce((max, r) => ((r.id ?? 0) > (max.id ?? 0) ? r : max), recs[0]);
          setLatestRecommendation(latest);
        }
      })
      .catch(err => console.error('[GUIDE] recommendation fetch failed:', err?.message || err))
      .finally(() => setRecChecked(true));
  }, [latestRec, selectedFarmId, setLatestRecommendation]);

  // Load the guide ONCE per mount when we have a recommendation. We DO NOT depend on
  // `latestGuide` here, or setLatestGuide(res.data) would re-run the effect in a loop.
  const recId          = latestRec?.id;
  // Track which recommendation we've generated a guide for. Regenerates when
  // the recId changes (e.g. after switching to a different farm), but never
  // loops on the same recId.
  // Keyed on recommendation AND language: switching the app language re-requests
  // the guide so the same steps come back worded in that language.
  const fetchedRecIdRef = useRef<string | null>(null);
  const hasGuide = !!latestGuide;
  const [genError,  setGenError]  = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [translating, setTranslating] = useState(false);
  useEffect(() => {
    if (!recId) {
      console.log('[GUIDE] No recId — cannot generate guide.');
      return;
    }
    const fetchKey = `${recId}:${language}`;
    if (fetchedRecIdRef.current === fetchKey && hasGuide) {
      // Already generated for this recommendation + language — don't hammer it.
      // Without a guide (cache cleared) it is requested again; the server returns the saved one.
      return;
    }
    // Anything after the first fetch of this mount is a refresh (language
    // switch or farm switch): the old guide stays on screen while it reloads.
    const isRefresh = fetchedRecIdRef.current !== null;
    fetchedRecIdRef.current = fetchKey;
    setTranslating(isRefresh);
    setGenError(false);
    console.log('[GUIDE] Loading guide (recId=' + recId + ')...');
    // Shared with the language switch in Profile: if it is already loading this
    // guide, this waits for that request instead of sending a second one
    loadGuide(recId, language)
      .then(data => {
        console.log('[GUIDE] Generate response — source:', data?.source, 'steps:', data?.steps?.length ?? 0);
      })
      .catch(err => {
        console.error('[GUIDE] Generate failed:', err?.message || err, err?.response?.data);
        // Allow a retry (button or next mount) if it failed
        fetchedRecIdRef.current = null;
        setGenError(true);
      })
      .finally(() => setTranslating(false));
  }, [recId, retryTick, language, hasGuide]);

  // ── No real guide yet: loading / generating / empty — NEVER mock steps ──────
  // A farm that was never scanned has no recommendation, so no guide exists.
  // Showing demo steps here would read as real advice for the wrong farm.
  if (!hasRealGuide) {
    const isGenerating = !!recId && !genError;   // guide request in flight
    const isChecking   = !recId && !recChecked;  // recommendation lookup in flight
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={s.titleIcon}>
              <Ionicons name="leaf-outline" size={16} color="#FFFFFF" />
            </View>
            <Text style={[s.headerTitle, T && { fontSize: 17 }]}>{tr.guideScreenTitle}</Text>
          </View>
          <NotificationBell color="#059669" size={22} />
        </View>

        <View style={s.emptyWrap}>
          {(isGenerating || isChecking) ? (
            <>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={s.emptyBody}>
                {isGenerating ? tr.guideGenerating : tr.switchFarmLoading}
              </Text>
            </>
          ) : genError ? (
            <>
              <View style={s.emptyIcon}>
                <Ionicons name="cloud-offline-outline" size={28} color="#D97706" />
              </View>
              <Text style={s.emptyTitle}>{tr.guideGenFailed}</Text>
              <TouchableOpacity
                style={s.emptyCta}
                onPress={() => setRetryTick(t => t + 1)}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                <Text style={s.emptyCtaText}>{tr.commonRetry}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={s.emptyIcon}>
                <Ionicons name="leaf-outline" size={28} color="#059669" />
              </View>
              <Text style={s.emptyTitle}>{tr.guideNoRecTitle}</Text>
              <Text style={s.emptyBody}>{tr.guideNoRecBody}</Text>
              <TouchableOpacity
                style={s.emptyCta}
                onPress={() => navigation.navigateDeprecated('HomeTab', { screen: 'EnvironmentalScanner' })}
                activeOpacity={0.85}
              >
                <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
                <Text style={s.emptyCtaText}>{tr.guideRunScan}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={s.titleIcon}>
            <Ionicons name="leaf-outline" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[s.headerTitle, T && { fontSize: 17 }]}>{tr.guideScreenTitle}</Text>
            <Text style={s.headerSub}>
              {[(latestGuide as any).season ?? 'Wet Season', guideVarietyName].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <NotificationBell color="#059669" size={22} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Language switch in flight — the previous guide stays readable while
            the translated steps are generated, so the screen never goes blank. */}
        {translating && (
          <View style={[s.note, { marginTop: 16, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={[s.noteText, T && { fontSize: 12 }, { color: '#1E40AF' }]}>
              {tr.guideTranslating}
            </Text>
          </View>
        )}

        {/* From the planned sowing day until answered: the plan follows the real sowing day */}
        <SowingQuestion />

        {/* The current PalayCheck step — the only step shown. Logging it moves the guide on. */}
        <View style={s.stepHead}>
          <Text style={[s.stepOf, T && { fontSize: 13 }]}>
            {tr.guideStepOf
              .replace('{n}', String(Math.min(progress.done + 1, progress.total)))
              .replace('{total}', String(progress.total))}
          </Text>
          <Text style={s.stepPct}>{pct}%</Text>
        </View>
        <View style={s.progBg}>
          <View style={[s.progFill, { width: `${pct}%` }]} />
        </View>

        {current ? (() => {
          const cfg     = CAT_CONFIG[current.category] ?? CAT_CONFIG.planting;
          const late    = today - current.daysAfterPlanting;
          const weather = adviceFor(current);
          const waitForRain = rainfedWaitAdvice(calendarFarm?.ecosystem, latestGuide, current);
          return (
            <View style={[s.stepCard, { borderColor: weather ? WX_TONE[weather.level].border : cfg.border }]}>
              {/* What today's forecast means for this step (Phase 2: the guide reacts to the weather) */}
              {weather && (
                <View style={[s.wxBanner, { backgroundColor: WX_TONE[weather.level].bg, borderColor: WX_TONE[weather.level].border }]}>
                  <Ionicons name={weather.level === 'stop' ? 'warning' : 'rainy-outline'} size={16} color={WX_TONE[weather.level].fg} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.wxBannerText, { color: WX_TONE[weather.level].fg }, T && { fontSize: 14, lineHeight: 21 }]}>
                      {(tr as any)[ADVICE_TEXT[weather.code]]}
                    </Text>
                    {updatedAt != null && (
                      <Text style={s.wxBannerTime}>{tr.wxUpdatedAt.replace('{time}', clock(updatedAt))}</Text>
                    )}
                  </View>
                </View>
              )}
              {/* Rainfed farm sowing in the drier months (Phase 3: season advice) */}
              {waitForRain && (
                <View style={[s.wxBanner, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Ionicons name="water-outline" size={16} color="#1D4ED8" />
                  <Text style={[s.wxBannerText, { flex: 1, color: '#1E40AF', fontWeight: '500' }, T && { fontSize: 14, lineHeight: 21 }]}>
                    {tr.guideRainfedWait}
                  </Text>
                </View>
              )}
              <View style={s.chipRow}>
                <View style={[s.chip, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                  <Text style={[s.chipText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
                {current.keyCheck != null && (
                  <View style={s.keyCheck}>
                    <Text style={s.keyCheckText}>{tr.guideKeyCheck.replace('{n}', String(current.keyCheck))}</Text>
                  </View>
                )}
              </View>

              <Text style={[s.stepTitle, T && { fontSize: 19 }]}>{current.title}</Text>
              <Text style={[s.stepDay, late > 0 && { color: '#D97706' }, T && { fontSize: 13 }]}>
                {dayLabel(current.daysAfterPlanting)}
                {late > 0 ? ` · ${tr.guideLate.replace('{n}', String(late))}` : ''}
              </Text>
              <Text style={[s.stepBody, T && { fontSize: 15, lineHeight: 23 }]}>{current.instruction}</Text>

              {/* Pre-written explanation (reviewed text, in the Settings language) — not AI */}
              {!!current.explanation && (
                <>
                  <TouchableOpacity style={s.explainBtn} onPress={() => setExplainedId(explainOpen ? null : current.id)} activeOpacity={0.75}>
                    <Ionicons name={explainOpen ? 'chevron-up' : 'bulb-outline'} size={15} color="#2563EB" />
                    <Text style={[s.explainBtnText, T && { fontSize: 14 }]}>
                      {explainOpen ? tr.guideHideExplain : tr.guideExplain}
                    </Text>
                  </TouchableOpacity>
                  {explainOpen && (
                    <Text style={[s.explainBody, T && { fontSize: 14, lineHeight: 22 }]}>{current.explanation}</Text>
                  )}
                </>
              )}

              {!!current.reference && (
                <TouchableOpacity
                  style={s.refRow}
                  onPress={() => { Linking.openURL(current.referenceUrl).catch(() => {}); }}
                  disabled={!current.referenceUrl}
                  activeOpacity={0.75}
                >
                  <Ionicons name="book-outline" size={14} color="#6B7280" />
                  <Text style={[s.refText, T && { fontSize: 13 }]}>{current.reference}</Text>
                  {!!current.referenceUrl && <Text style={s.refLink}>{tr.guideOpenBook}</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.logBtn} onPress={() => logStep(current.id)} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={17} color="#FFFFFF" />
                <Text style={[s.logBtnText, T && { fontSize: 15 }]}>{tr.guideLogStep}</Text>
              </TouchableOpacity>
              <Text style={[s.logHint, T && { fontSize: 12 }]}>{tr.guideLogHint}</Text>
            </View>
          );
        })() : (
          <View style={[s.stepCard, { alignItems: 'center' }]}>
            <Ionicons name="trophy-outline" size={28} color="#059669" />
            <Text style={[s.stepTitle, { textAlign: 'center', marginTop: 8 }, T && { fontSize: 19 }]}>{tr.guideAllDone}</Text>
            <Text style={[s.logHint, { textAlign: 'center' }, T && { fontSize: 12 }]}>{tr.guideAllDoneBody}</Text>
          </View>
        )}

        {!!progress.next[0] && (
          <View style={s.nextRow}>
            <Ionicons name="arrow-forward-circle-outline" size={16} color="#9CA3AF" />
            <Text style={[s.nextText, T && { fontSize: 13 }]} numberOfLines={2}>
              {tr.guideNext.replace('{title}', progress.next[0].title)} · {dayLabel(progress.next[0].daysAfterPlanting)}
            </Text>
          </View>
        )}

        {/* Climate Advisory Card */}
        <View style={[s.climateCard, { marginTop: 20 }]}>

          <Text style={[s.climateSubLabel, { marginBottom: 12 }]}>{tr.climateBestMonths}</Text>

          {/* Calendar grid — 4 columns × 3 rows */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
            {climate.months.map((m, i) => {
              const isSafe    = m.status === 'safe';
              const isCaution = m.status === 'caution';
              const isCurrent = m.label === climate.currentMonth.slice(0, 3);
              const bg     = isSafe ? '#ECFDF5' : isCaution ? '#FFF7ED' : '#FEF2F2';
              const border = isSafe ? '#A7F3D0' : isCaution ? '#FDE68A' : '#FECACA';
              const color  = isSafe ? '#059669' : isCaution ? '#D97706' : '#DC2626';
              return (
                <View key={i} style={{ width: '25%', padding: 3 }}>
                  <View style={[
                    s.monthCell,
                    { backgroundColor: bg, borderColor: isCurrent ? color : border },
                    isCurrent && { borderWidth: 2 },
                  ]}>
                    <Text style={[s.monthCellText, { color }, isCurrent && { fontWeight: '800' }]}>
                      {m.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={s.calLegendRow}>
            {[
              { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: tr.floodSafe },
              { color: '#D97706', bg: '#FFF7ED', border: '#FDE68A', label: tr.floodCaution },
              { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: tr.floodWarning },
            ].map(l => (
              <View key={l.label} style={s.calLegendItem}>
                <View style={[s.calLegendSwatch, { backgroundColor: l.bg, borderColor: l.color }]} />
                <Text style={s.calLegendLabel}>{l.label}</Text>
              </View>
            ))}
          </View>

          {/* Alert warning strip */}
          {climate.alert.level && (
            <View style={[s.alertStrip, {
              backgroundColor: ALERT_TONE[climate.alert.level].bg,
              borderColor:     ALERT_TONE[climate.alert.level].border,
            }]}>
              <Ionicons
                name={ALERT_TONE[climate.alert.level].icon}
                size={14}
                color={ALERT_TONE[climate.alert.level].fg}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.alertStripTitle, {
                  color: ALERT_TONE[climate.alert.level].fg,
                }, T && { fontSize: 13 }]}>
                  {climate.alert.title}
                </Text>
                <Text style={[s.alertStripMsg, T && { fontSize: 12 }]}>
                  {climate.alert.message}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Disclaimer */}
        <View style={s.note}>
          <Ionicons name="information-circle-outline" size={14} color="#D1D5DB" />
          <Text style={[s.noteText, T && { fontSize: 12 }]}>
            {tr.guideDisclaimer}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F9F8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  titleIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  headerBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' },

  scroll: { paddingHorizontal: 24, paddingBottom: 110 },

  /* Climate card */
  climateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  alertPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 9999,
    paddingVertical: 4, paddingHorizontal: 8,
  },
  alertPillText: { fontSize: 11, fontWeight: '600' },
  alertStrip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12,
  },
  alertStripTitle: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  alertStripMsg:   { fontSize: 11, color: '#6B7280', lineHeight: 17 },
  climateSubLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 },
  monthCell: {
    borderWidth: 1, borderRadius: 8, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  monthCellText: { fontSize: 11, fontWeight: '600' },
  calLegendRow: {
    flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  calLegendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calLegendSwatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  calLegendLabel:  { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  /* Current PalayCheck step */
  stepHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 6 },
  stepOf:   { fontSize: 12, fontWeight: '700', color: '#374151', letterSpacing: 0.3 },
  stepPct:  { fontSize: 12, fontWeight: '700', color: '#059669' },
  progBg:   { height: 6, borderRadius: 3, backgroundColor: '#E5E7EB', overflow: 'hidden', marginBottom: 12 },
  progFill: { height: 6, borderRadius: 3, backgroundColor: '#059669' },
  stepCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16,
  },
  chipRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  wxBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12,
  },
  wxBannerText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  wxBannerTime: { fontSize: 11, color: '#6B7280', marginTop: 3 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 10,
  },
  chipText:     { fontSize: 11, fontWeight: '700' },
  keyCheck:     { borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#F3F4F6' },
  keyCheckText: { fontSize: 11, fontWeight: '700', color: '#4B5563' },
  stepTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  stepDay:   { fontSize: 12, color: '#6B7280', marginTop: 3, marginBottom: 10, fontWeight: '500' },
  stepBody:  { fontSize: 14, color: '#111827', lineHeight: 21 },
  explainBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start', paddingVertical: 4 },
  explainBtnText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
  explainBody: {
    fontSize: 13, color: '#1E3A8A', lineHeight: 20, marginTop: 6,
    backgroundColor: '#EFF6FF', borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE', padding: 12,
  },
  refRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  refText: { flex: 1, fontSize: 12, color: '#6B7280' },
  refLink: { fontSize: 12, fontWeight: '600', color: '#059669' },
  logBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 12, backgroundColor: '#059669', marginTop: 14,
  },
  logBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  logHint:    { fontSize: 11, color: '#9CA3AF', marginTop: 8, lineHeight: 16 },
  nextRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 4 },
  nextText:   { flex: 1, fontSize: 12, color: '#6B7280' },

  /* Disclaimer */
  note: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 24, padding: 14,
    backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8,
  },
  noteText: { fontSize: 11, color: '#6B7280', lineHeight: 17, flex: 1 },

  /* No-guide-yet states (loading / generating / empty / error) */
  emptyWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 36, paddingBottom: 120, gap: 12,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#111827',
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13, color: '#6B7280', lineHeight: 19,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 12, paddingHorizontal: 22,
    backgroundColor: '#059669', marginTop: 8,
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});
