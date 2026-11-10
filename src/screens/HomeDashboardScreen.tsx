import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { SowingQuestion, shortDate } from '@/components/SowingQuestion';
import { sowingQuestionDue } from '@/utils/sowing';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore } from '@/store/appStore';
import { guideSteps, guideProgress, guideDay, guideStageNo } from '@/utils/guideSteps';
import { farmKey, useStepAdvice } from '@/hooks/useFarmForecast';
import { adviceIcon } from '@/utils/stepWeather';
import { cropIsOver, nextCropParams } from '@/utils/nextCrop';
import { STEP_ADVICE_TEXT } from '@/utils/stepTime';
import { LOG_WORD_KEYS, stageLabel } from '@/utils/progressLogs';
import { useAuthStore } from '@/features/auth/store';
import { Skeleton } from '@/components/Skeleton';
import { dedupeName } from '@/utils/formatting';
import { useTranslation } from '@/i18n/useTranslation';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { loadFarmData } from '@/services/farmData';
import { cropDays } from '@/utils/cropDays';
import { empty, farmPhoto, panaboHour, stageImage, stepIcon, weatherIcon } from '@/assets/illustrations';
import { loadGuide, refreshCycle, restoreGuide } from '@/services/guideLoader';
import { useLanguageStore } from '@/store/languageStore';

type Nav = StackNavigationProp<any>;

// The stages from Harvesting on: Home asks for the harvest until it is recorded
const HARVEST_STAGE_NO = 9;
// How many forecast hours the weather card shows: all of them fit across a phone
const HOURS_SHOWN = 5;

// The forecast's hours are Panabo time ("yyyy-MM-ddTHH:00"): read the hour as written,
// so the label and the day/night picture don't shift on a phone set to another zone
function forecastHour(iso: string): number {
  const h = Number(String(iso).slice(11, 13));
  return Number.isFinite(h) ? h : new Date(iso).getHours();
}
function hourFmt(iso: string) {
  const h = forecastHour(iso);
  return `${h % 12 || 12}${h >= 12 ? 'PM' : 'AM'}`;
}

// The PalayCheck step's kind -> its tile colour (the icon comes from stepIcon)
const TASK_META: Record<string, { color: string; bg: string }> = {
  planting:        { color: '#059669', bg: '#E8F5EF' },
  fertilizer:      { color: '#D97706', bg: '#FEF3DC' },
  pest_prevention: { color: '#DC2626', bg: '#FDECEC' },
  irrigation:      { color: '#2563EB', bg: '#EAF1FD' },
  harvesting:      { color: '#B45309', bg: '#FDF3E1' },
};

/** The small round arrow in a card's corner (the card itself is the button). */
const ArrowBadge: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <View style={[s.badge, dark && s.badgeDark]}>
    <Ionicons name="arrow-forward" size={14} color={dark ? '#FFFFFF' : '#111827'} style={{ transform: [{ rotate: '-45deg' }] }} />
  </View>
);

/**
 * Home: what the farmer needs today, in this order. My crop (stage, day, harvest date),
 * the planting guide's next steps with their weather warnings, the weather, then the
 * farms (tap one to show it). Before a crop is planted the crop card shows the top recommendation; once it
 * reaches harvesting it asks for the harvest. All logs live on the Progress tab.
 */
