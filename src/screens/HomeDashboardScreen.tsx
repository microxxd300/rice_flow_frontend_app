import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  mockUser,
  mockFarms,
  mockEnvironmentalScans,
  mockRecommendations,
  mockRiceVarieties,
  mockPlantingGuides,
} from '../data/mockData';
import { useAppStore } from '@/store/appStore';
import { apiWeather, type WeatherCurrent, type WeatherHour } from '@/services/apiService';
import { useAuthStore } from '@/features/auth/store';
import { Skeleton } from '@/components/Skeleton';
import { dedupeName } from '@/utils/formatting';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/languageStore';

type Nav = StackNavigationProp<any>;

const DAY_NAMES = {
  en:  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fil: ['Linggo', 'Lunes', 'Martes', 'Miyerkules', 'Huwebes', 'Biyernes', 'Sabado'],
  ceb: ['Domingo', 'Lunes', 'Martes', 'Miyerkules', 'Huwebes', 'Biyernes', 'Sabado'],
} as const;
const MONTH_NAMES = {
  en:  ['January','February','March','April','May','June','July','August','September','October','November','December'],
  fil: ['Enero','Pebrero','Marso','Abril','Mayo','Hunyo','Hulyo','Agosto','Setyembre','Oktubre','Nobyembre','Disyembre'],
  ceb: ['Enero','Pebrero','Marso','Abril','Mayo','Hunyo','Hulyo','Agosto','Setyembre','Oktubre','Nobyembre','Disyembre'],
} as const;

