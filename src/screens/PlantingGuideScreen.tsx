import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAccessibility } from '../context/AccessibilityContext';
import { apiRecommendations, apiScan, apiWeather } from '@/services/apiService';
import { ProblemGuideCards } from '@/components/ProblemGuideCards';
import { loadGuide } from '@/services/guideLoader';
import { plantingCalendar } from '@/utils/plantingCalendar';
import { useAppStore } from '@/store/appStore';
import { guideSteps, guideProgress, guideDay } from '@/utils/guideSteps';
import { STEP_ADVICE_TEXT } from '@/utils/stepTime';
import { rainfedWaitAdvice } from '@/utils/seasonAdvice';
import { useStepAdvice } from '@/hooks/useFarmForecast';
import { adviceIcon } from '@/utils/stepWeather';
import { nextCropParams } from '@/utils/nextCrop';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/i18n/useTranslation';
import { seasonInLanguage } from '@/utils/formatting';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { NotificationBell } from '@/components/NotificationBell';
import { SowingQuestion } from '@/components/SowingQuestion';
import { empty, stepIcon } from '@/assets/illustrations';

// Open-Meteo 2023–2025 average rain per month (mm) in Panabo City. Used until the
// farm's own monthly rainfall loads, or when the phone is offline.
const PANABO_MONTHLY_RAIN = [332, 206, 197, 201, 361, 377, 249, 278, 262, 269, 243, 281];

// Colors for the current-month alert under the calendar (same as the month legend)
const ALERT_TONE: Record<string, { bg: string; fg: string; icon: 'warning' | 'information-circle' | 'checkmark-circle' }> = {
  danger:  { bg: '#FDECEC', fg: '#B91C1C', icon: 'warning' },
  caution: { bg: '#FEF3DC', fg: '#B45309', icon: 'information-circle' },
  safe:    { bg: '#E8F5EF', fg: '#047857', icon: 'checkmark-circle' },
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
  stop:    { bg: '#FDECEC', fg: '#B91C1C' },
  caution: { bg: '#FEF3DC', fg: '#92400E' },
};

