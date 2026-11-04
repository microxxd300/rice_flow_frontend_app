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
import { SetupHeader } from '@/components/SetupHeader';

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

      <SetupHeader title="Allow location" step={2} onBack={() => goBackFromStep(navigation, 'LocationPermission')} />

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
              <View style={s.pointTile}><Ionicons name={p.icon} size={18} color="#059669" /></View>
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
  root: { flex: 1, backgroundColor: '#F1F2F1' },


  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  lead: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 16, paddingHorizontal: 4, fontFamily: 'Inter_500Medium' },

  points: { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2, paddingHorizontal: 16, paddingVertical: 4 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  pointRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  pointTile: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8F5EF', justifyContent: 'center', alignItems: 'center' },
  pointTitle: { fontSize: 15, color: '#111827', marginBottom: 2, fontFamily: 'Inter_700Bold' },
  pointText: { fontSize: 13, color: '#6B7280', lineHeight: 18 },

  privacyNote: { fontSize: 12, color: '#6B7280', marginTop: 16, paddingHorizontal: 6, lineHeight: 17 },

  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  saveBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 20, backgroundColor: '#111827' },
  saveBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },

  whyCard: { backgroundColor: '#E8F5EF', borderRadius: 20, padding: 16, marginTop: 12 },
  whyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  whyTitle: { fontSize: 14, color: '#065F46', fontFamily: 'Inter_700Bold' },
  whyBody: { fontSize: 13, color: '#047857', lineHeight: 19 },

  blockedCard: { backgroundColor: '#FDECEC', borderRadius: 20, padding: 16, marginBottom: 14 },
  blockedTitle: { fontSize: 14, color: '#B91C1C', fontFamily: 'Inter_700Bold' },
  blockedBody:  { fontSize: 12, color: '#7F1D1D', lineHeight: 18 },
  blockedSteps: { fontSize: 12, color: '#7F1D1D', lineHeight: 18, marginTop: 6, fontWeight: '600' },
  settingsBtn: { backgroundColor: '#374151', marginBottom: 10 },
});
