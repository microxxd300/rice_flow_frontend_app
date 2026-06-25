import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore } from '@/store/appStore';
import { apiGuides } from '@/services/apiService';
import { useLanguageStore } from '@/store/languageStore';

type Nav = StackNavigationProp<any>;
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export const PlantingGuideHandoffScreen: React.FC<{ onEnterApp?: () => void; onGoToGuide?: () => void }> = ({ onEnterApp, onGoToGuide }) => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<any>();
  const farmData   = route.params?.farmData       ?? {};
  const variety    = route.params?.selectedVariety ?? {};
  const rec        = route.params?.recommendation  ?? {};

  const farmName     = farmData.farmName     || 'My Farm';
  const barangay     = farmData.barangay     || '—';
  const municipality = farmData.municipality || '—';
  const rsi          = rec.rsiScore          ?? 83.5;
  const varName      = variety.name          || 'NSIC Rc160';

  const setSetupProgress = useAppStore(s => s.setSetupProgress);
  useEffect(() => {
    setSetupProgress('PlantingGuideHandoff', { farmData, selectedVariety: variety, recommendation: rec });
  }, []);

  const recId          = useAppStore(s => s.latestRecommendation)?.id;
  const setLatestGuide = useAppStore(s => s.setLatestGuide);
  const language       = useLanguageStore(s => s.language);
  const [generating, setGenerating] = useState<null | 'dashboard' | 'guide'>(null);

  const generateGuide = async () => {
    if (!recId) return;
    try {
      const res = await apiGuides.generate(recId, { season: 'Wet Season', language });
      setLatestGuide(res.data);
      useAppStore.getState().addNotification({
        title: 'Your planting guide is ready',
        body:  'Personalized for your farm and season.',
        icon:  'book-outline',
      });
    } catch { /* fall back to the default guide content */ }
  };

  // Fallback when no callbacks are passed (i.e. the screen was reached from
  // inside the app via the Add-Farm flow, not via the initial-setup navigator).
  // Pop back to the root of the current stack (DashboardHome).
  const popHome = () => {
    try { navigation.popToTop(); } catch { navigation.goBack(); }
  };

  const handleGoToDashboard = async () => {
    if (generating) return;
    setGenerating('dashboard');
    await generateGuide();
    setGenerating(null);
    if (onEnterApp) onEnterApp(); else popHome();
  };

  const handleOpenGuide = async () => {
    if (generating) return;
    setGenerating('guide');
    await generateGuide();
    setGenerating(null);
    const cb = onGoToGuide ?? onEnterApp;
    if (cb) cb(); else popHome();
  };

  const FEATURES: { icon: IoniconsName; label: string }[] = [
    { icon: 'calendar-outline',         label: 'Planting Schedule' },
    { icon: 'flask-outline',            label: 'Fertilizer Plan'   },
    { icon: 'bug-outline',              label: 'Pest Prevention'   },
    { icon: 'water-outline',            label: 'Irrigation Plan'   },
    { icon: 'basket-outline',           label: 'Harvest Guide'     },
    { icon: 'checkmark-circle-outline', label: 'Milestones'        },
  ];

  return (
    <SafeAreaView style={s.root}>

      {/* Standard header — same vocabulary as the rest of the setup flow */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Planting Guide</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Variety card — flat white, score on the right with constrained width so the name truncates instead of overflowing */}
        <View style={s.varietyCard}>
          <View style={s.varietyLeft}>
            <Ionicons name="leaf" size={14} color="#059669" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.varietyLabel}>Selected variety</Text>
              <Text style={s.varietyName} numberOfLines={1} ellipsizeMode="tail">{varName}</Text>
            </View>
          </View>
          <View style={s.scoreCol}>
            <Text style={s.scoreNum} numberOfLines={1}>{rsi}%</Text>
            <Text style={s.scoreLabel}>match</Text>
          </View>
        </View>

        {/* Farm summary — single flat list, no green storefront tile, no "Handa" pill */}
        <View style={[s.card, { marginTop: 8 }]}>
          <Text style={s.cardTitle}>Prepared for</Text>
          <View style={s.farmRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.farmName} numberOfLines={1}>{farmName}</Text>
              <Text style={s.farmSub}  numberOfLines={1}>{barangay}, {municipality}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
          </View>

          {/* Stats — clean 2-column metric strip (RSI score + match %) */}
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <Text style={s.statLabel}>RSI score</Text>
              <Text style={s.statVal}>{rsi}<Text style={s.statUnit}>/100</Text></Text>
            </View>
            <View style={s.statSep} />
            <View style={s.statCell}>
              <Text style={s.statLabel}>Farm match</Text>
              <Text style={[s.statVal, { color: '#059669' }]}>{rsi}<Text style={s.statUnit}>%</Text></Text>
            </View>
          </View>
        </View>

        {/* Features — vertical list with small inline icons, hairline-separated */}
        <Text style={s.cardTitle}>Guide contents</Text>
        <View style={s.featList}>
          {FEATURES.map((feat, i) => (
            <View key={feat.label} style={[s.featRow, i < FEATURES.length - 1 && s.featRowDivider]}>
              <Ionicons name={feat.icon} size={16} color="#9CA3AF" />
              <Text style={s.featText}>{feat.label}</Text>
              <Ionicons name="checkmark" size={14} color="#059669" />
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Footer — primary "Open guide" + ghost "Dashboard", same pair as elsewhere */}
      <View style={s.footer}>
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.cancelBtn, !!generating && { opacity: 0.6 }]}
            onPress={handleGoToDashboard}
            activeOpacity={0.7}
            disabled={!!generating}
          >
            {generating === 'dashboard'
              ? <ActivityIndicator size="small" color="#374151" />
              : <Text style={s.cancelBtnText}>Go to Dashboard</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, !!generating && { opacity: 0.6 }]}
            onPress={handleOpenGuide}
            disabled={!!generating}
            activeOpacity={0.85}
          >
            {generating === 'guide'
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text style={s.saveBtnText}>View Planting Guide</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  backBtn:     { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },

  scroll: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },

  /* Variety card — flat, no shadow, single green leaf accent */
  varietyCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#059669',
    paddingVertical: 16, paddingHorizontal: 16,
    marginBottom: 22,
  },
  varietyLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  varietyLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 2 },
  varietyName:  { fontSize: 15, fontWeight: '700', color: '#111827' },

  /* Score block — wider minWidth so "100.0%" never clips, alignItems centered for visual stability */
  scoreCol: {
    alignItems: 'center',
    marginLeft: 12,
    minWidth: 84,
    flexShrink: 0,
  },
  scoreNum:   { fontSize: 18, fontWeight: '800', color: '#059669', lineHeight: 22 },
  scoreLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginTop: 1, letterSpacing: 0.3 },

  /* Card title — sentence case, same as other in-app cards */
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 12 },

  /* Farm summary card */
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, marginBottom: 4,
  },
  farmRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  farmName: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  farmSub:  { fontSize: 12, color: '#9CA3AF' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statSep:  { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: '#E5E7EB' },
  statLabel:{ fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 4 },
  statVal:  { fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  statUnit: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },

  /* Features — flat hairline-separated rows */
  featList: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  featRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  featRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  featText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },

  /* Footer — primary/ghost pair, equal width 50/50 */
  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  actions: { flexDirection: 'row', gap: 10 },
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