/** "2:05 PM" */
function clock(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

type CatConfig = { label: string; icon: IoniconsName; color: string; bg: string };

export const PlantingGuideScreen: React.FC = () => {
  const { isLargeText } = useAccessibility();
  const T = isLargeText;
  const language = useLanguageStore(s => s.language);
  const tr = useTranslation();

  const CAT_CONFIG: Record<string, CatConfig> = {
    planting:        { label: tr.guidePlanting,   icon: 'leaf-outline',             color: '#059669', bg: '#E8F5EF' },
    fertilizer:      { label: tr.guideFertilizer, icon: 'flask-outline',            color: '#B45309', bg: '#FEF3DC' },
    pest_prevention: { label: tr.guidePest,       icon: 'shield-checkmark-outline', color: '#DC2626', bg: '#FDECEC' },
    irrigation:      { label: tr.guideIrrigation, icon: 'water-outline',            color: '#2563EB', bg: '#EAF1FD' },
    harvesting:      { label: tr.guideHarvest,    icon: 'basket-outline',           color: '#B45309', bg: '#FDF3E1' },
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
  const activeCycle = useAppStore(s => s.activeCycle) as any;
  const cropFinished = activeCycle?.status === 'completed';   // harvested: nothing left to do on this guide
  const current  = cropFinished ? null : progress.current;
  const today    = guideDay(latestGuide);
  // A harvested crop has finished its guide, whichever steps were logged
  const pct      = cropFinished ? 100 : progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const explainOpen = !!current && explainedId === current.id;
  // Live weather and time-of-day advice for the current step
  const { adviceFor, updatedAt } = useStepAdvice();

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
    useAppStore.getState().setPendingLogStep(id, 'PlantingTab');
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
          <Text style={[s.headerTitle, { flex: 1 }, T && { fontSize: 24 }]}>{tr.guideScreenTitle}</Text>
          <View style={s.headerBtn}><NotificationBell color="#111827" size={20} /></View>
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
              <Image source={empty.offline} style={{ width: 140, height: 140, marginBottom: 6 }} resizeMode="contain" />
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
              <Image source={empty.no_farm} style={{ width: 140, height: 140, marginBottom: 6 }} resizeMode="contain" />
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

  // The months' rain as bars, colored by how safe each month is to plant
  const rainMax = Math.max(1, ...climate.months.map(m => m.rainfall ?? 0));
  const MONTH_TONE: Record<string, string> = { safe: '#059669', caution: '#D97706', danger: '#DC2626' };

  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, T && { fontSize: 24 }]}>{tr.guideScreenTitle}</Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {[seasonInLanguage((latestGuide as any).season ?? 'Wet Season', tr), guideVarietyName].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={s.headerBtn}><NotificationBell color="#111827" size={20} /></View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Language switch in flight: the old guide stays readable while the new words load */}
        {translating && (
          <View style={[s.softBox, { backgroundColor: '#EAF1FD' }]}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={[s.softBoxText, { color: '#1E40AF' }, T && { fontSize: 14 }]}>{tr.guideTranslating}</Text>
          </View>
        )}

        {/* From the planned sowing day until answered: the plan follows the real sowing day */}
        <SowingQuestion />

        {/* ── Progress through the guide ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>{tr.guideProgress}</Text>
          <View style={s.bigRow}>
            <Text style={s.big}>{pct}</Text>
            <Text style={s.bigUnit}>%</Text>
          </View>
          <Text style={[s.sub, T && { fontSize: 14 }]}>
            {cropFinished ? tr.guideCropDone : tr.guideStepOf
              .replace('{n}', String(Math.min(progress.done + 1, progress.total)))
              .replace('{total}', String(progress.total))}
          </Text>
          <View style={s.progBg}>
            <View style={[s.progFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* ── The current PalayCheck step: the only one to do. Logging it moves the guide on. ── */}
        {current ? (() => {
          const cfg     = CAT_CONFIG[current.category] ?? CAT_CONFIG.planting;
          const late    = today - current.daysAfterPlanting;
          const weather = adviceFor(current);
          const waitForRain = rainfedWaitAdvice(calendarFarm?.ecosystem, latestGuide, current);
          return (
            <View style={s.card}>
              <View style={s.stepTop}>
                <View style={[s.catTile, { backgroundColor: cfg.bg }]}>
                  <Image source={stepIcon(current.category)} style={{ width: 38, height: 38 }} resizeMode="contain" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.catLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  <Text style={[s.stepDay, late > 0 && { color: '#B45309' }, T && { fontSize: 14 }]}>
                    {dayLabel(current.daysAfterPlanting)}
                    {late > 0 ? ` · ${late === 1 ? tr.guideLateOne : tr.guideLate.replace('{n}', String(late))}` : ''}
                  </Text>
                </View>
                {current.keyCheck != null && (
                  <View style={s.keyCheck}>
                    <Text style={s.keyCheckText}>{tr.guideKeyCheck.replace('{n}', String(current.keyCheck))}</Text>
                  </View>
                )}
              </View>

              <Text style={[s.stepTitle, T && { fontSize: 23 }]}>{current.title}</Text>

              {/* What the weather or time of day means for this step */}
              {weather && (
                <View style={[s.softBox, { backgroundColor: WX_TONE[weather.level].bg }]}>
                  <Ionicons name={weather.level === 'stop' ? 'warning' : adviceIcon(weather.code)} size={18} color={WX_TONE[weather.level].fg} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.softBoxText, { color: WX_TONE[weather.level].fg, fontFamily: 'Inter_600SemiBold' }, T && { fontSize: 15, lineHeight: 22 }]}>
                      {(tr as any)[STEP_ADVICE_TEXT[weather.code]]}
                    </Text>
                    {updatedAt != null && weather.code !== 'nightWork' && (
                      <Text style={s.softBoxTime}>{tr.wxUpdatedAt.replace('{time}', clock(updatedAt))}</Text>
                    )}
                  </View>
                </View>
              )}
              {/* A rainfed farm sowing in the drier months */}
              {waitForRain && (
                <View style={[s.softBox, { backgroundColor: '#EAF1FD' }]}>
                  <Ionicons name="water-outline" size={18} color="#1D4ED8" />
                  <Text style={[s.softBoxText, { flex: 1, color: '#1E40AF' }, T && { fontSize: 15, lineHeight: 22 }]}>
                    {tr.guideRainfedWait}
                  </Text>
                </View>
              )}

              <Text style={[s.stepBody, T && { fontSize: 16, lineHeight: 25 }]}>{current.instruction}</Text>

              {/* Pre-written explanation (reviewed text, in the Settings language), not AI */}
              {!!current.explanation && (
                <>
                  <TouchableOpacity style={s.explainBtn} onPress={() => setExplainedId(explainOpen ? null : current.id)} activeOpacity={0.75}>
                    <Ionicons name={explainOpen ? 'chevron-up' : 'bulb-outline'} size={16} color="#111827" />
                    <Text style={[s.explainBtnText, T && { fontSize: 15 }]}>
                      {explainOpen ? tr.guideHideExplain : tr.guideExplain}
                    </Text>
                  </TouchableOpacity>
                  {explainOpen && (
                    <Text style={[s.explainBody, T && { fontSize: 15, lineHeight: 23 }]}>{current.explanation}</Text>
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
                  <Ionicons name="book-outline" size={15} color="#6B7280" />
                  <Text style={[s.refText, T && { fontSize: 14 }]}>{current.reference}</Text>
                  {!!current.referenceUrl && <Text style={s.refLink}>{tr.guideOpenBook}</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.logBtn} onPress={() => logStep(current.id)} activeOpacity={0.85}>
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={[s.logBtnText, T && { fontSize: 16 }]}>{tr.guideLogStep}</Text>
              </TouchableOpacity>
              <Text style={[s.logHint, T && { fontSize: 13 }]}>{tr.guideLogHint}</Text>
            </View>
          );
        })() : (
          <View style={[s.card, { alignItems: 'center' }]}>
            <View style={[s.catTile, { backgroundColor: '#E8F5EF' }]}>
              <Ionicons name="trophy-outline" size={24} color="#059669" />
            </View>
            <Text style={[s.stepTitle, { textAlign: 'center', marginTop: 12 }, T && { fontSize: 23 }]}>{cropFinished ? tr.guideCropDone : tr.guideAllDone}</Text>
            <Text style={[s.logHint, { textAlign: 'center' }, T && { fontSize: 13 }]}>{cropFinished ? tr.guideCropDoneBody : tr.guideAllDoneBody}</Text>
            {cropFinished && !!calendarFarm && (
              <TouchableOpacity
                style={{ height: 54, borderRadius: 18, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', marginTop: 16, alignSelf: 'stretch' }}
                onPress={() => navigation.navigateDeprecated('AnalysisLoading', nextCropParams(calendarFarm))}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' }}>{tr.nextCropBtn}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Problems the farmer logged: the booklet advice and a GeoRice AI tip, until fixed ── */}
        <ProblemGuideCards farmId={selectedFarmId} />

        {/* ── Up next ── */}
        {!cropFinished && progress.next.length > 0 && (
          <View style={s.card}>
            <Text style={[s.cardLabel, { marginBottom: 4 }]}>{tr.guideUpNext}</Text>
            {progress.next.slice(0, 2).map(st => {
              const cfg = CAT_CONFIG[st.category] ?? CAT_CONFIG.planting;
              return (
                <View key={st.id} style={s.nextRow}>
                  <View style={[s.catTile, { width: 44, height: 44, borderRadius: 14, backgroundColor: cfg.bg }]}>
                    <Image source={stepIcon(st.category)} style={{ width: 32, height: 32 }} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.nextTitle, T && { fontSize: 16 }]} numberOfLines={2}>{st.title}</Text>
                    <Text style={[s.nextDay, T && { fontSize: 13 }]}>{dayLabel(st.daysAfterPlanting)}</Text>
                    {(() => {
                      const warn = adviceFor(st);
                      return warn ? (
                        <Text style={[s.nextDay, { color: WX_TONE[warn.level].fg }, T && { fontSize: 13 }]}>
                          {(tr as any)[STEP_ADVICE_TEXT[warn.code]]}
                        </Text>
                      ) : null;
                    })()}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Best months to plant: each month's usual rain, colored by how safe it is ── */}
        <View style={s.card}>
          <Text style={s.cardLabel}>{tr.guideBestMonths}</Text>
          <Text style={[s.sub, { marginTop: 4 }, T && { fontSize: 14 }]}>{tr.guideRainSub}</Text>
          <View style={s.rainBars}>
            {climate.months.map((m, i) => {
              const isCurrent = i === new Date().getMonth();
              const h = Math.max(6, Math.round(((m.rainfall ?? 0) / rainMax) * RAIN_BAR_H));
              return (
                <View key={i} style={s.rainCol}>
                  <View style={[s.rainBar, { height: h, backgroundColor: MONTH_TONE[m.status] ?? '#9CA3AF', opacity: isCurrent ? 1 : 0.75 }]} />
                  <Text style={[s.rainLbl, isCurrent && s.rainLblNow]} numberOfLines={1}>{m.label}</Text>
                  {/* every month keeps the dot's space, so the labels line up */}
                  <View style={[s.rainNowDot, !isCurrent && { backgroundColor: 'transparent' }]} />
                </View>
              );
            })}
          </View>

          <View style={s.legend}>
            {[
              { color: '#059669', label: tr.floodSafe },
              { color: '#D97706', label: tr.floodCaution },
              { color: '#DC2626', label: tr.floodWarning },
            ].map(l => (
              <View key={l.label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: l.color }]} />
                <Text style={s.legendLabel}>{l.label}</Text>
              </View>
            ))}
          </View>

          {/* This month, in words */}
          {climate.alert.level && (
            <View style={[s.softBox, { backgroundColor: ALERT_TONE[climate.alert.level].bg, marginBottom: 0, marginTop: 14 }]}>
              <Ionicons name={ALERT_TONE[climate.alert.level].icon} size={18} color={ALERT_TONE[climate.alert.level].fg} />
              <View style={{ flex: 1 }}>
                <Text style={[s.alertTitle, { color: ALERT_TONE[climate.alert.level].fg }, T && { fontSize: 15 }]}>
                  {climate.alert.title}
                </Text>
                <Text style={[s.alertMsg, T && { fontSize: 14 }]}>{climate.alert.message}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Disclaimer */}
        <View style={s.note}>
          <Ionicons name="information-circle-outline" size={15} color="#9CA3AF" />
          <Text style={[s.noteText, T && { fontSize: 13 }]}>{tr.guideDisclaimer}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

// Tallest bar in the rain chart
const RAIN_BAR_H = 110;
const PAGE = '#F1F2F1';
const INK  = '#111827';
const SHADOW = {
  shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2,
} as const;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  headerTitle: { fontSize: 21, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  headerSub:   { fontSize: 13, color: '#6B7280', marginTop: 1, fontFamily: 'Inter_500Medium' },
  headerBtn:   { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },

  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 140 },

  /* Cards */
  card:      { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 12, ...SHADOW },
  cardLabel: { fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold' },
  sub:       { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  bigRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 6 },
  big:       { fontSize: 48, lineHeight: 54, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -1.5 },
  bigUnit:   { fontSize: 18, color: '#6B7280', fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  progBg:    { height: 10, borderRadius: 5, backgroundColor: PAGE, overflow: 'hidden', marginTop: 14 },
  progFill:  { height: 10, borderRadius: 5, backgroundColor: '#059669' },

  /* Soft colored boxes (weather, rainfed, this month, translating) */
  softBox:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, padding: 14, marginBottom: 12 },
  softBoxText: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_500Medium' },
  softBoxTime: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  /* Current step */
  stepTop:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  catTile:      { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  catLabel:     { fontSize: 13, fontFamily: 'Inter_700Bold' },
  stepDay:      { fontSize: 13, color: '#6B7280', marginTop: 2, fontFamily: 'Inter_500Medium' },
  keyCheck:     { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: PAGE },
  keyCheckText: { fontSize: 12, color: INK, fontFamily: 'Inter_700Bold' },
  stepTitle:    { fontSize: 21, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -0.3, marginBottom: 12 },
  stepBody:     { fontSize: 15, color: '#1F2937', lineHeight: 23 },
  explainBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: PAGE },
  explainBtnText: { fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold' },
  explainBody:  { fontSize: 14, color: '#1E3A8A', lineHeight: 21, marginTop: 10, backgroundColor: '#EAF1FD', borderRadius: 16, padding: 14 },
  refRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  refText:      { flex: 1, fontSize: 13, color: '#6B7280' },
  refLink:      { fontSize: 13, color: '#059669', fontFamily: 'Inter_700Bold' },
  logBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 18, backgroundColor: INK, marginTop: 16 },
  logBtnText:   { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  logHint:      { fontSize: 12, color: '#6B7280', marginTop: 10, lineHeight: 17 },

  /* Up next */
  nextRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  nextTitle: { fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold' },
  nextDay:   { fontSize: 12, color: '#6B7280', marginTop: 2, fontFamily: 'Inter_500Medium' },

  /* Rain by month */
  rainBars:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 18, minHeight: RAIN_BAR_H + 34 },
  rainCol:    { flex: 1, alignItems: 'center' },
  rainBar:    { width: 14, borderRadius: 7 },
  rainLbl:    { fontSize: 10, color: '#6B7280', marginTop: 6, fontFamily: 'Inter_500Medium' },
  rainLblNow: { color: INK, fontFamily: 'Inter_700Bold' },
  rainNowDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: INK, marginTop: 3 },
  legend:      { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  alertTitle:  { fontSize: 14, marginBottom: 3, fontFamily: 'Inter_700Bold' },
  alertMsg:    { fontSize: 13, color: '#374151', lineHeight: 19 },

  /* Disclaimer */
  note:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, paddingHorizontal: 6 },
  noteText: { fontSize: 12, color: '#6B7280', lineHeight: 18, flex: 1 },

  /* No-guide-yet states (loading / generating / empty / error) */
  emptyWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, paddingBottom: 120, gap: 12 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', ...SHADOW },
  emptyTitle: { fontSize: 17, color: INK, textAlign: 'center', fontFamily: 'Inter_700Bold' },
  emptyBody:  { fontSize: 14, color: '#6B7280', lineHeight: 20, textAlign: 'center' },
  emptyCta:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 18, paddingHorizontal: 24, backgroundColor: INK, marginTop: 8 },
  emptyCtaText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});
