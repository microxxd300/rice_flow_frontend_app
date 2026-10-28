import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, AppState, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { useAppStore } from '@/store/appStore';
import { goBackFromStep } from '@/utils/navigation';

type Nav = StackNavigationProp<any>;
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const POINTS: { icon: IoniconsName; title: string; text: string }[] = [
  { icon: 'navigate-outline', title: 'Pin your farm',     text: 'Place the exact location on the map'             },
  { icon: 'rainy-outline',    title: 'Weather + soil',     text: 'Rainfall, elevation, and flood risk for your land' },
  { icon: 'leaf-outline',     title: 'Better recommendations', text: 'Rice varieties matched to your local conditions' },
];

export const LocationPermissionScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<any>();
  const farmData   = route.params?.farmData ?? {};

  // Remember this step so an interrupted setup resumes here after the app reopens
  const setSetupProgress = useAppStore(s => s.setSetupProgress);
  useEffect(() => { setSetupProgress('LocationPermission', { farmData }); }, []);

  const [locating, setLocating] = useState(false);
  // Location was refused. Setup can't continue without it, so the screen offers Settings
  // (iOS asks only once, and Android stops asking after a second refusal).
  const [blocked, setBlocked] = useState(false);
  const busy = useRef(false);

  const handleAllow = async () => {
    if (busy.current) return;
    busy.current = true;
    setLocating(true);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted' && perm.canAskAgain) {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (perm.status !== 'granted') {
        // The phone no longer shows the prompt, so "Try again" can only point to Settings
        if (blocked && !perm.canAskAgain) {
          Alert.alert(
            'Location is turned off',
            'Your phone won\'t ask again. Turn on Location for RiceFlow in Settings.',
            [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
          );
        }
        setBlocked(true);
        return;
      }
      setBlocked(false);
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      navigation.navigateDeprecated('FarmMapTagging', {
        farmData,
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      Alert.alert(
        'Could not get your location',
        'Please try again. Location is required to set up your farm.',
        [{ text: 'OK' }]
      );
    } finally {
      busy.current = false;
      setLocating(false);
    }
  };

  // Coming back from the phone's Settings: check again and continue if location is now on
  useEffect(() => {
    if (!blocked) return;
    const sub = AppState.addEventListener('change', async state => {
      if (state !== 'active') return;
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status === 'granted') handleAllow();
    });
    return () => sub.remove();
  }, [blocked]);

  return (
    <SafeAreaView style={s.root}>

      {/* Header — same shape as the other setup steps */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => goBackFromStep(navigation, 'LocationPermission')} activeOpacity={0.7} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Allow location</Text>
        <Text style={s.stepText}>2 / 4</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {blocked && (
          <View style={s.blockedCard}>
            <View style={s.whyHeader}>
              <Ionicons name="location" size={16} color="#B91C1C" />
              <Text style={s.blockedTitle}>Location is required</Text>
            </View>
            <Text style={s.blockedBody}>
              RiceFlow needs your farm's location to get its soil, rainfall, and elevation data.
              You can't continue without it.
            </Text>
            <Text style={s.blockedSteps}>
              Tap Open Settings, turn on Location for this app, then come back here.
            </Text>
          </View>
        )}

        <Text style={s.lead}>
          We use your location to put your farm on the map and tailor recommendations to your area.
        </Text>

        {/* Why-we-need-this list — flat hairline rows, no decorative timeline */}
        <View style={s.points}>
          {POINTS.map((p, i) => (
            <View key={i} style={[s.pointRow, i < POINTS.length - 1 && s.pointRowDivider]}>
              <Ionicons name={p.icon} size={18} color="#9CA3AF" />
              <View style={{ flex: 1 }}>
                <Text style={s.pointTitle}>{p.title}</Text>
                <Text style={s.pointText}>{p.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Why this is required */}
        <View style={s.whyCard}>
          <View style={s.whyHeader}>
            <Ionicons name="shield-checkmark" size={16} color="#059669" />
            <Text style={s.whyTitle}>Why location is required</Text>
          </View>
          <Text style={s.whyBody}>
            RiceFlow uses your farm coordinates to fetch soil, rainfall, and elevation data
            from satellite sources. Without your location, the app can't recommend the rice
            varieties best suited for your land.
          </Text>
        </View>

        <Text style={s.privacyNote}>
          Your farm location is used only for RiceFlow recommendations. Only you and RiceFlow's
          agriculturists can see it.
        </Text>

      </ScrollView>

      {/* Footer — no skip: without location, setup stops here */}
      <View style={s.footer}>
        {blocked && (
          <TouchableOpacity
            style={[s.saveBtnFull, s.settingsBtn]}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.85}
          >
            <Ionicons name="settings-outline" size={16} color="#FFFFFF" />
            <Text style={s.saveBtnText}>Open Settings</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.saveBtnFull, locating && { opacity: 0.6 }]}
          onPress={handleAllow}
          disabled={locating}
          activeOpacity={0.85}
        >
          <Ionicons name={locating ? 'hourglass-outline' : 'navigate'} size={16} color="#FFFFFF" />
          <Text style={s.saveBtnText}>
            {locating ? 'Locating...' : blocked ? 'Try again' : 'Allow location access'}
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  backBtn:     { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  stepText:    { width: 32, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#9CA3AF' },

  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  lead:   { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 24 },

  points: { backgroundColor: '#FFFFFF' },
  pointRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16,
  },
  pointRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  pointTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  pointText:  { fontSize: 12, color: '#6B7280', lineHeight: 17 },

  privacyNote: {
    fontSize: 11, color: '#9CA3AF',
    marginTop: 20, paddingHorizontal: 4,
  },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  saveBtnFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 12,
    backgroundColor: '#059669',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  whyCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1, borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
  },
  whyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  whyTitle:  { fontSize: 13, fontWeight: '700', color: '#065F46' },
  whyBody:   { fontSize: 12, color: '#047857', lineHeight: 18 },

  blockedCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  blockedTitle: { fontSize: 13, fontWeight: '700', color: '#B91C1C' },
  blockedBody:  { fontSize: 12, color: '#7F1D1D', lineHeight: 18 },
  blockedSteps: { fontSize: 12, color: '#7F1D1D', lineHeight: 18, marginTop: 6, fontWeight: '600' },
  settingsBtn:  { backgroundColor: '#374151', shadowColor: '#374151', marginBottom: 10 },
});
