import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
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

type Nav = StackNavigationProp<any>;
type Tr = ReturnType<typeof useTranslation>;

const SCREEN_W   = Dimensions.get('window').width;
const MAP_H      = 300;
const MAP_W      = SCREEN_W - 48;
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
  const months = ['Ene','Peb','Mar','Abr','May','Hun','Hul','Ago','Set','Okt','Nob','Dis'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Auto-derive "Uri ng Lupa" (ecosystem) from the farm's measured terrain.
 * Upland  = high elevation OR steep slope
 * Lowland = flat + low-altitude (typical Davao paddy land)
 */
function deriveEcosystem(farm: any): string {
  const elev  = num(farm?.elevation_m) ?? 0;
  const slope = num(farm?.slope_pct)   ?? 0;
  if (elev > 500 || slope > 8) return 'upland';
  // Within lowland: if very flat + close to sea level, assume irrigated paddy;
  // otherwise rainfed lowland.
  if (elev <= 100 && slope <= 2) return 'irrigated_lowland';
  return 'rainfed_lowland';
}

export const GISFarmPinningScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tr = useTranslation();
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

  // Reverse-geocode the selected farm's coordinates so the displayed location is
  // the REAL address (from OpenStreetMap), not whatever was typed at registration.
  const [resolved, setResolved] = useState<{ barangay?: string; municipality?: string; province?: string }>({});
  useEffect(() => {
    const lat = num(selectedFarm?.latitude);
    const lng = num(selectedFarm?.longitude);
    if (lat == null || lng == null) { setResolved({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
          { headers: { 'User-Agent': 'rice-flow-app/1.0 (capstone)' } },
        );
        const a = (await r.json())?.address ?? {};
        if (cancelled) return;
        setResolved({
          barangay:     a.suburb || a.village || a.neighbourhood || a.quarter || a.hamlet || undefined,
          municipality: a.city   || a.town    || a.municipality  || a.county || undefined,
          province:     a.province || a.state || undefined,
        });
      } catch { /* keep stored fallback */ }
    })();
    return () => { cancelled = true; };
  }, [selectedFarm?.id, selectedFarm?.latitude, selectedFarm?.longitude]);

  // Map-resolved values take precedence; the farm's stored values are the fallback
  const dispBarangay     = resolved.barangay     || selectedFarm?.barangay     || '—';
  const dispMunicipality = resolved.municipality || '';
  const dispProvince     = resolved.province     || '';
  const dispLocation     = [dispBarangay, dispMunicipality, dispProvince].filter(Boolean).join(', ');
  const isResolved       = Boolean(resolved.barangay || resolved.municipality);
  const storedMismatch   = selectedFarm?.barangay && resolved.barangay
    && selectedFarm.barangay.toLowerCase() !== resolved.barangay.toLowerCase();

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
        title: 'Na-update ang scan',
        body:  'Pinakabagong datos ng lupa at panahon.',
        icon:  'sync-outline',
      });
    } catch {
      useAppStore.getState().addNotification({
        title: 'Hindi ma-update ang scan',
        body:  'Subukan muli kapag may koneksyon.',
        icon:  'alert-circle-outline',
      });
    } finally { setRescanning(false); }
  };

  // Auto-fix: if the stored barangay clearly doesn't match the pin's real location,
  // silently push the resolved barangay to the backend and refresh the store.
  const [fixing, setFixing] = useState(false);
  useEffect(() => {
    if (!storedMismatch || !resolved.barangay || !selectedFarm?.id || fixing) return;
    let cancelled = false;
    setFixing(true);
    (async () => {
      try {
        await apiFarms.update(selectedFarm.id, { barangay: resolved.barangay });
        if (cancelled) return;
        const res = await apiFarms.list();
        useAppStore.getState().setFarms(res.data);
        useAppStore.getState().addNotification({
          title: 'Na-update ang lokasyon',
          body:  `Tinama ang barangay sa: ${resolved.barangay}`,
          icon:  'checkmark-circle-outline',
        });
      } catch { /* keep banner; user can retry by re-selecting */ }
      finally { if (!cancelled) setFixing(false); }
    })();
    return () => { cancelled = true; };
  }, [storedMismatch, resolved.barangay, selectedFarm?.id]);

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#111111" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{tr.gisMapTitle}</Text>
          <Text style={s.headerSub}>{tr.gisHeaderSub}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Search */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color="#BBBBBB" />
            <RNTextInput
              style={s.searchInput}
              placeholder={tr.gisSearchPh}
              placeholderTextColor="#BBBBBB"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#BBBBBB" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={s.locateBtn} activeOpacity={0.75}>
            <Ionicons name="navigate" size={18} color="#059669" />
          </TouchableOpacity>
        </View>

        {/* Map card — real OpenStreetMap with farm markers */}
        <View style={s.mapCard}>
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
                    <View style={[
                      s.farmDot,
                      farm.id === selectedId && s.farmDotActive,
                    ]} />
                  </Marker>
                ))}
            </MapView>

            {/* Center-on-selected button overlay */}
            <TouchableOpacity
              style={s.gpsCircle}
              activeOpacity={0.75}
              onPress={() => selectedFarm && focusFarm(selectedFarm)}
            >
              <Ionicons name="locate-outline" size={18} color="#333333" />
            </TouchableOpacity>

            {/* Coordinate bar */}
            {(() => {
              const sLat = num(selectedFarm?.latitude);
              const sLng = num(selectedFarm?.longitude);
              if (sLat == null || sLng == null) return null;
              return (
                <View style={s.coordBar}>
                  <Text style={s.coordText}>
                    {sLat.toFixed(4)}°N, {sLng.toFixed(4)}°E
                  </Text>
                </View>
              );
            })()}
          </View>

          {/* Map footer — real location from reverse-geocoding */}
          {selectedFarm && (
            <View style={s.mapFooter}>
              <Ionicons name="location" size={14} color="#059669" />
              <Text style={s.mapFooterText} numberOfLines={1}>
                {dispLocation || '—'}
              </Text>
              {selectedFarm.area_hectares != null && (
                <View style={s.mapFooterChip}>
                  <Text style={s.mapFooterChipText}>{selectedFarm.area_hectares} ha</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Farm list */}
        <Text style={s.listHeading}>{tr.gisYourFarms}</Text>

        {realFarms.length === 0 && (
          <TouchableOpacity
            style={[s.farmCard, { justifyContent: 'center' }]}
            onPress={() => navigation.navigate('FarmDetailsForm')}
            activeOpacity={0.8}
          >
            <View style={s.farmIconBox}>
              <Ionicons name="add" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.farmName}>{tr.gisAddFarm}</Text>
              <Text style={s.farmMeta}>{tr.gisNoFarmsYet}</Text>
            </View>
          </TouchableOpacity>
        )}

        {filteredFarms.map(farm => {
          const isSelected = farm.id === selectedId;
          const derivedEco = deriveEcosystem(farm);
          const ecoLabel   = ecosystemLabel(derivedEco, tr);
          const badge      = derivedEco === 'upland' ? 'Highland' : 'Lowland';
          return (
            <TouchableOpacity
              key={farm.id}
              style={[s.farmCard, isSelected && s.farmCardActive]}
              onPress={() => focusFarm(farm)}
              activeOpacity={0.75}
            >
              <View style={[s.farmIconBox, isSelected && s.farmIconBoxActive]}>
                <Ionicons name="leaf" size={16} color={isSelected ? '#FFFFFF' : '#059669'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.farmName, isSelected && s.farmNameActive]} numberOfLines={1}>{farm.name}</Text>
                <Text style={s.farmMeta} numberOfLines={1}>
                  {farm.barangay || '—'}{farm.area_hectares != null ? ` · ${farm.area_hectares} ha` : ''}
                </Text>
                {(() => {
                  const fLat = num(farm.latitude);
                  const fLng = num(farm.longitude);
                  if (fLat == null || fLng == null) return null;
                  return (
                    <View style={s.farmCoordRow}>
                      <Ionicons name="location-outline" size={11} color="#BBBBBB" />
                      <Text style={s.farmCoord}>{fLat.toFixed(4)}°N, {fLng.toFixed(4)}°E</Text>
                    </View>
                  );
                })()}
              </View>
              <View style={[s.farmTypeBadge, isSelected && s.farmTypeBadgeActive]}>
                <Text style={[s.farmTypeBadgeText, isSelected && s.farmTypeBadgeTextActive]}>
                  {badge}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Add Farm CTA (always available) */}
        {realFarms.length > 0 && (
          <TouchableOpacity
            style={s.addFarmRow}
            onPress={() => navigation.navigate('FarmDetailsForm')}
            activeOpacity={0.75}
          >
            <View style={s.addFarmIcon}>
              <Ionicons name="add" size={18} color="#059669" />
            </View>
            <Text style={s.addFarmText}>{tr.gisAddFarm}</Text>
          </TouchableOpacity>
        )}

        {/* Spatial data card */}
        {selectedFarm && (
          <>
            <View style={[s.dataCard, { marginTop: 20 }]}>
              <View style={s.dataCardHeader}>
                <View style={s.dataIconBox}>
                  <Ionicons name="globe-outline" size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dataCardTitle}>{selectedFarm.name}</Text>
                  <Text style={s.dataCardSub}>{ecosystemLabel(selectedFarm.ecosystem, tr)}</Text>
                </View>
              </View>

              {/* Auto-fix hint — shows briefly while we update, then disappears */}
              {storedMismatch && (
                <View style={s.locHint}>
                  <Ionicons name={fixing ? 'sync' : 'information-circle'} size={14} color="#D97706" />
                  <Text style={s.locHintText} numberOfLines={2}>
                    {fixing
                      ? `Inaayos ang barangay base sa lokasyon ng pin…`
                      : `Iba ang nakatalang barangay (${selectedFarm.barangay}). Ina-update sa: ${resolved.barangay}.`}
                  </Text>
                </View>
              )}

              {[
                { icon: 'location-outline'    as const, label: tr.gisBarangay,  value: dispBarangay },
                { icon: 'business-outline'    as const, label: tr.gisCity,      value: dispMunicipality || '—' },
                { icon: 'map-outline'         as const, label: tr.gisProvince,  value: dispProvince     || '—' },
                { icon: 'expand-outline'      as const, label: tr.gisFarmSize,  value: selectedFarm.area_hectares != null ? `${selectedFarm.area_hectares} ${tr.gisHectareUnit}` : '—' },
                { icon: 'navigate-outline'    as const, label: tr.gisLatitude,  value: (() => { const v = num(selectedFarm.latitude);  return v != null ? `${v.toFixed(5)}°N` : '—'; })() },
                { icon: 'compass-outline'     as const, label: tr.gisLongitude, value: (() => { const v = num(selectedFarm.longitude); return v != null ? `${v.toFixed(5)}°E` : '—'; })() },
                { icon: 'leaf-outline'        as const, label: tr.envSoilType,  value: ecosystemLabel(deriveEcosystem(selectedFarm), tr) },
                { icon: 'trending-up-outline' as const, label: tr.envElevation, value: selectedFarm.elevation_m != null ? `${Math.round(selectedFarm.elevation_m)} m` : '—' },
              ].map((row, i, arr) => (
                <View key={row.label} style={[s.dataRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={s.dataRowIcon}>
                    <Ionicons name={row.icon} size={14} color="#888888" />
                  </View>
                  <Text style={s.dataLabel}>{row.label}</Text>
                  <Text style={s.dataValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Kalagayan ng Lupa at Panahon — pulled from the latest scan */}
        {selectedFarm && (
          <>
            <View style={[s.dataCard, { marginTop: 20 }]}>
              <View style={s.dataCardHeader}>
                <View style={s.dataIconBox}>
                  <Ionicons name="thermometer-outline" size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dataCardTitle}>{tr.gisSoilWeather}</Text>
                  <Text style={s.dataCardSub} numberOfLines={1}>
                    {latestScan
                      ? tr.gisLastScanned.replace('{date}', formatScanDate((latestScan as any).scanned_at))
                      : tr.gisNoScan}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleRescan}
                  disabled={rescanning}
                  style={s.rescanBtn}
                  activeOpacity={0.75}
                >
                  <Ionicons name={rescanning ? 'sync' : 'refresh-outline'} size={12} color="#059669" />
                  <Text style={s.rescanBtnText}>{rescanning ? tr.gisUpdating : tr.gisUpdate}</Text>
                </TouchableOpacity>
              </View>

              {latestScan && [
                { icon: 'water-outline'        as const, label: tr.envFloodRisk,   value: floodLabel(latestScan.flood_risk, tr) },
                { icon: 'flask-outline'        as const, label: tr.gisSoilPh,      value: latestScan.soil_ph != null ? `${latestScan.soil_ph}` : '—' },
                { icon: 'layers-outline'       as const, label: tr.gisSoilTexture, value: soilTextureLabel(latestScan.soil_texture, tr) },
                { icon: 'funnel-outline'       as const, label: tr.gisDrainage,    value: drainageLabel(latestScan.drainage, tr) },
                { icon: 'rainy-outline'        as const, label: tr.gisAnnualRain,  value: (latestScan as any).annual_rainfall_mm != null ? `${Math.round((latestScan as any).annual_rainfall_mm)} mm` : '—' },
                { icon: 'thermometer-outline'  as const, label: tr.gisAvgTemp,     value: (latestScan as any).avg_temperature != null ? `${(latestScan as any).avg_temperature}°C` : '—' },
              ].map((row, i, arr) => (
                <View key={row.label} style={[s.dataRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={s.dataRowIcon}>
                    <Ionicons name={row.icon} size={14} color="#888888" />
                  </View>
                  <Text style={s.dataLabel}>{row.label}</Text>
                  <Text style={s.dataValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F7F9F8' },
  scroll: { padding: 24, paddingBottom: 110 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: '#6B7280', marginTop: 1 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#059669', borderRadius: 9999,
    paddingVertical: 7, paddingHorizontal: 12,
  },
  scanBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 48, borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#FFFFFF',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  locateBtn: {
    width: 48, height: 48, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },

  mapCard: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  mapArea: { overflow: 'hidden' },

  terrain: { position: 'absolute', backgroundColor: '#BDE2DC' },
  water:   { position: 'absolute', backgroundColor: '#4A8CBD' },
  road:    { position: 'absolute', height: 5, backgroundColor: '#FFFFFF', borderRadius: 3 },
  roadThin:{ position: 'absolute', height: 3, backgroundColor: '#FFFFFF', borderRadius: 2 },

  pin: { position: 'absolute', alignItems: 'center' },
  pinHead: {
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
  },
  pinDot:  { backgroundColor: '#FFFFFF' },
  pinTail: {
    width: 0, height: 0,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -1,
  },

  ringMarker: {
    position: 'absolute',
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2.5, borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  zoomStack:  { position: 'absolute', right: 10, top: 12 },
  zoomCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },

  gpsCircle: {
    position: 'absolute', right: 10, bottom: 40,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },

  coordBar: {
    position: 'absolute', bottom: 8, left: 10,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 6,
    paddingVertical: 3, paddingHorizontal: 8,
  },
  coordText: { fontSize: 10, color: '#555555', fontWeight: '500' },
  coordZoom: { fontSize: 10, color: '#6B7280', fontWeight: '600' },

  mapFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  mapFooterText: { flex: 1, fontSize: 12, color: '#6B7280' },
  mapFooterChip: {
    backgroundColor: '#ECFDF5', borderRadius: 9999,
    paddingVertical: 3, paddingHorizontal: 8,
    borderWidth: 1, borderColor: '#D1FAE5',
  },
  mapFooterChipText: { fontSize: 11, fontWeight: '700', color: '#065F46' },

  listHeading: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10, marginTop: 4 },

  farmCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  farmCardActive: { borderColor: '#059669', backgroundColor: '#FFFFFF' },
  farmIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  farmIconBoxActive: { backgroundColor: '#059669', borderColor: '#059669' },
  farmName:         { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  farmNameActive:   { color: '#111827' },
  farmMeta:         { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  farmCoordRow:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  farmCoord:        { fontSize: 11, color: '#9CA3AF' },
  farmTypeBadge: {
    backgroundColor: '#F9FAFB', borderRadius: 9999,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingVertical: 3, paddingHorizontal: 9,
  },
  farmTypeBadgeActive:     { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' },
  farmTypeBadgeText:       { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  farmTypeBadgeTextActive: { color: '#065F46' },

  /* Add Farm row */
  addFarmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#A7F3D0',
    paddingVertical: 14, paddingHorizontal: 14,
    marginBottom: 10,
  },
  addFarmIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
    justifyContent: 'center', alignItems: 'center',
  },
  addFarmText: { fontSize: 13.5, fontWeight: '700', color: '#059669' },

  /* Green dot markers on the map */
  farmDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#3D9D5E',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 3, elevation: 4,
  },
  farmDotActive: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#059669',
    borderWidth: 3,
  },

  /* Scan CTA — clean white card */
  scanCta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 14,
    marginTop: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  scanCtaIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
  },
  scanCtaTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  scanCtaSub:   { fontSize: 12, color: '#9CA3AF' },

  /* Location mismatch hint */
  locHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 10,
    borderWidth: 1, borderColor: '#FDE68A',
    paddingHorizontal: 10, paddingVertical: 8,
    marginBottom: 10,
  },
  locHintText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 16 },

  /* I-update scan button (inline) */
  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999,
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
  },
  rescanBtnText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  scanDateLine:  { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 6 },

  dataCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16,
  },
  dataCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  dataIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },
  dataCardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dataCardSub:   { fontSize: 12, color: '#6B7280', marginTop: 1 },
  dataRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  dataRowIcon: { width: 24, alignItems: 'center' },
  dataLabel:   { flex: 1, fontSize: 13, color: '#6B7280' },
  dataValue:   { fontSize: 13, fontWeight: '600', color: '#111827' },

  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#059669', borderRadius: 12, padding: 16, marginBottom: 8,
  },
  ctaTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  ctaSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
});
