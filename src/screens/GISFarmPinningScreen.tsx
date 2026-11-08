import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, TextInput as RNTextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { UrlTile, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAppStore } from '@/store/appStore';
import { apiFarms, apiScan, type EnvironmentalScan } from '@/services/apiService';
import { useTranslation } from '@/i18n/useTranslation';
import { farmPhoto } from '@/assets/illustrations';
import { useAccessibility } from '../context/AccessibilityContext';

type Nav = StackNavigationProp<any>;
type Tr = ReturnType<typeof useTranslation>;

const SCREEN_W   = Dimensions.get('window').width;
const MAP_H      = 280;
const MAP_W      = SCREEN_W - 32 - 20;   // page padding 16 x 2, card padding 10 x 2
const DEFAULT_LAT = 7.3086;     // Panabo City
const DEFAULT_LNG = 125.6830;
const DELTA       = 0.02;

function ecosystemLabel(eco: string, tr: Tr): string {
  return {
    irrigated_lowland: tr.ecoIrrigated,
    rainfed_lowland:   tr.ecoRainfed,
    upland:            tr.ecoUpland,
  }[eco] ?? '—';
}

// Coerce numeric-looking values (Django sometimes returns FloatField as a string)
const num = (v: any): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

// Language-aware labels for scan-derived fields
function floodLabel(v: string | undefined, tr: Tr) {
  const map: Record<string, string> = { high: tr.valHigh, moderate: tr.valModerate, low: tr.valLow };
  return map[(v ?? '').toLowerCase()] ?? (v || '—');
}

function soilTextureLabel(t: string | undefined, tr: Tr) {
  const v = (t ?? '').toLowerCase();
  if (!v) return '—';
  if (v.includes('clay loam') || v.includes('clay'))  return tr.soilClay;
  if (v.includes('silt'))                              return tr.soilSilt;
  if (v.includes('loam'))                              return tr.soilLoam;
  if (v.includes('sand'))                              return tr.soilSand;
  return t as string;
}

function drainageLabel(d: string | undefined, tr: Tr) {
  const v = (d ?? '').toLowerCase();
  if (!v) return '—';
  if (v.includes('poor'))     return tr.drainPoor;
  if (v.includes('moderate')) return tr.valModerate;
  if (v.includes('well') || v.includes('good')) return tr.drainGood;
  if (v.includes('excess'))   return tr.drainExcess;
  return d as string;
}

function formatScanDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export const GISFarmPinningScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tr = useTranslation();
  const { isLargeText: T } = useAccessibility();
  const route      = useRoute<any>();
  const mapRef     = useRef<MapView>(null);

  // Real farms from the store; fall back to empty list if user hasn't added one yet
  const realFarms = useAppStore(s => s.farms);
  const initialId = route.params?.farmId ?? realFarms[0]?.id ?? '';
  const [selectedId,  setSelectedId]  = useState<number | string>(initialId);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedFarm  = realFarms.find(f => f.id === selectedId);
  const filteredFarms = useMemo(() => realFarms.filter(f =>
    (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.barangay || '').toLowerCase().includes(searchQuery.toLowerCase())
  ), [realFarms, searchQuery]);

  const initLat = num(selectedFarm?.latitude)  ?? num(realFarms[0]?.latitude)  ?? DEFAULT_LAT;
  const initLng = num(selectedFarm?.longitude) ?? num(realFarms[0]?.longitude) ?? DEFAULT_LNG;

  const focusFarm = (farm: any) => {
    setSelectedId(farm.id);
    const fLat = num(farm.latitude);
    const fLng = num(farm.longitude);
    if (fLat != null && fLng != null) {
      mapRef.current?.animateToRegion({
        latitude:  fLat,
        longitude: fLng,
        latitudeDelta:  DELTA,
        longitudeDelta: DELTA,
      }, 500);
    }
  };


  // The saved barangay comes from the farm pin (server-side, official boundaries);
  // RiceFlow is for Panabo City only, so the city and province are fixed
  const dispBarangay     = selectedFarm?.barangay || '—';
  const dispMunicipality = 'Panabo City';
  const dispProvince     = 'Davao del Norte';

  // Latest environmental scan for the selected farm — drives the Kalagayan card
  const [latestScan, setLatestScan] = useState<EnvironmentalScan | null>(null);
  useEffect(() => {
    if (!selectedFarm?.id) { setLatestScan(null); return; }
    let cancelled = false;
    apiScan.history(selectedFarm.id as number)
      .then(res => {
        if (cancelled) return;
        const arr = Array.isArray(res.data) ? res.data : ((res.data as any)?.results ?? []);
        if (arr.length === 0) { setLatestScan(null); return; }
        const latest = arr.reduce((max: any, s: any) =>
          new Date(s.scanned_at) > new Date(max.scanned_at) ? s : max, arr[0]);
        setLatestScan(latest);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedFarm?.id]);

  // Inline "I-update ang Scan" — runs a fresh scan for the selected farm
  const [rescanning, setRescanning] = useState(false);
  const handleRescan = async () => {
    if (!selectedFarm?.id || rescanning) return;
    setRescanning(true);
    try {
      const res = await apiScan.run(selectedFarm.id as number);
      setLatestScan(res.data);
      useAppStore.getState().addNotification({
        title: 'Scan updated',
        body:  'Latest soil and weather data loaded.',
        icon:  'sync-outline',
      });
    } catch {
      useAppStore.getState().addNotification({
        title: 'Could not update the scan',
        body:  'Try again when you are online.',
        icon:  'alert-circle-outline',
      });
    } finally { setRescanning(false); }
  };


  // Rows of the two info cards: label on the left, value on the right
  const infoRows = (rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[]) => (
    <>
      {rows.map((row, i) => (
        <View key={row.label} style={[s.row, i > 0 && s.rowLine]}>
          <View style={s.rowIcon}><Ionicons name={row.icon} size={15} color={INK} /></View>
          <Text style={[s.rowLabel, T && { fontSize: 15 }]}>{row.label}</Text>
          <Text style={[s.rowValue, T && { fontSize: 15 }]}>{row.value}</Text>
        </View>
      ))}
    </>
  );

  const sLat = num(selectedFarm?.latitude);
  const sLng = num(selectedFarm?.longitude);

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header: round back button and a big title, like the other new-look screens */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.headerBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={INK} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, T && { fontSize: 24 }]}>{tr.gisMapTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Search only helps when there are many farms */}
        {realFarms.length > 3 && (
          <View style={s.search}>
            <Ionicons name="search" size={18} color={SOFT} />
            <RNTextInput
              style={[s.searchInput, T && { fontSize: 16 }]}
              placeholder={tr.gisSearchPh}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Map card: OpenStreetMap with a dot for each farm */}
        <View style={s.card}>
          <View style={[s.mapArea, { width: MAP_W, height: MAP_H }]}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={PROVIDER_DEFAULT}
              initialRegion={{
                latitude:       initLat,
                longitude:      initLng,
                latitudeDelta:  DELTA,
                longitudeDelta: DELTA,
              }}
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass={false}
              toolbarEnabled={false}
            >
              <UrlTile
                urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
                flipY={false}
              />
              {realFarms
                .map(farm => ({ farm, lat: num(farm.latitude), lng: num(farm.longitude) }))
                .filter(x => x.lat != null && x.lng != null)
                .map(({ farm, lat, lng }) => (
                  <Marker
                    key={farm.id}
                    coordinate={{ latitude: lat!, longitude: lng! }}
                    anchor={{ x: 0.5, y: 0.5 }}        /* center the dot exactly on the coordinate */
                    tracksViewChanges={false}
                    onPress={() => setSelectedId(farm.id)}
                  >
                    <View style={[s.farmDot, farm.id === selectedId && s.farmDotActive]} />
                  </Marker>
                ))}
            </MapView>

            {/* Go back to the picked farm */}
            {selectedFarm && (
              <TouchableOpacity
                style={s.mapBtn}
                activeOpacity={0.75}
                onPress={() => focusFarm(selectedFarm)}
                accessibilityRole="button"
                accessibilityLabel="Show my farm"
              >
                <Ionicons name="locate" size={20} color={INK} />
              </TouchableOpacity>
            )}
          </View>

          {selectedFarm && (
            <View style={s.mapFoot}>
              <Ionicons name="location-sharp" size={15} color={INK} />
              <Text style={[s.mapFootText, T && { fontSize: 15 }]} numberOfLines={1}>{dispBarangay}, {dispMunicipality}</Text>
              {selectedFarm.area_hectares != null && (
                <View style={s.pill}><Text style={s.pillText}>{selectedFarm.area_hectares} ha</Text></View>
              )}
            </View>
          )}
        </View>

        {/* Farms: the same tiles as Home; the dark one is on the map */}
        <Text style={[s.sectionTitle, T && { fontSize: 19 }]}>{tr.gisYourFarms}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.farms}>
          {filteredFarms.map(farm => {
            const isSel = farm.id === selectedId;
            return (
              <TouchableOpacity
                key={farm.id}
                style={[s.farmTile, isSel && s.farmTileSel]}
                onPress={() => focusFarm(farm)}
                activeOpacity={0.85}
              >
                {/* A rice-field photo for looks only, not this farm's own field */}
                <View style={s.farmArt}>
                  <Image source={farmPhoto(farm.id as number)} style={s.farmPhoto} resizeMode="cover" />
                </View>
                <View style={s.farmFoot}>
                  <Text style={[s.farmName, isSel && s.onDark, T && { fontSize: 16 }]} numberOfLines={1}>{farm.name}</Text>
                  <Text style={[s.farmMeta, isSel && s.onDarkSoft]} numberOfLines={1}>
                    {farm.barangay || '—'}{farm.area_hectares != null ? ` · ${farm.area_hectares} ha` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[s.farmTile, s.farmAdd]}
            onPress={() => navigation.navigateDeprecated('FarmDetailsForm')}
            activeOpacity={0.85}
          >
            <View style={s.addBadge}><Ionicons name="add" size={22} color="#FFFFFF" /></View>
            <Text style={[s.farmName, { marginTop: 10 }]}>{tr.gisAddFarm}</Text>
            {realFarms.length === 0 && <Text style={[s.farmMeta, { textAlign: 'center' }]}>{tr.gisNoFarmsYet}</Text>}
          </TouchableOpacity>
        </ScrollView>

        {/* About the picked farm */}
        {selectedFarm && (
          <View style={[s.card, s.infoCard]}>
            <Text style={[s.cardTitle, T && { fontSize: 20 }]} numberOfLines={1}>{selectedFarm.name}</Text>
            <Text style={s.cardSub} numberOfLines={1}>{dispMunicipality}, {dispProvince}</Text>
            <View style={{ height: 8 }} />
            {infoRows([
              { icon: 'location-outline',    label: tr.gisBarangay,  value: dispBarangay },
              { icon: 'expand-outline',      label: tr.gisFarmSize,  value: selectedFarm.area_hectares != null ? `${selectedFarm.area_hectares} ${tr.gisHectareUnit}` : '—' },
              { icon: 'leaf-outline',        label: tr.envSoilType,  value: ecosystemLabel(selectedFarm.ecosystem, tr) },
              { icon: 'trending-up-outline', label: tr.envElevation, value: selectedFarm.elevation_m != null ? `${Math.round(selectedFarm.elevation_m)} m` : '—' },
              { icon: 'navigate-outline',    label: tr.gisLatitude,  value: sLat != null ? `${sLat.toFixed(5)}°N` : '—' },
              { icon: 'compass-outline',     label: tr.gisLongitude, value: sLng != null ? `${sLng.toFixed(5)}°E` : '—' },
            ])}
          </View>
        )}

        {/* Soil and weather from the farm's latest scan */}
        {selectedFarm && (
          <View style={[s.card, s.infoCard]}>
            <View style={s.cardHead}>
              <View style={{ flex: 1 }}>
                <Text style={[s.cardTitle, T && { fontSize: 20 }]}>{tr.gisSoilWeather}</Text>
                <Text style={s.cardSub} numberOfLines={1}>
                  {latestScan
                    ? tr.gisLastScanned.replace('{date}', formatScanDate((latestScan as any).scanned_at))
                    : tr.gisNoScan}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRescan} disabled={rescanning} style={s.updateBtn} activeOpacity={0.75}>
                <Ionicons name={rescanning ? 'sync' : 'refresh'} size={14} color={INK} />
                <Text style={s.updateText}>{rescanning ? tr.gisUpdating : tr.gisUpdate}</Text>
              </TouchableOpacity>
            </View>

            {latestScan && (
              <>
                <View style={{ height: 8 }} />
                {infoRows([
                  { icon: 'water-outline',       label: tr.envFloodRisk,   value: floodLabel(latestScan.flood_risk, tr) },
                  { icon: 'flask-outline',       label: tr.gisSoilPh,      value: latestScan.soil_ph != null ? `${latestScan.soil_ph}` : '—' },
                  { icon: 'layers-outline',      label: tr.gisSoilTexture, value: soilTextureLabel(latestScan.soil_texture, tr) },
                  { icon: 'funnel-outline',      label: tr.gisDrainage,    value: drainageLabel(latestScan.drainage, tr) },
                  { icon: 'rainy-outline',       label: tr.gisAnnualRain,  value: (latestScan as any).annual_rainfall_mm != null ? `${Math.round((latestScan as any).annual_rainfall_mm)} mm` : '—' },
                  { icon: 'thermometer-outline', label: tr.gisAvgTemp,     value: (latestScan as any).avg_temperature != null ? `${(latestScan as any).avg_temperature}°C` : '—' },
                ])}
              </>
            )}
          </View>
        )}

        <View style={{ height: 130 }} />
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
  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  /* Header */
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  headerBtn:   { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 21, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -0.4 },

  /* Search */
  search:      { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 18, backgroundColor: '#FFFFFF', paddingHorizontal: 16, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: INK, fontFamily: 'Inter_500Medium' },

  /* Cards */
  card:     { ...card, padding: 10 },
  infoCard: { padding: 20, marginTop: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle:{ fontSize: 18, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  cardSub:  { fontSize: 13, color: SOFT, fontFamily: 'Inter_500Medium', marginTop: 2 },

  /* Map */
  mapArea:     { borderRadius: 18, overflow: 'hidden', backgroundColor: '#E8F5EF' },
  mapBtn:      {
    position: 'absolute', right: 10, bottom: 10,
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  mapFoot:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 6 },
  mapFootText: { flex: 1, fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold' },
  pill:        { backgroundColor: BG, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  pillText:    { fontSize: 12, color: INK, fontFamily: 'Inter_700Bold' },
  farmDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#6B7280',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 3, elevation: 4,
  },
  farmDotActive: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#059669', borderWidth: 3 },

  /* Farm tiles (same as Home) */
  sectionTitle: { fontSize: 17, color: INK, fontFamily: 'Inter_700Bold', marginTop: 24, marginBottom: 10, paddingHorizontal: 4 },
  farms:        { gap: 12, paddingRight: 4, paddingBottom: 6 },
  farmTile:     { ...card, width: 170, padding: 10 },
  farmTileSel:  { backgroundColor: INK },
  farmArt:      { height: 96, borderRadius: 18, overflow: 'hidden', backgroundColor: '#E8F5EF' },
  farmPhoto:    { width: '100%', height: '100%' },
  farmFoot:     { marginTop: 10, paddingHorizontal: 4, paddingBottom: 2 },
  farmName:     { fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold' },
  farmMeta:     { fontSize: 12, color: SOFT, fontFamily: 'Inter_500Medium', marginTop: 2 },
  onDark:       { color: '#FFFFFF' },
  onDarkSoft:   { color: '#9CA3AF' },
  farmAdd:      { justifyContent: 'center', alignItems: 'center', minHeight: 150 },
  addBadge:     { width: 40, height: 40, borderRadius: 20, backgroundColor: INK, justifyContent: 'center', alignItems: 'center' },

  /* Info rows */
  row:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rowLine:  { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  rowIcon:  { width: 32, height: 32, borderRadius: 16, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: 14, color: SOFT, fontFamily: 'Inter_500Medium' },
  rowValue: { fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold', flexShrink: 1, textAlign: 'right' },

  /* Update scan */
  updateBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: BG },
  updateText: { fontSize: 13, color: INK, fontFamily: 'Inter_600SemiBold' },
});