export const HomeDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tr = useTranslation();
  const { isLargeText: T } = useAccessibility();   // easy-reading text scale
  const [showHourly, setShowHourly] = useState(false);
  const lang = useLanguageStore(st => st.language);

  const { user: authUser } = useAuthStore();
  const { farms, farmsLoaded, latestRecommendation, latestGuide, completedGuideSteps, activeCycle } = useAppStore();
  const selectedFarm = useSelectedFarm();
  const farmId = selectedFarm?.id;

  // The crop card needs this farm's cycle; nothing else loads it at start-up
  useEffect(() => { if (farmId != null) void refreshCycle(); }, [farmId]);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? tr.homeGreetingAm : hour < 18 ? tr.homeGreetingPm : tr.homeGreetingEve;
  const displayName = dedupeName(authUser?.name) || 'Farmer';
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  // ── Weather: the app's shared forecast for this farm (useFarmForecast keeps it fresh) ──
  const forecast  = useAppStore(st => st.forecast);
  const wxData    = forecast && forecast.key === farmKey(selectedFarm) ? forecast.data : null;
  const wxCurrent = wxData?.current ?? null;
  const hourly    = (wxData?.hourly ?? []).map(h => ({ time: hourFmt(h.time), img: weatherIcon(h.weather_code, forecastHour(h.time)), temp: Math.round(h.temp) }));
  const { adviceFor } = useStepAdvice();

  // ── My crop ──
  // Only a growing crop: a finished season leaves the card asking for the next one
  const cycle    = activeCycle?.status === 'active' && (farmId == null || activeCycle.farm === farmId) ? activeCycle : null;
  // A growing crop with no guide on the phone (just logged in): bring it back
  const needsGuide = !!cycle && farmId != null && !latestGuide;
  useEffect(() => {
    if (needsGuide) restoreGuide(farmId as number, lang).catch(() => {});
  }, [needsGuide, farmId, lang]);
  const days     = cropDays(cycle?.planting_date, cycle?.expected_harvest_date);
  const serverStageNo = cycle?.stage?.stage_no ?? null;
  const guideList = guideSteps(latestGuide);
  // No growth stage before the crop is sown or while "Did you sow already?" is still open
  const notSown  = (!!days && days.day < 1)
    || (sowingQuestionDue(latestGuide, completedGuideSteps) && guideStageNo(guideList, completedGuideSteps) === 1);
  const stageNo  = notSown ? null : guideStageNo(guideList, completedGuideSteps, serverStageNo) ?? serverStageNo;   // same as the Progress card
  const stageKey = LOG_WORD_KEYS[stageLabel(stageNo)];
  const stageTxt = notSown ? tr.stagePrep : stageKey ? (tr as any)[stageKey] : (cycle?.stage?.name ?? '');
  const stagePicture = notSown ? empty.no_farm : stageImage(stageNo);   // before sowing: the field being prepared
  const harvestDue = !!cycle && Math.max(stageNo ?? 0, (cycle as any).age_stage_no ?? serverStageNo ?? 0) >= HARVEST_STAGE_NO && cycle.yield_per_ha == null;

  const topResult = latestRecommendation?.results?.[0];
  const topScore  = topResult ? Math.round(topResult.rsi_score) : null;

  // ── To do: the current PalayCheck step and the two after it (same rule as the Planting tab) ──
  const cropOver = cropIsOver(activeCycle);
  const tasks = (() => {
    if (cropOver) return [];
    const { current, next } = guideProgress(guideSteps(latestGuide), completedGuideSteps);
    const today = guideDay(latestGuide);
    return [current, ...next].filter(st => !!st).slice(0, 3).map(st => ({
      id:     st!.id,
      title:  st!.title,
      cat:    st!.category as string,
      offset: st!.daysAfterPlanting - today,
      advice: adviceFor(st),
    }));
  })();
  const dayLabel = (offset: number) =>
    offset === -1 ? tr.guideLateOne
    : offset < 0 ? tr.guideLate.replace('{n}', String(-offset))
    : offset === 0 ? tr.homeToday
    : offset === 1 ? tr.homeTomorrow
    : tr.homeInDays.replace('{n}', String(offset));
  // Tapping a step opens the log form that finishes it
  const logStep = (stepId: string) => {
    useAppStore.getState().setPendingLogStep(stepId, 'HomeTab');
    navigation.navigateDeprecated('ProgressTab', { screen: 'ProgressDashboardHome' });
  };

  const sowingDue = !cropOver && sowingQuestionDue(latestGuide, completedGuideSteps);

  // A farm tile shows that farm on every tab; its arrow opens the farm's pin
  const [switching, setSwitching] = useState<number | null>(null);
  const showFarm = async (farm: any) => {
    if (farm.id === farmId || switching != null) return;
    useAppStore.getState().selectFarm(farm.id);   // clears the old farm's data
    setSwitching(farm.id);
    try {
      await loadFarmData(farm);
      // A farm with a crop has a saved guide: load it so its tasks show here at once
      // (otherwise only the Planting tab loads it)
      const st = useAppStore.getState();
      const recId = st.latestRecommendation?.id;
      if (recId && st.activeCycle?.status === 'active') await loadGuide(recId, lang).catch(() => {});
    } catch { /* each part falls back on its own */ }
    setSwitching(null);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={[s.greet, T && { fontSize: 15 }]}>{tr.homeGreeting} {greeting}</Text>
            <Text style={[s.name, T && { fontSize: 24 }]} numberOfLines={1}>{displayName}</Text>
          </View>
          <View style={s.headerBtn}><NotificationBell color="#111827" size={20} /></View>
          <TouchableOpacity style={s.avatar} onPress={() => navigation.navigateDeprecated('ProfileTab')} activeOpacity={0.85}>
            <Text style={s.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* ── My crop ── */}
        {cycle ? (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigateDeprecated('ProgressTab', { screen: 'ProgressDashboardHome' })}
          >
            <View style={s.cardHead}>
              <Text style={[s.cardLabel, T && { fontSize: 15 }]}>{tr.homeMyCrop}</Text>
              <ArrowBadge />
            </View>
            <View style={s.cropRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.cropName, T && { fontSize: 22 }]} numberOfLines={2}>{cycle.variety_name ?? '—'}</Text>
                {!!stageTxt && <Text style={[s.cropStage, T && { fontSize: 16 }]}>{stageTxt}</Text>}
              </View>
              {/* The rice plant at today's stage */}
              {!!stagePicture && <Image source={stagePicture} style={s.stagePic} resizeMode="contain" />}
            </View>

            {days && !notSown ? (
              <>
                <View style={s.dayRow}>
                  <Text style={s.dayBig}>{days.daysAfterSowing}</Text>
                  {days.total != null && <Text style={s.daySmall}>/ {days.total} {tr.homeDaysUnit}</Text>}
                </View>
                {days.total != null && (
                  <View style={s.track}><View style={[s.fill, { width: `${Math.round(days.share * 100)}%` }]} /></View>
                )}
                {!!cycle.expected_harvest_date && (
                  <Text style={[s.cropMeta, T && { fontSize: 14 }]}>
                    {tr.homeHarvestOn.replace('{date}', shortDate(cycle.expected_harvest_date, tr))}
                  </Text>
                )}
              </>
            ) : !!cycle.planting_date && (
              <Text style={[s.cropMeta, T && { fontSize: 14 }]}>
                {tr.homeSowOn.replace('{date}', shortDate(cycle.planting_date, tr))}
              </Text>
            )}

            {harvestDue && (
              <TouchableOpacity
                style={[s.darkBtn, { marginTop: 16 }]}
                onPress={() => navigation.navigateDeprecated('ProgressTab', { screen: 'YieldRecord' })}
                activeOpacity={0.85}
              >
                <Ionicons name="basket-outline" size={17} color="#FFFFFF" />
                <Text style={s.darkBtnText}>{tr.harvestAskYes}</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.9}
            onPress={() => navigation.navigateDeprecated('RecommendationResults')}
          >
            <View style={s.cardHead}>
              <Text style={[s.cardLabel, T && { fontSize: 15 }]}>{tr.homeMyCrop}</Text>
              <ArrowBadge />
            </View>
            <View style={s.cropRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.cropName, T && { fontSize: 22 }]}>{tr.homeNoCrop}</Text>
                <Text style={[s.cropMeta, { marginTop: 4 }, T && { fontSize: 14 }]}>{tr.homeNoCropHint}</Text>
              </View>
              <Image source={empty.no_farm} style={s.stagePic} resizeMode="contain" />
            </View>
            {/* After a harvest this list is last season's; the button scans for a new one */}
            {topResult && !cropOver && (
              <View style={s.recRow}>
                <View style={[s.taskIcon, { backgroundColor: '#E8F5EF' }]}>
                  <Ionicons name="leaf-outline" size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, T && { fontSize: 16 }]} numberOfLines={1}>{topResult.variety.common_name}</Text>
                  <Text style={s.rowMeta}>{topResult.variety.maturity_days} {tr.homeDaysUnit}</Text>
                </View>
                {topScore != null && <Text style={s.recScore}>{topScore}%</Text>}
              </View>
            )}
            <TouchableOpacity
              style={[s.darkBtn, { marginTop: 16 }]}
              onPress={() => selectedFarm
                ? navigation.navigateDeprecated('AnalysisLoading', nextCropParams(selectedFarm))
                : navigation.navigateDeprecated('FarmDetailsForm')}
              activeOpacity={0.85}
            >
              <Text style={s.darkBtnText}>{tr.nextCropBtn}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── "Did you sow already?" from the planned sowing day until answered ── */}
        {sowingDue && <View style={s.block}><SowingQuestion /></View>}

        {/* ── To do: the planting guide's next steps ── */}
        {!sowingDue && tasks.length > 0 && (
          <View style={s.card}>
            <TouchableOpacity style={s.cardHead} onPress={() => navigation.navigateDeprecated('PlantingTab')} activeOpacity={0.7}>
              <Text style={[s.cardLabel, T && { fontSize: 15 }]}>{tr.homeUpcomingTasks}</Text>
              <Ionicons name="chevron-forward" size={18} color="#111827" />
            </TouchableOpacity>

            {tasks.map((t, i) => {
              const meta = TASK_META[t.cat] || TASK_META.planting;
              const stop = t.advice?.level === 'stop';
              return (
                <TouchableOpacity key={t.id} style={[s.taskRow, i > 0 && s.taskRowGap]} onPress={() => logStep(t.id)} activeOpacity={0.75}>
                  <View style={[s.taskIcon, { backgroundColor: meta.bg }]}>
                    <Image source={stepIcon(t.cat)} style={s.taskPic} resizeMode="contain" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowMeta, { color: t.offset < 0 ? '#D97706' : '#6B7280' }, T && { fontSize: 13 }]}>{dayLabel(t.offset)}</Text>
                    <Text style={[s.rowTitle, i === 0 && s.rowTitleNow, T && { fontSize: 16 }]} numberOfLines={2}>{t.title}</Text>
                    {t.advice && (
                      <View style={[s.advice, { backgroundColor: stop ? '#FDECEC' : '#FEF3DC' }]}>
                        <Ionicons name={adviceIcon(t.advice.code)} size={14} color={stop ? '#DC2626' : '#B45309'} />
                        <Text style={[s.adviceText, { color: stop ? '#B91C1C' : '#92400E' }, T && { fontSize: 13 }]} numberOfLines={2}>
                          {(tr as any)[STEP_ADVICE_TEXT[t.advice.code]]}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={[s.darkBtn, { marginTop: 16 }]} onPress={() => logStep(tasks[0].id)} activeOpacity={0.85}>
              <Ionicons name="add-circle" size={18} color="#FFFFFF" />
              <Text style={s.darkBtnText}>{tr.homeLogStep}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Weather ── */}
        <TouchableOpacity style={s.card} onPress={() => setShowHourly(v => !v)} activeOpacity={0.95}>
          <View style={s.cardHead}>
            <View style={s.place}>
              <Ionicons name="location-sharp" size={14} color="#111827" />
              <Text style={[s.placeText, T && { fontSize: 15 }]} numberOfLines={1}>
                {(selectedFarm as any)?.barangay || (selectedFarm as any)?.name || '—'}
              </Text>
            </View>
            <Ionicons name={showHourly ? 'chevron-up' : 'chevron-down'} size={18} color="#9CA3AF" />
          </View>

          <View style={s.wxMain}>
            {wxCurrent == null ? (
              <Skeleton w={110} h={48} br={8} />
            ) : (
              <Text style={s.temp}>{Math.round(wxCurrent.temperature)}<Text style={s.tempUnit}>°C</Text></Text>
            )}
            <Image source={weatherIcon(wxCurrent?.weather_code, panaboHour())} style={s.wxImg} resizeMode="contain" />
          </View>

          {showHourly && hourly.length > 0 && (
            // The next hours side by side, all fully shown: a card cut off at the edge looked draggable
            <View style={s.hours}>
              {hourly.slice(0, HOURS_SHOWN).map((h, i) => (
                <View key={i} style={s.hour}>
                  <Text style={s.hourTime}>{h.time}</Text>
                  <Image source={h.img} style={{ width: 26, height: 26, marginVertical: 6 }} resizeMode="contain" />
                  <Text style={s.hourTemp}>{h.temp}°</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.divider} />
          <View style={s.stats}>
            {[
              { label: tr.wxRain,     value: wxCurrent ? `${wxCurrent.rain_pct}%` : null },
              { label: tr.wxHumidity, value: wxCurrent ? `${Math.round(wxCurrent.humidity)}%` : null },
              { label: tr.wxWind,     value: wxCurrent ? `${Math.round(wxCurrent.wind_speed_kph)} kph` : null },
            ].map(st => (
              <View key={st.label} style={s.stat}>
                <Text style={[s.statLabel, T && { fontSize: 13 }]} numberOfLines={1}>{st.label}</Text>
                {st.value == null
                  ? <Skeleton w={44} h={16} br={4} style={{ marginTop: 4 }} />
                  : <Text style={[s.statValue, T && { fontSize: 18 }]}>{st.value}</Text>}
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* ── My farms: tap one to show it, its arrow edits the pin; the last tile adds a farm ── */}
        <Text style={[s.sectionTitle, T && { fontSize: 19 }]}>{tr.homeMyFarms}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.farms}>
          {!farmsLoaded && farms.length === 0 && [0, 1].map(i => (
            <View key={i} style={s.farmTile}><Skeleton w={110} h={14} br={4} /><Skeleton w={80} h={11} br={4} style={{ marginTop: 8 }} /></View>
          ))}
          {farms.map((f: any) => {
            const isSel = f.id === selectedFarm?.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[s.farmTile, isSel && s.farmTileSel]}
                onPress={() => showFarm(f)}
                activeOpacity={0.85}
              >
                {/* A rice-field photo for looks only, not this farm's own field */}
                <View style={s.farmArt}>
                  <Image source={farmPhoto(f.id)} style={s.farmPhoto} resizeMode="cover" />
                  {switching === f.id && (
                    <View style={s.farmBusy}><ActivityIndicator color="#FFFFFF" /></View>
                  )}
                </View>
                <View style={s.farmFoot}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowTitle, isSel && s.onDark, T && { fontSize: 16 }]} numberOfLines={1}>{f.name}</Text>
                    <Text style={[s.rowMeta, isSel && s.onDarkSoft]} numberOfLines={1}>{f.barangay || '—'}</Text>
                    {f.area_hectares != null && <Text style={[s.rowMeta, isSel && s.onDarkSoft]}>{f.area_hectares} ha</Text>}
                  </View>
                  <TouchableOpacity
                    onPress={() => navigation.navigateDeprecated('GISPinning', { farmId: f.id })}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <View style={[s.badge, isSel && s.badgeOnDark]}>
                      <Ionicons name="arrow-forward" size={14} color={isSel ? '#FFFFFF' : '#111827'} style={{ transform: [{ rotate: '-45deg' }] }} />
                    </View>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[s.farmTile, s.farmAdd]} onPress={() => navigation.navigateDeprecated('FarmDetailsForm')} activeOpacity={0.85}>
            <View style={[s.badge, s.badgeDark, { width: 40, height: 40, borderRadius: 20 }]}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </View>
            <Text style={[s.rowTitle, { marginTop: 10 }]}>{tr.homeAddFarm}</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={{ height: 140 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const BG   = '#F1F2F1';
const INK  = '#111827';
const SOFT = '#6B7280';

const card = {
  backgroundColor: '#FFFFFF',
  borderRadius: 26,
  shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  /* Greeting */
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, paddingVertical: 10 },
  greet:      { fontSize: 13, color: SOFT, fontFamily: 'Inter_500Medium' },
  name:       { fontSize: 21, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },
  headerBtn:  { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  avatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: INK, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },

  /* Cards */
  card:      { ...card, padding: 20, marginTop: 12 },
  block:     { marginTop: 12 },
  cardHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardLabel: { fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold' },
  badge:     { width: 30, height: 30, borderRadius: 15, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  badgeDark: { backgroundColor: INK },
  darkBtn:   {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 54, borderRadius: 18, backgroundColor: INK,
  },
  darkBtnText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },

  /* My crop */
  cropRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stagePic:  { width: 76, height: 76 },
  taskPic:   { width: 36, height: 36 },
  cropName:  { fontSize: 20, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  cropStage: { fontSize: 14, color: '#059669', fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  dayRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 14 },
  dayBig:    { fontSize: 44, lineHeight: 48, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -1.5 },
  daySmall:  { fontSize: 14, color: SOFT, fontFamily: 'Inter_500Medium', marginBottom: 7 },
  track:     { height: 10, borderRadius: 5, backgroundColor: BG, overflow: 'hidden', marginTop: 10 },
  fill:      { height: 10, borderRadius: 5, backgroundColor: '#059669' },
  cropMeta:  { fontSize: 13, color: SOFT, fontFamily: 'Inter_500Medium', marginTop: 10 },
  recRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 18, backgroundColor: BG },
  recScore:  { fontSize: 16, color: '#059669', fontFamily: 'Inter_700Bold' },

  /* To do */
  taskRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  taskRowGap:  { marginTop: 14 },
  taskIcon:    { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  rowTitle:    { fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold', marginTop: 1 },
  rowTitleNow: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  rowMeta:     { fontSize: 12, color: SOFT, fontFamily: 'Inter_500Medium' },
  advice:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },
  adviceText:  { flex: 1, fontSize: 12, lineHeight: 16, fontFamily: 'Inter_500Medium' },

  /* Weather */
  place:     { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  placeText: { fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold' },
  wxMain:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  temp:      { fontSize: 52, lineHeight: 58, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -2 },
  tempUnit:  { fontSize: 22, fontFamily: 'Inter_600SemiBold', letterSpacing: 0 },
  wxImg:     { width: 60, height: 60 },
  hours:     { flexDirection: 'row', gap: 6, paddingTop: 12 },
  hour:      { flex: 1, alignItems: 'center', backgroundColor: BG, borderRadius: 16, paddingVertical: 10 },
  hourTime:  { fontSize: 11, color: SOFT, fontFamily: 'Inter_600SemiBold' },
  hourTemp:  { fontSize: 13, color: INK, fontFamily: 'Inter_700Bold' },
  divider:   { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginVertical: 14 },
  stats:     { flexDirection: 'row' },
  stat:      { flex: 1 },
  statLabel: { fontSize: 12, color: SOFT, fontFamily: 'Inter_500Medium' },
  statValue: { fontSize: 16, color: INK, fontFamily: 'Inter_700Bold', marginTop: 4 },

  /* Farms */
  sectionTitle: { fontSize: 17, color: INK, fontFamily: 'Inter_700Bold', marginTop: 24, marginBottom: 10, paddingHorizontal: 4 },
  farms:        { gap: 12, paddingRight: 4, paddingBottom: 6 },
  farmTile:     { ...card, width: 170, padding: 10 },
  farmTileSel:  { backgroundColor: INK },
  onDark:       { color: '#FFFFFF' },
  onDarkSoft:   { color: '#9CA3AF' },
  badgeOnDark:  { backgroundColor: '#374151' },
  farmArt:      { height: 96, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E8F5EF' },
  farmPhoto:    { width: '100%', height: '100%' },
  farmBusy:     { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.35)', justifyContent: 'center', alignItems: 'center' },
  farmFoot:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 4, paddingBottom: 2 },
  farmAdd:      { justifyContent: 'center', alignItems: 'center', minHeight: 150 },
});
