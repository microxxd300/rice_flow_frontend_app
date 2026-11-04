import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { SowingQuestion, shortDate } from '@/components/SowingQuestion';
import { sowingQuestionDue } from '@/utils/sowing';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore } from '@/store/appStore';
import { guideSteps, guideProgress, guideDay } from '@/utils/guideSteps';
import { farmKey, useStepWeather } from '@/hooks/useFarmForecast';
import { ADVICE_TEXT } from '@/utils/stepWeather';
import { LOG_WORD_KEYS, stageLabel } from '@/utils/progressLogs';
import { useAuthStore } from '@/features/auth/store';
import { Skeleton } from '@/components/Skeleton';
import { dedupeName } from '@/utils/formatting';
import { useTranslation } from '@/i18n/useTranslation';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { FarmSwitcher } from '@/components/FarmSwitcher';
import { cropDays } from '@/utils/cropDays';
import { refreshCycle } from '@/services/guideLoader';

type Nav = StackNavigationProp<any>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// The stages from Harvesting on: Home asks for the harvest until it is recorded
const HARVEST_STAGE_NO = 9;

const WX_IMAGES = {
  heavy_rain:    require('../assets/weather_icons/weather/heavy_rain.png'),
  light_rain:    require('../assets/weather_icons/weather/light_rain.png'),
  drizzle:       require('../assets/weather_icons/weather/Drizzle_rain.png'),
  partly_cloudy: require('../assets/weather_icons/weather/partly_cloudy.png'),
  partly_sunny:  require('../assets/weather_icons/weather/partly_sunny.png'),
  mostly_sunny:  require('../assets/weather_icons/weather/Mostly_sunny.png'),
  sunny:         require('../assets/weather_icons/weather/sunny.png'),
  cloudy:        require('../assets/weather_icons/weather/cloudy.png'),
};

// WMO weather code -> our local image
function codeToImage(code?: number) {
  if (code === 0)                       return WX_IMAGES.sunny;
  if (code === 1)                       return WX_IMAGES.mostly_sunny;
  if (code === 2)                       return WX_IMAGES.partly_sunny;
  if (code === 3 || code === 45 || code === 48) return WX_IMAGES.cloudy;
  if (code !== undefined && code >= 51 && code <= 57) return WX_IMAGES.drizzle;
  if (code === 61 || code === 80 || code === 63 || code === 81) return WX_IMAGES.light_rain;
  if (code === 65 || code === 82)       return WX_IMAGES.heavy_rain;
  if (code !== undefined && code >= 95) return WX_IMAGES.heavy_rain;
  return WX_IMAGES.partly_cloudy;
}