function formatDate(d: Date, lang: 'en' | 'fil' | 'ceb') {
  const D = DAY_NAMES[lang]; const M = MONTH_NAMES[lang];
  return `${D[d.getDay()]}, ${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTime(d: Date) {
  let h = d.getHours();
  const m    = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

export const HomeDashboardScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tr = useTranslation();
  const lang = useLanguageStore(s => s.language);
  const [greeting,    setGreeting]    = useState('');
  const [now,         setNow]         = useState(new Date());
  const [showHourly,  setShowHourly]  = useState(false);

  const { user: authUser } = useAuthStore();
  const { farms: realFarms, farmsLoaded, latestRecommendation, latestGuide, progressLogs } = useAppStore();

  const STAGE_LABELS: Record<string, string> = {
    'Seedling':           tr.stageSeedling,
    'Vegetative':         tr.stageVegetative,
    'Tillering':          tr.stageTillering,
    'Stem Elongation':    tr.stageStemElong,
    'Panicle Initiation': tr.stagePanicle,
    'Heading':            tr.stageHeading,
    'Ripening':           tr.stageRipening,
    'Harvest':            tr.stageHarvest,
  };

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12)      setGreeting(tr.homeGreetingAm);
    else if (h < 18) setGreeting(tr.homeGreetingPm);
    else             setGreeting(tr.homeGreetingEve);
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [tr]);

  // Use real farms if available, otherwise fall back to mock
  const hasFarms = realFarms.length > 0;
  const farm     = hasFarms ? realFarms[0] as any : mockFarms[0];
  const farm2    = hasFarms && realFarms.length > 1 ? realFarms[1] as any : mockFarms[1];

  const scan       = mockEnvironmentalScans[0];
  const rawStage   = 'Panicle Initiation';
  const stageLabel = STAGE_LABELS[rawStage] ?? rawStage;

  const guide      = mockPlantingGuides[0];
  const guideSteps = guide?.steps ?? [];
  const cycleDay   = 45;
  const cycleDays  = guideSteps.reduce((max, s) => Math.max(max, s.daysAfterPlanting), 0) || 115;
  const daysLeft   = cycleDays - cycleDay;
  const progress   = Math.round((cycleDay / cycleDays) * 100);

  // Use real recommendation top result if available
  const topRealResult = latestRecommendation?.results?.[0];
  const topRec        = topRealResult ? null : mockRecommendations[0];
  const topVariety    = topRealResult
    ? { name: topRealResult.variety.common_name, maturityDays: topRealResult.variety.maturity_days, avgYield: topRealResult.variety.avg_yield_t_ha, floodTolerance: topRealResult.variety.submergence_tolerance }
    : (mockRiceVarieties.find(v => v.id === topRec?.varietyId) ?? mockRiceVarieties[0]);
  const topScore      = topRealResult ? Math.round(topRealResult.rsi_score) : topRec?.suitabilityScore ?? 88;

  const floodRisk  = scan?.floodRisk ?? 'high';
  const rainfallMm = scan?.rainfallMm ?? 2500;
  const rainPct    = rainfallMm >= 2500 ? 80 : rainfallMm >= 2000 ? 60 : 35;
  const temp        = 32;
  const windKph     = 12;

  // Derive display name: prefer real auth user, fall back to mock
  const displayName = dedupeName(authUser?.name) || mockUser.name;
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

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

  // WMO weather code -> our local image + Filipino description
  const codeToImage = (code?: number) => {
    if (code === 0)                       return WX_IMAGES.sunny;
    if (code === 1)                       return WX_IMAGES.mostly_sunny;
    if (code === 2)                       return WX_IMAGES.partly_sunny;
    if (code === 3 || code === 45 || code === 48) return WX_IMAGES.cloudy;
    if (code !== undefined && code >= 51 && code <= 57) return WX_IMAGES.drizzle;
    if (code === 61 || code === 80)       return WX_IMAGES.light_rain;
    if (code === 63 || code === 81)       return WX_IMAGES.light_rain;
    if (code === 65 || code === 82)       return WX_IMAGES.heavy_rain;
    if (code !== undefined && code >= 95) return WX_IMAGES.heavy_rain;
    return WX_IMAGES.partly_cloudy;
  };
  const codeToDesc = (code?: number) => {
    if (code === 0)                       return tr.wxClear;
    if (code === 1)                       return tr.wxMostlyClear;
    if (code === 2)                       return tr.wxPartlyCloudy;
    if (code === 3 || code === 45 || code === 48) return tr.wxOvercast;
    if (code !== undefined && code >= 51 && code <= 57) return tr.wxDrizzle;
    if (code === 61 || code === 80)       return tr.wxLightRain;
    if (code === 63 || code === 81)       return tr.wxRainDesc;
    if (code === 65 || code === 82)       return tr.wxHeavyRain;
    if (code !== undefined && code >= 95) return tr.wxThunder;
    return tr.wxFair;
  };

  // Live weather (current + next 8 hours) from Open-Meteo via Django
  const [wxCurrent, setWxCurrent] = useState<WeatherCurrent | null>(null);
  const [wxHourly,  setWxHourly]  = useState<WeatherHour[]>([]);
  const farmLat = realFarms[0]?.latitude;
  const farmLng = realFarms[0]?.longitude;
  const fetchWeather = () => {
    if (farmLat == null || farmLng == null) return;
    apiWeather.current(farmLat, farmLng)
      .then(res => { setWxCurrent(res.data.current); setWxHourly(res.data.hourly || []); })
      .catch(() => {});
  };
  useEffect(() => {
    fetchWeather();
    // Auto-refresh every 5 minutes (weather + clock tick happens elsewhere every minute)
    const id = setInterval(() => { fetchWeather(); setNow(new Date()); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [farmLat, farmLng]);

  // Display values — real if loaded, sensible fallbacks otherwise
  const wxImage = codeToImage(wxCurrent?.weather_code);
  const wxDesc  = codeToDesc(wxCurrent?.weather_code);
  const liveTemp = wxCurrent ? Math.round(wxCurrent.temperature) : temp;
  const liveRainPct = wxCurrent ? wxCurrent.rain_pct : rainPct;
  const liveWindKph = wxCurrent ? wxCurrent.wind_speed_kph : windKph;

  // Babala derived from live rain probability + current heavy-rain weather code
  const heavyCodes = [65, 82, 95, 96, 99];
  const liveFloodRisk: 'low' | 'moderate' | 'high' =
    (wxCurrent && (liveRainPct >= 70 || heavyCodes.includes(wxCurrent.weather_code))) ? 'high'
    : (wxCurrent && liveRainPct >= 40) ? 'moderate'
    : 'low';

  const hourFmt = (iso: string) => {
    const d = new Date(iso);
    let h = d.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${h}${ampm}`;
  };
  const hourlyForecast = wxHourly.length > 0
    ? wxHourly.map(h => ({ time: hourFmt(h.time), img: codeToImage(h.weather_code), temp: Math.round(h.temp) }))
    : [
        { time: '2PM', img: WX_IMAGES.partly_cloudy, temp: 32 },
        { time: '3PM', img: WX_IMAGES.partly_cloudy, temp: 31 },
        { time: '4PM', img: WX_IMAGES.light_rain,    temp: 30 },
      ];

  // Normalize log shape: store-saved logs may use snake_case from backend
  const allLogs = progressLogs.map((l: any) => ({
    id:            l.id ?? `${l.log_date ?? l.logDate ?? ''}_${l.growth_stage ?? l.growthStage ?? ''}`,
    growthStage:   l.growthStage   ?? l.growth_stage   ?? '—',
    observedIssue: l.observedIssue ?? l.observed_issue ?? null,
    notes:         l.notes         ?? '',
    logDate:       l.logDate       ?? l.log_date       ?? '',
  }));

  // "Susunod na Gawain" — next 3 upcoming guide steps based on today's offset from planting start
  type TaskCat = 'planting' | 'fertilizer' | 'pest_prevention' | 'irrigation' | 'harvesting';
  const TASK_META: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string }> = {
    planting:        { icon: 'leaf-outline',             color: '#059669', bg: '#ECFDF5' },
    fertilizer:      { icon: 'flask-outline',            color: '#D97706', bg: '#FFF7ED' },
    pest_prevention: { icon: 'shield-checkmark-outline', color: '#DC2626', bg: '#FEF2F2' },
    irrigation:      { icon: 'water-outline',            color: '#2563EB', bg: '#EFF6FF' },
    harvesting:      { icon: 'basket-outline',           color: '#B45309', bg: '#FFFBEB' },
  };
  const upcomingTasks = (() => {
    const g: any = latestGuide;
    if (!g || !Array.isArray(g.steps) || g.steps.length === 0) return [];
    const startStr = g.startDate || g.start_date;
    const start = startStr ? new Date(startStr) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0); start.setHours(0, 0, 0, 0);
    const currentDay = Math.floor((today.getTime() - start.getTime()) / 86400000);
    return g.steps
      .filter((st: any) => (st.daysAfterPlanting ?? 0) >= currentDay)
      .sort((a: any, b: any) => a.daysAfterPlanting - b.daysAfterPlanting)
      .slice(0, 3)
      .map((st: any) => ({
        id:     st.id,
        title:  st.title,
        cat:    st.category as TaskCat,
        offset: (st.daysAfterPlanting ?? 0) - currentDay,
      }));
  })();
  const taskDayLabel = (offset: number) =>
    offset <= 0 ? tr.homeToday
    : offset === 1 ? tr.homeTomorrow
    : tr.homeInDays.replace('{n}', String(offset));

  const floodColor = liveFloodRisk === 'high' ? '#EF4444' : liveFloodRisk === 'moderate' ? '#D97706' : '#111111';
  const floodBg    = liveFloodRisk === 'high' ? '#FFEBEE' : liveFloodRisk === 'moderate' ? '#FFF7ED' : '#F5F5F5';
  const floodLabel = liveFloodRisk === 'high' ? tr.floodWarning : liveFloodRisk === 'moderate' ? tr.floodCaution : tr.floodSafe;

  return (
    <SafeAreaView style={s.root}>

      {/* App bar */}
      <View style={s.appBar}>
        <TouchableOpacity
          style={s.avatar}
          onPress={() => navigation.navigate('ProfileTab')}
          activeOpacity={0.85}
        >
          <Text style={s.avatarText}>{initials}</Text>
        </TouchableOpacity>
        <View style={s.appBarMid}>
          <Text style={s.appBarGreet}>{tr.homeGreeting} {greeting}</Text>
          <Text style={s.appBarSub}>{displayName}</Text>
        </View>
        <NotificationBell color="#059669" size={22} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* â”€â”€ 1. Weather / Environmental Card â”€â”€ */}
        <View style={s.wxCard}>
          <TouchableOpacity
            onPress={() => setShowHourly(v => !v)}
            activeOpacity={0.97}
          >
          <View style={s.wxTopRow}>
            <Text style={s.wxDate}>{formatDate(now, lang)}</Text>
            <View style={s.wxTimeRow}>
              <Text style={s.wxTime}>{formatTime(now)}</Text>
            </View>
          </View>

          <View style={s.wxMidRow}>
            <Image source={wxImage} style={{ width: 52, height: 52 }} resizeMode="contain" />
            <View style={s.wxMidText}>
              {wxCurrent == null ? (
                <>
                  <Skeleton w={88} h={26} br={6} style={{ marginBottom: 4 }} />
                  <Skeleton w={120} h={14} br={4} />
                </>
              ) : (
                <>
                  <Text style={s.wxTempBig}>{liveTemp}°C</Text>
                  <Text style={s.wxDescBig}>{wxDesc}</Text>
                </>
              )}
            </View>
            <Ionicons
              name={showHourly ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#BBBBBB"
            />
          </View>
          </TouchableOpacity>

          <View style={s.wxDivider} />

          {/* Hourly forecast â€” visible only when tapped */}
          {showHourly && (
            <>
              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.wxScrollContent}
              >
                {hourlyForecast.map((h, i) => (
                  <View key={i} style={s.wxHourItem}>
                    <Text style={s.wxHourTime}>{h.time}</Text>
                    <Image source={h.img} style={{ width: 28, height: 28, marginBottom: 7 }} resizeMode="contain" />
                    <Text style={s.wxHourTemp}>{h.temp}°C</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={s.wxDivider} />
            </>
          )}

          <View style={s.wxStatsRow}>
            <View style={s.wxStatCol}>
              {wxCurrent == null
                ? <Skeleton w={40} h={14} br={4} style={{ marginBottom: 4 }} />
                : <Text style={s.wxStatValue}>{liveRainPct}%</Text>
              }
              <Text style={s.wxStatLabel}>{tr.wxRain}</Text>
            </View>
            <View style={s.wxStatSep} />
            <View style={s.wxStatCol}>
              {wxCurrent == null
                ? <Skeleton w={56} h={14} br={4} style={{ marginBottom: 4 }} />
                : <Text style={s.wxStatValue}>{liveWindKph} kph</Text>
              }
              <Text style={s.wxStatLabel}>{tr.wxWind}</Text>
            </View>
            <View style={s.wxStatSep} />
            <View style={s.wxStatCol}>
              <Text style={[s.wxStatValue, { color: floodColor }]}>{floodLabel}</Text>
              <Text style={s.wxStatLabel} numberOfLines={2}>{tr.wxFloodRisk}</Text>
            </View>
          </View>
        </View>

        {/* ── 2. Susunod na Gawain (next AI guide steps) ── */}
        {upcomingTasks.length > 0 && (
          <View style={s.section}>
            <View style={[s.card, { paddingTop: 14, paddingBottom: 4 }]}>
              <Text style={s.cardTitle}>{tr.homeUpcomingTasks}</Text>
              {upcomingTasks.map((t: { id?: string; title: string; cat: TaskCat; offset: number }, i: number) => {
                const meta = TASK_META[t.cat] || TASK_META.planting;
                return (
                  <TouchableOpacity
                    key={t.id ?? i}
                    onPress={() => {
                      useAppStore.getState().setPendingGuideCategory(t.cat);
                      navigation.navigate('PlantingTab');
                    }}
                    activeOpacity={0.75}
                    style={[s.taskRow, i < upcomingTasks.length - 1 && s.taskRowBorder]}
                  >
                    <View style={[s.taskIcon, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.taskTitle} numberOfLines={1}>{t.title}</Text>
                      <Text style={[s.taskMeta, { color: meta.color }]}>{taskDayLabel(t.offset)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 3. My Farms ── */}
        <View style={s.section}>
          <View style={[s.card, { paddingTop: 14 }]}>
            <Text style={s.cardTitle}>{tr.homeMyFarms}</Text>

            {/* Skeleton while farms list is still loading from backend */}
            {!farmsLoaded && realFarms.length === 0 && (
              <>
                {[0, 1].map(i => (
                  <View key={i} style={[s.bukidRow, i === 0 && s.bukidRowBorder]}>
                    <View style={s.bukidIcon}>
                      <Skeleton w={16} h={16} br={9999} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Skeleton w={120} h={13} br={4} style={{ marginBottom: 6 }} />
                      <Skeleton w={180} h={11} br={4} />
                    </View>
                  </View>
                ))}
              </>
            )}

            {(realFarms.length > 0 ? realFarms : []).map((f: any, i: number) => {
              const isLast = i === realFarms.length - 1;
              const location = [f.barangay, f.municipality].filter(Boolean).join(', ') || '—';
              const area = f.area_hectares != null ? `${f.area_hectares} ha` : '—';
              return (
                <TouchableOpacity
                  key={f.id ?? i}
                  style={[s.bukidRow, !isLast && s.bukidRowBorder]}
                  onPress={() => navigation.navigate('GISPinning', { farmId: f.id })}
                  activeOpacity={0.75}
                >
                  <View style={s.bukidIcon}>
                    <Ionicons name="storefront-outline" size={16} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bukidName} numberOfLines={1}>{f.name}</Text>
                    <Text style={s.bukidMeta} numberOfLines={1}>{location} · {area}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                </TouchableOpacity>
              );
            })}

            {/* Empty state — only when load completed and there are still 0 farms */}
            {farmsLoaded && realFarms.length === 0 && (
              <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                <Ionicons name="leaf-outline" size={28} color="#D1D5DB" />
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                  {tr.homeNoFarms}
                </Text>
              </View>
            )}

            {/* Add Farm action */}
            <TouchableOpacity
              style={s.bukidAddRow}
              onPress={() => navigation.navigate('FarmDetailsForm')}
              activeOpacity={0.75}
            >
              <View style={s.bukidAddIcon}>
                <Ionicons name="add" size={18} color="#059669" />
              </View>
              <Text style={s.bukidAddText}>{tr.homeAddFarm}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 4. Latest Logs ── */}
        <View style={s.section}>
          <Text style={[s.cardTitle, { paddingHorizontal: 4 }]}>{tr.homeLogsTitle}</Text>

          {allLogs.length === 0 ? (
            <View style={[s.card, { paddingVertical: 18, alignItems: 'center' }]}>
              <Ionicons name="document-text-outline" size={28} color="#D1D5DB" />
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                {tr.homeNoLogs}
              </Text>
            </View>
          ) : (
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={allLogs.length > 3 ? { maxHeight: 232 } : undefined}
            >
              {allLogs.map((log) => {
                const hasIssue = log.observedIssue && log.observedIssue !== 'None';
                return (
                  <TouchableOpacity
                    key={log.id}
                    style={s.logCard}
                    onPress={() => navigation.navigate('ProgressTab')}
                    activeOpacity={0.85}
                  >
                    <View style={[s.logAccent, { backgroundColor: hasIssue ? '#D97706' : '#6BC99B' }]} />
                    <View style={s.logBody}>
                      <Text style={s.logStage}>{log.growthStage}</Text>
                      <Text style={s.logNote} numberOfLines={2}>
                        {hasIssue ? log.observedIssue : log.notes}
                      </Text>
                    </View>
                    <Text style={s.logDate}>{log.logDate}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[s.logAddCard, { marginTop: 10 }]}
            onPress={() => navigation.navigate('ProgressTab')}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
            <Text style={s.logAddText}>{tr.homeAddLog}</Text>
          </TouchableOpacity>
        </View>

        {/* ── 5. Top Recommendation ── */}
        <View style={s.section}>
          <Text style={[s.cardTitle, { paddingHorizontal: 4 }]}>{tr.homeRecTitle}</Text>
          {latestRecommendation == null ? (
            <View style={s.card}>
              <View style={s.bukidRow}>
                <View style={s.bukidIcon}>
                  <Skeleton w={16} h={16} br={9999} />
                </View>
                <View style={{ flex: 1 }}>
                  <Skeleton w={140} h={14} br={4} style={{ marginBottom: 6 }} />
                  <Skeleton w={200} h={11} br={4} />
                </View>
                <Skeleton w={42} h={16} br={4} />
              </View>
            </View>
          ) : (() => {
            const t = String((topVariety as any)?.floodTolerance ?? '').toLowerCase();
            const tolLabel =
              t === 'high'     ? tr.tolHigh
              : t === 'moderate' ? tr.tolModerate
              : t === 'low'      ? tr.tolLow
              : '';
            const metaLine = [
              topVariety?.maturityDays ? `${topVariety.maturityDays} ${tr.homeDaysUnit}` : null,
              tolLabel || null,
            ].filter(Boolean).join(' · ');
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => navigation.navigate('RecommendationResults')}
                activeOpacity={0.75}
              >
                <View style={s.bukidRow}>
                  <View style={s.bukidIcon}>
                    <Ionicons name="leaf-outline" size={16} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bukidName} numberOfLines={1}>{topVariety?.name}</Text>
                    <Text style={s.bukidMeta} numberOfLines={1}>{metaLine}</Text>
                  </View>
                  <Text style={s.recScoreFlat}>{topScore}%</Text>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F7F9F8' },
  scroll: { paddingBottom: 16 },

  /* App bar */
  appBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  appBarMid: { flex: 1 },
  appBarGreet: { fontSize: 15, fontWeight: '700', color: '#111827' },
  appBarSub:   { fontSize: 12, color: '#9CA3AF' },
  bellBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  bellDot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: '#FFFFFF',
  },

  /* Weather card */
  wxCard: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, marginBottom: 4,
  },
  wxTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  wxDate:    { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  wxTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wxTime:    { fontSize: 12, color: '#9CA3AF' },
  wxMidRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  wxMidText: { flex: 1 },
  wxTempBig: { fontSize: 36, fontWeight: '700', color: '#111827', letterSpacing: -1 },
  wxDescBig: { fontSize: 14, color: '#6B7280' },
  wxDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginBottom: 14 },
  wxScrollContent: { paddingVertical: 4, paddingHorizontal: 2, gap: 8 },
  wxHourItem: { alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 10, paddingHorizontal: 12, minWidth: 62 },
  wxHourTime: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 7 },
  wxHourTemp: { fontSize: 13, fontWeight: '700', color: '#111827' },
  wxStatsRow: { flexDirection: 'row', alignItems: 'stretch' },
  wxStatCol:  {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    minHeight: 56, paddingHorizontal: 4,
  },
  wxStatSep:  { width: 1, backgroundColor: '#E5E7EB' },
  wxStatValue:{ fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4, textAlign: 'center' },
  wxStatLabel:{ fontSize: 10.5, color: '#9CA3AF', textAlign: 'center', lineHeight: 13 },

  /* Susunod na Gawain rows */
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  taskRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  taskIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  taskTitle: { fontSize: 13.5, fontWeight: '700', color: '#111827', marginBottom: 2 },
  taskMeta:  { fontSize: 11.5, fontWeight: '600' },

  /* Mga Bukid list rows */
  bukidRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  bukidRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  bukidIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center',
  },
  bukidName: { fontSize: 13.5, fontWeight: '700', color: '#111827', marginBottom: 2 },
  bukidMeta: { fontSize: 11.5, color: '#9CA3AF' },
  bukidAddRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6',
  },
  bukidAddIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
    justifyContent: 'center', alignItems: 'center',
  },
  bukidAddText: { fontSize: 13, fontWeight: '700', color: '#059669' },

  /* Section */
  section: { paddingHorizontal: 20, marginTop: 24 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  sectionLink: { fontSize: 13, color: '#059669', fontWeight: '700' },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16,
  },

  /* Cycle */
  cycleStatusRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ECFDF5', borderRadius: 9999,
    borderWidth: 1, borderColor: '#D1FAE5',
    paddingVertical: 4, paddingHorizontal: 10,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E' },
  livePillText: { fontSize: 12, fontWeight: '600', color: '#065F46' },
  stagePill: {
    backgroundColor: '#FFF7ED', borderRadius: 9999,
    borderWidth: 1, borderColor: '#FDE68A',
    paddingVertical: 4, paddingHorizontal: 10,
  },
  stagePillText: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  cycleFarmName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  cycleDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginBottom: 14 },
  cycleMetrics: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  metricMain: { flex: 1, alignItems: 'center' },
  metricBig: { fontSize: 40, fontWeight: '700', color: '#D97706', letterSpacing: -1 },
  metricBigLabel: { fontSize: 11, color: '#9CA3AF' },
  metricVRule: { width: 1, height: 48, backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  metricSide: { flex: 1, gap: 8 },
  metricRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  metricSideVal: { fontSize: 16, fontWeight: '700', color: '#111827' },
  metricSideLbl: { fontSize: 11, color: '#9CA3AF' },
  progressTrack: {
    height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: 5, backgroundColor: '#059669', borderRadius: 3 },

  /* Farms */
  mapArea: {
    height: 120, backgroundColor: '#A8D3CE',
    borderRadius: 10, borderWidth: 1, borderColor: '#89C4BE',
    marginBottom: 12, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  mapPin1: {
    position: 'absolute', top: '30%', left: '35%',
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
  },
  mapPin2: {
    position: 'absolute', top: '55%', left: '58%',
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#3D9D5E80',
    justifyContent: 'center', alignItems: 'center',
  },
  mapSourceText: {
    position: 'absolute', bottom: 6, left: 10,
    fontSize: 10, color: '#9CA3AF',
  },
  farmRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  farmDot: { width: 10, height: 10, borderRadius: 5 },
  farmInfo: { flex: 1 },
  farmName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  farmMeta: { fontSize: 12, color: '#9CA3AF' },
  farmDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB' },
  condBadge: {
    borderRadius: 9999, paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  condBadgeText: { fontSize: 12, fontWeight: '600' },

  /* Logs */
  logCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 14, marginBottom: 8, gap: 12,
  },
  logAccent: { width: 3, height: 36, borderRadius: 2 },
  logBody: { flex: 1 },
  logStage: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  logNote:  { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  logDate:  { fontSize: 11, color: '#D1D5DB' },
  logAddCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 48,
    backgroundColor: '#059669', borderRadius: 12,
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logAddText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.2 },

  /* Recommendation */
  recRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recRank: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ECFDF5', borderWidth: 1.5, borderColor: '#D1FAE5',
    justifyContent: 'center', alignItems: 'center',
  },
  recRankText: { fontSize: 18, fontWeight: '800', color: '#065F46' },
  recInfo: { flex: 1 },
  recName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  recTagRow: { flexDirection: 'row', gap: 6 },
  recTag: {
    backgroundColor: '#FFF7ED', borderRadius: 9999,
    borderWidth: 1, borderColor: '#FDE68A',
    paddingVertical: 3, paddingHorizontal: 8,
  },
  recTagText: { fontSize: 11, color: '#D97706', fontWeight: '600' },
  recScore: { alignItems: 'center', marginRight: 4 },
  recScoreNum: { fontSize: 18, fontWeight: '700', color: '#059669' },
  recScoreLbl: { fontSize: 10, color: '#9CA3AF' },

  recScoreFlat: { fontSize: 15, fontWeight: '700', color: '#059669' },
});
