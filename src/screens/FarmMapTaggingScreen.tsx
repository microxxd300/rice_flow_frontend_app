import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAppStore } from '@/store/appStore';
import { apiFarms, type PinWarningReason } from '@/services/apiService';
import { useTranslation } from '@/i18n/useTranslation';
import { goBackFromStep } from '@/utils/navigation';

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
  const tr         = useTranslation();
  const checkingRef = useRef(false);

  const farmData = route.params?.farmData  ?? {};
  const initLat  = route.params?.latitude  ?? DEFAULT_LAT;
  const initLng  = route.params?.longitude ?? DEFAULT_LNG;

  const [coords,   setCoords]   = useState({ lat: initLat, lng: initLng });
  const [locating, setLocating] = useState(false);

  // The barangay follows the pin: each time it moves the server reads it from the
  // official barangay boundaries. The farmer never picks it, and the server sets it
  // again when the farm is saved.
  const [pinBarangay, setPinBarangay] = useState<string | null>(null);
  const lookupRef = useRef(0);
  const resolveAddress = async (lat: number, lng: number) => {
    const id = ++lookupRef.current;
    try {
      const { data } = await apiFarms.checkLocation(lat, lng);
      if (id === lookupRef.current) setPinBarangay(data.barangay ?? null);
    } catch {
      if (id === lookupRef.current) setPinBarangay(null);   // weak signal: set when the farm is saved
    }
  };

  // Remember this step so an interrupted setup resumes here after the app reopens
  const setSetupProgress = useAppStore(s => s.setSetupProgress);
  useEffect(() => {
    setSetupProgress('FarmMapTagging', { farmData });
    resolveAddress(coords.lat, coords.lng);
  }, []);

  // RiceFlow is for Panabo City only, so the city and province are fixed
  const farmName     = farmData.farmName     || 'My Farm';
  const barangay     = pinBarangay || '—';
  const municipality = 'Panabo City';
  const province     = 'Davao del Norte';
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

  const goToAnalysis = (locationConfirmed: boolean) =>
    navigation.navigateDeprecated('AnalysisLoading', {
      farmData: {
        ...farmData,
        latitude:     coords.lat,
        longitude:    coords.lng,
        barangay:     pinBarangay || '',
        municipality,
        province,
        location_confirmed: locationConfirmed,
      },
    });

  const pinWarning: Record<PinWarningReason, string> = {
    on_building: tr.pinWarnOnBuilding,
    built_up:    tr.pinWarnBuiltUp,
    water:       tr.pinWarnWater,
    mangrove:    tr.pinWarnMangrove,
  };

  // Warn, don't block: ask before saving a pin that looks like a building, town,
  // or water. A failed check (weak signal) must never stop the farmer from saving.
  const handleConfirm = async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    let reason: PinWarningReason | null = null;
    let outside = false;
    try {
      const { data } = await apiFarms.checkLocation(coords.lat, coords.lng);
      if ((data as any).status === 'outside') outside = true;
      else if (data.status === 'warning') reason = data.reason;
    } catch { /* unchecked — continue */ } finally {
      checkingRef.current = false;
    }

    // Outside Panabo City can't be kept (the server refuses the farm too): only Move pin
    if (outside) {
      Alert.alert(tr.pinWarnTitle, tr.pinWarnOutside, [{ text: tr.pinMove, style: 'cancel' }]);
      return;
    }

    if (!reason) return goToAnalysis(false);
    Alert.alert(tr.pinWarnTitle, pinWarning[reason] ?? tr.pinWarnBuiltUp, [
      { text: tr.pinMove, style: 'cancel' },
      { text: tr.pinKeep, onPress: () => goToAnalysis(true) },
    ]);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* ── MAP ── */}
      <View style={[s.mapContainer, { height: MAP_H }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          // Satellite + labels so farmers can see roofs and paddies before pinning
          mapType="hybrid"
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
          // Tapping the map moves the pin too — easier than the press-and-hold drag
          onPress={e => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setCoords({ lat: latitude, lng: longitude });
            resolveAddress(latitude, longitude);
          }}
        >
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
          <TouchableOpacity onPress={() => goBackFromStep(navigation, 'FarmMapTagging')} activeOpacity={0.7} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <View style={s.titleChip}>
            <Text style={s.titleText}>Tag your farm</Text>
            {/* the same 4-part bar as the other steps */}
            <View style={s.miniBar}>
              {[0, 1, 2, 3].map(i => <View key={i} style={[s.miniSeg, i < 3 && s.miniSegDone]} />)}
            </View>
          </View>
          <TouchableOpacity onPress={goToMyLocation} activeOpacity={0.7} style={s.iconBtn}>
            {locating
              ? <ActivityIndicator size="small" color="#059669" />
              : <Ionicons name="navigate" size={18} color="#059669" />
            }
          </TouchableOpacity>
        </View>

        <View style={s.hintChip} pointerEvents="none">
          <Ionicons name="hand-left-outline" size={13} color="#FFFFFF" />
          <Text style={s.hintText}>Tap the map or drag the pin onto your field</Text>
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
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  label: { width: 100, fontSize: 13, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  value: { flex: 1, fontSize: 13, color: '#111827', textAlign: 'right', fontFamily: 'Inter_600SemiBold' },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F2F1' },

  mapContainer: { overflow: 'hidden' },

  /* Floating top bar over the map */
  topBar: {
    position: 'absolute', top: 8, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  titleChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 22, paddingHorizontal: 16, height: 44, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  titleText: { fontSize: 15, color: '#111827', fontFamily: 'Inter_700Bold' },
  miniBar:     { flexDirection: 'row', gap: 3 },
  miniSeg:     { width: 14, height: 5, borderRadius: 3, backgroundColor: '#E4E6E4' },
  miniSegDone: { backgroundColor: '#059669' },
  hintChip: { position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(17,24,39,0.85)', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14 },
  hintText: { fontSize: 13, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },

  /* Panel */
  panel: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 22, marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28 },

  farmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 10,
  },
  farmName: { fontSize: 20, color: '#111827', letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  farmSub: { fontSize: 13, color: '#6B7280', marginTop: 2, fontFamily: 'Inter_500Medium' },
  taggedText: { fontSize: 12, color: '#047857', backgroundColor: '#E8F5EF', borderRadius: 10, paddingVertical: 5, paddingHorizontal: 10, overflow: 'hidden', fontFamily: 'Inter_700Bold' },

  /* Info list */
  infoList: { backgroundColor: '#F1F2F1', borderRadius: 18, paddingHorizontal: 14, marginBottom: 16 },

  /* Actions — sit a comfortable distance below the info list, same on any screen */
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F2F1' },
  cancelBtnText: { fontSize: 15, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 1, height: 56, borderRadius: 20, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
});