function hourFmt(iso: string) {
  const d = new Date(iso);
  let h = d.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${h}${ampm}`;
}

// The PalayCheck step's kind -> its icon tile
const TASK_META: Record<string, { icon: IconName; color: string; bg: string }> = {
  planting:        { icon: 'leaf-outline',             color: '#059669', bg: '#E8F5EF' },
  fertilizer:      { icon: 'flask-outline',            color: '#D97706', bg: '#FEF3DC' },
  pest_prevention: { icon: 'shield-checkmark-outline', color: '#DC2626', bg: '#FDECEC' },
  irrigation:      { icon: 'water-outline',            color: '#2563EB', bg: '#EAF1FD' },
  harvesting:      { icon: 'basket-outline',           color: '#B45309', bg: '#FDF3E1' },
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
 * farms. Before a crop is planted the crop card shows the top recommendation; once it
 * reaches harvesting it asks for the harvest. All logs live on the Progress tab.
 */
export const HomeDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tr = useTranslation();
  const { isLargeText: T } = useAccessibility();   // easy-reading text scale
  const [showHourly, setShowHourly] = useState(false);

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
  const hourly    = (wxData?.hourly ?? []).map(h => ({ time: hourFmt(h.time), img: codeToImage(h.weather_code), temp: Math.round(h.temp) }));
  const { adviceFor } = useStepWeather();

  // ── My crop ──
  // Only a growing crop: a finished season leaves the card asking for the next one
  const cycle    = activeCycle?.status === 'active' && (farmId == null || activeCycle.farm === farmId) ? activeCycle : null;
  const days     = cropDays(cycle?.planting_date, cycle?.expected_harvest_date);
  const stageNo  = cycle?.stage?.stage_no ?? null;
  const stageKey = LOG_WORD_KEYS[stageLabel(stageNo)];
  const stageTxt = stageKey ? (tr as any)[stageKey] : (cycle?.stage?.name ?? '');
  const harvestDue = !!cycle && stageNo != null && stageNo >= HARVEST_STAGE_NO && cycle.yield_per_ha == null;

  const topResult = latestRecommendation?.results?.[0];
  const topScore  = topResult ? Math.round(topResult.rsi_score) : null;

  // ── To do: the current PalayCheck step and the two after it (same rule as the Planting tab) ──
  const tasks = (() => {
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
    offset < 0 ? tr.guideLate.replace('{n}', String(-offset))
    : offset === 0 ? tr.homeToday
    : offset === 1 ? tr.homeTomorrow
    : tr.homeInDays.replace('{n}', String(offset));
  // Tapping a step opens the log form that finishes it
  const logStep = (stepId: string) => {
    useAppStore.getState().setPendingLogStep(stepId);
    navigation.navigateDeprecated('ProgressTab', { screen: 'ProgressDashboardHome' });
  };

  const sowingDue = sowingQuestionDue(latestGuide, completedGuideSteps);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

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

        {/* Only with 2+ farms */}
        <View style={s.switcher}><FarmSwitcher /></View>

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
            <Text style={[s.cropName, T && { fontSize: 22 }]} numberOfLines={1}>{cycle.variety_name ?? '—'}</Text>
            {!!stageTxt && <Text style={[s.cropStage, T && { fontSize: 16 }]}>{stageTxt}</Text>}

            {days && days.day >= 1 ? (
              <>
                <View style={s.dayRow}>
                  <Text style={s.dayBig}>{days.day}</Text>
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
            <Text style={[s.cropName, T && { fontSize: 22 }]}>{tr.homeNoCrop}</Text>
            <Text style={[s.cropMeta, { marginTop: 4 }, T && { fontSize: 14 }]}>{tr.homeNoCropHint}</Text>
            {topResult && (
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
            <View style={[s.darkBtn, { marginTop: 16 }]}>
              <Text style={s.darkBtnText}>{tr.homeSeeVarieties}</Text>
            </View>
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
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowMeta, { color: t.offset < 0 ? '#D97706' : '#6B7280' }, T && { fontSize: 13 }]}>{dayLabel(t.offset)}</Text>
                    <Text style={[s.rowTitle, i === 0 && s.rowTitleNow, T && { fontSize: 16 }]} numberOfLines={2}>{t.title}</Text>
                    {t.advice && (
                      <View style={[s.advice, { backgroundColor: stop ? '#FDECEC' : '#FEF3DC' }]}>
                        <Ionicons name="rainy-outline" size={14} color={stop ? '#DC2626' : '#B45309'} />
                        <Text style={[s.adviceText, { color: stop ? '#B91C1C' : '#92400E' }, T && { fontSize: 13 }]} numberOfLines={2}>
                          {(tr as any)[ADVICE_TEXT[t.advice.code]]}
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
            <Image source={codeToImage(wxCurrent?.weather_code)} style={s.wxImg} resizeMode="contain" />
          </View>

          {showHourly && hourly.length > 0 && (
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={s.hours}>
              {hourly.map((h, i) => (
                <View key={i} style={s.hour}>
                  <Text style={s.hourTime}>{h.time}</Text>
                  <Image source={h.img} style={{ width: 26, height: 26, marginVertical: 6 }} resizeMode="contain" />
                  <Text style={s.hourTemp}>{h.temp}°</Text>
                </View>
              ))}
            </ScrollView>
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

        {/* ── My farms: tap to edit the pin; the last tile adds a farm ── */}
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
                onPress={() => navigation.navigateDeprecated('GISPinning', { farmId: f.id })}
                activeOpacity={0.85}
              >
                <View style={[s.farmArt, isSel && { backgroundColor: '#059669' }]}>
                  <Ionicons name="leaf" size={22} color={isSel ? '#FFFFFF' : '#059669'} />
                </View>
                <View style={s.farmFoot}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowTitle, T && { fontSize: 16 }]} numberOfLines={1}>{f.name}</Text>
                    <Text style={s.rowMeta} numberOfLines={1}>{f.barangay || '—'}</Text>
                    {f.area_hectares != null && <Text style={s.rowMeta}>{f.area_hectares} ha</Text>}
                  </View>
                  <ArrowBadge />
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
  // FarmSwitcher brings its own side padding
  switcher:   { marginHorizontal: -20, marginBottom: 4 },

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
  hours:     { gap: 8, paddingTop: 12 },
  hour:      { alignItems: 'center', backgroundColor: BG, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, minWidth: 60 },
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
  farmTileSel:  { borderWidth: 2, borderColor: '#059669' },
  farmArt:      { height: 84, borderRadius: 18, backgroundColor: '#E8F5EF', justifyContent: 'center', alignItems: 'center' },
  farmFoot:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 4, paddingBottom: 2 },
  farmAdd:      { justifyContent: 'center', alignItems: 'center', minHeight: 150 },
});
