import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { UrlTile, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAppStore } from '@/store/appStore';

type Nav = StackNavigationProp<any>;

const { height: SCREEN_H } = Dimensions.get('window');
// Map takes ~half the visible area, clamped so it never gets too tiny on small
// phones (Mini/SE) or too sparse on tall phones (Pro Max). Adaptive across sizes.
const MAP_H       = Math.max(320, Math.min(SCREEN_H * 0.5, 460));
const DEFAULT_LAT = 7.3086;
const DEFAULT_LNG = 125.6830;
const DELTA       = 0.01;

export const FarmMapTaggingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<any>();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const mapRef     = useRef<MapView>(null);

  const farmData = route.params?.farmData  ?? {};
  const initLat  = route.params?.latitude  ?? DEFAULT_LAT;
  const initLng  = route.params?.longitude ?? DEFAULT_LNG;

  const [coords,   setCoords]   = useState({ lat: initLat, lng: initLng });
  const [locating, setLocating] = useState(false);

  // Address resolved from the pinned location via reverse-geocoding (precise,
  // API-derived). The address typed at registration is only a fallback.
  const [resolved, setResolved] = useState<{ barangay?: string; municipality?: string; province?: string }>({});

  const resolveAddress = async (lat: number, lng: number) => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
        { headers: { 'User-Agent': 'rice-flow-app/1.0 (capstone)' } },
      );
      const a = (await r.json())?.address ?? {};
      setResolved({
        barangay:     a.suburb || a.village || a.neighbourhood || a.quarter || a.hamlet || undefined,
        municipality: a.city || a.town || a.municipality || a.county || undefined,
        province:     a.province || a.state || undefined,
      });
    } catch { /* geocode failed — keep the registration fallback below */ }
  };

  // Remember this step so an interrupted setup resumes here after the app reopens
  const setSetupProgress = useAppStore(s => s.setSetupProgress);
  useEffect(() => {
    setSetupProgress('FarmMapTagging', { farmData });
    resolveAddress(coords.lat, coords.lng);
  }, []);

  // Map-resolved location takes precedence; registration values are the backup
  const farmName     = farmData.farmName     || 'My Farm';
  const barangay     = resolved.barangay     || farmData.barangay     || '—';
  const municipality = resolved.municipality || farmData.municipality || '—';
  const province     = resolved.province     || farmData.province     || '—';
  const area         = farmData.area ? `${farmData.area} ha` : '—';

  const goToMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      resolveAddress(latitude, longitude);
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: DELTA, longitudeDelta: DELTA },
        600
      );
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () =>
    navigation.navigate('AnalysisLoading', {
      farmData: {
        ...farmData,
        latitude:     coords.lat,
        longitude:    coords.lng,
        barangay:     resolved.barangay     || farmData.barangay     || '',
        municipality: resolved.municipality || farmData.municipality || '',
        province:     resolved.province     || farmData.province     || '',
      },
    });

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* ── MAP ── */}
      <View style={[s.mapContainer, { height: MAP_H }]}>
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
          <Marker
            coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            draggable
            onDragEnd={e => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setCoords({ lat: latitude, lng: longitude });
              resolveAddress(latitude, longitude);
            }}
            pinColor="#059669"
          />
        </MapView>

        {/* Floating header — same minimal header shape, just floats over the map */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={20} color="#111827" />
          </TouchableOpacity>
          <View style={s.titleChip}>
            <Text style={s.titleText}>Tag your farm</Text>
            <Text style={s.titleStep}>3 / 4</Text>
          </View>
          <TouchableOpacity onPress={goToMyLocation} activeOpacity={0.7} style={s.iconBtn}>
            {locating
              ? <ActivityIndicator size="small" color="#059669" />
              : <Ionicons name="navigate" size={18} color="#059669" />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── BOTTOM PANEL ── flat card, no bottom-sheet handle/shadow */}
      <View style={[s.panel, { paddingBottom: Math.max(bottomInset, 16) + 12 }]}>

        {/* Farm name + tagged status as a plain row, no green chip */}
        <View style={s.farmRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.farmName} numberOfLines={1}>{farmName}</Text>
            <Text style={s.farmSub} numberOfLines={1}>{barangay}, {municipality}</Text>
          </View>
          <Text style={s.taggedText}>Tagged</Text>
        </View>

        {/* Info rows — plain hairline list, no green tinted icon boxes */}
        <View style={s.infoList}>
          <Row label="Location"   value={`${barangay}, ${municipality}, ${province}`} />
          <Row label="Area"       value={area} />
          <Row label="Coordinates" value={`${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E`} last />
        </View>

        {/* Actions — fixed breathing room between info and buttons (intrinsic, not flex-based) */}
        <View style={s.actions}>
          <TouchableOpacity style={s.cancelBtn} onPress={goToMyLocation} activeOpacity={0.7} disabled={locating}>
            <Text style={s.cancelBtnText}>Re-locate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={handleConfirm} activeOpacity={0.85}>
            <Text style={s.saveBtnText}>Confirm</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
};

/* ── Plain label/value row, matches Profile's data list style ── */
const Row: React.FC<{ label: string; value: string; last?: boolean }> = ({ label, value, last }) => (
  <View style={[r.row, !last && r.border]}>
    <Text style={r.label}>{label}</Text>
    <Text style={r.value} numberOfLines={2}>{value}</Text>
  </View>
);

const r = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  label:  { width: 100, fontSize: 12, color: '#6B7280' },
  value:  { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827', textAlign: 'right' },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  mapContainer: { overflow: 'hidden' },

  /* Floating top bar over the map */
  topBar: {
    position: 'absolute', top: 8, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  titleChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 10,
    paddingHorizontal: 14, height: 38,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  titleText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  titleStep: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },

  /* Panel */
  panel: {
    flex: 1, backgroundColor: '#FFFFFF',
    paddingHorizontal: 20, paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },

  farmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 10,
  },
  farmName:   { fontSize: 16, fontWeight: '700', color: '#111827' },
  farmSub:    { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  taggedText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  /* Info list */
  infoList: {
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },

  /* Actions — sit a comfortable distance below the info list, same on any screen */
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  saveBtn: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});
