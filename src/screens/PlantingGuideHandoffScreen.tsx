import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore, guideVarietyId } from '@/store/appStore';
import { refreshCycle } from '@/services/guideLoader';
import { apiGuides } from '@/services/apiService';
import { useLanguageStore } from '@/store/languageStore';
import { goBackFromStep } from '@/utils/navigation';
import { SetupHeader } from '@/components/SetupHeader';

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
  // Neutral placeholders if the screen is restored without its params — never sample values
  const rsi          = rec.rsiScore          ?? '—';
  const varName      = variety.name          || '—';

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
    // Stored before leaving: the Planting tab requests the guide too, and must ask for this
    // variety. The server's rank can differ from the order shown, so never assume rank 1.
    if (variety.id) useAppStore.getState().setPickedVariety({ recId, varietyId: variety.id });
    try {
      const res = await apiGuides.generate(recId, { variety: guideVarietyId(), language });
      setLatestGuide(res.data);
      // The guide moved the new crop to its sowing day: reload it before Home shows it
      await refreshCycle();
      useAppStore.getState().addNotification({
        title: 'Your planting guide is ready',
        body:  'Personalized for your farm and season.',
        icon:  'book-outline',
      });
    } catch { /* fall back to the default guide content */ }
  };

  // When reached from inside the app (Add-Farm / scan flow in the RootStack),
  // no setup callbacks are passed — exit the flow to the requested tab.
  //
  // This must be a RESET, not a navigate. The flow screens below this one
  // (AnalysisLoading → SuitabilityResults) stay on the stack, and the previous
  // fallback chain — navigate → popToTop → goBack — walked the user *backwards*
  // into SuitabilityResults instead of forwards into the app. Resetting the
  // root stack to MainTabs leaves nothing behind to fall back to.
  const goToTab = (tab: 'HomeTab' | 'PlantingTab') => {
    // This screen is registered in more than one navigator, so walk up to the
    // root — only the root stack owns MainTabs.
    let nav: any = navigation;
    while (nav?.getParent?.()) nav = nav.getParent();
    nav.dispatch(
      CommonActions.reset({
        index:  0,
        routes: [{ name: 'MainTabs', params: { screen: tab } }],
      }),
    );
  };

  // Leave IMMEDIATELY and let the guide finish generating in the background.
  //
  // This used to await the Gemini call before navigating, which held the user
  // on this screen for several seconds — a long window in which a re-render
  // could remount the screen and swallow the transition. Nothing is lost by
  // leaving early: the result lands in the store, the "guide is ready"
  // notification still fires, and the Planting Guide screen generates the
  // guide itself if it arrives before the response does.
  const handleGoToDashboard = () => {
    if (generating) return;
    setGenerating('dashboard');
    void generateGuide();
    if (onEnterApp) onEnterApp();
    else goToTab('HomeTab');
  };

  const handleOpenGuide = () => {
    if (generating) return;
    setGenerating('guide');
    void generateGuide();
    if (onGoToGuide) onGoToGuide();
    else if (onEnterApp) onEnterApp();
    else goToTab('PlantingTab');
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

      <SetupHeader title="Your farm is ready" onBack={() => goBackFromStep(navigation, 'PlantingGuideHandoff')} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* The pick: variety, farm and how well they match */}
        <View style={s.card}>
          <Text style={s.label}>Selected variety</Text>
          <Text style={s.varietyName} numberOfLines={2}>{varName}</Text>
          <View style={s.matchRow}>
            <Text style={s.big}>{rsi}</Text>
            <Text style={s.bigUnit}>% farm match</Text>
          </View>
          <View style={s.farmRow}>
            <View style={s.farmTile}><Ionicons name="leaf" size={18} color="#059669" /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.farmName} numberOfLines={1}>{farmName}</Text>
              <Text style={s.farmSub} numberOfLines={1}>{barangay}, {municipality}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={22} color="#059669" />
          </View>
        </View>

        <Text style={s.question}>Where do you want to start?</Text>

        {/* Planting Guide: the one most farmers want first */}
        <TouchableOpacity
          style={[s.choice, s.choiceDark, !!generating && { opacity: 0.7 }]}
          onPress={handleOpenGuide}
          disabled={!!generating}
          activeOpacity={0.88}
        >
          <View style={s.choiceHead}>
            <View style={[s.choiceTile, { backgroundColor: '#1F2937' }]}>
              <Ionicons name="book" size={22} color="#34D399" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.choiceTitle, { color: '#FFFFFF' }]}>View Planting Guide</Text>
              <Text style={[s.choiceText, { color: '#D1D5DB' }]}>Your step-by-step plan for this season</Text>
            </View>
            {generating === 'guide'
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
          </View>
          <View style={s.featWrap}>
            {FEATURES.map(feat => (
              <View key={feat.label} style={s.feat}>
                <Ionicons name={feat.icon} size={13} color="#34D399" />
                <Text style={s.featText}>{feat.label}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Dashboard */}
        <TouchableOpacity
          style={[s.choice, !!generating && { opacity: 0.7 }]}
          onPress={handleGoToDashboard}
          disabled={!!generating}
          activeOpacity={0.88}
        >
          <View style={s.choiceHead}>
            <View style={s.choiceTile}>
              <Ionicons name="home" size={22} color="#111827" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.choiceTitle}>Go to Dashboard</Text>
              <Text style={s.choiceText}>Your crop, weather and tasks for today</Text>
            </View>
            {generating === 'dashboard'
              ? <ActivityIndicator size="small" color="#111827" />
              : <Ionicons name="arrow-forward" size={20} color="#111827" />}
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F1F2F1' },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 },

  card:        { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  label:       { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  varietyName: { fontSize: 22, color: '#111827', letterSpacing: -0.4, marginTop: 4, fontFamily: 'Inter_700Bold' },
  matchRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 10 },
  big:         { fontSize: 48, lineHeight: 54, color: '#059669', letterSpacing: -1.5, fontFamily: 'Inter_700Bold' },
  bigUnit:     { fontSize: 15, color: '#6B7280', marginBottom: 9, fontFamily: 'Inter_600SemiBold' },
  farmRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 18, backgroundColor: '#F1F2F1' },
  farmTile:    { width: 40, height: 40, borderRadius: 14, backgroundColor: '#E8F5EF', justifyContent: 'center', alignItems: 'center' },
  farmName:    { fontSize: 15, color: '#111827', fontFamily: 'Inter_700Bold' },
  farmSub:     { fontSize: 12, color: '#6B7280', marginTop: 1, fontFamily: 'Inter_500Medium' },

  question:    { fontSize: 18, color: '#111827', marginTop: 22, marginBottom: 12, paddingHorizontal: 4, fontFamily: 'Inter_700Bold' },
  choice:      { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  choiceDark:  { backgroundColor: '#111827' },
  choiceHead:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  choiceTile:  { width: 52, height: 52, borderRadius: 18, backgroundColor: '#F1F2F1', justifyContent: 'center', alignItems: 'center' },
  choiceTitle: { fontSize: 17, color: '#111827', fontFamily: 'Inter_700Bold' },
  choiceText:  { fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  featWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  feat:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1F2937', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 9 },
  featText:    { fontSize: 12, color: '#E5E7EB', fontFamily: 'Inter_600SemiBold' },
});
