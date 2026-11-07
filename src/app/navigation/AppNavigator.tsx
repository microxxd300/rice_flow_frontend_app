import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import { useKeyboardOpen } from '@/hooks/useKeyboardOpen';
import { useGuideReminders, useReminderTap } from '@/hooks/useGuideReminders';
import { useFarmerNotices } from '@/hooks/useFarmerNotices';
import { useFarmForecast, useStepWeatherAlert } from '@/hooks/useFarmForecast';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { fetchActiveCycleLogs } from '@/utils/progressLogs';
import { useAppStore } from '@/store/appStore';
import { NEW_LOG } from '@/utils/logRequests';
import {
  HomeDashboardScreen,
  GISFarmPinningScreen,
  EnvironmentalScannerScreen,
  RecommendationResultsScreen,
  VarietyDetailScreen,
  PlantingGuideScreen,
  ProgressDashboardScreen,
  ProgressLogScreen,
  YieldRecordScreen,
  YieldProgressScreen,
  ProfileScreen,
  ReportsScreen,
  AIChatScreen,
  FarmDetailsFormScreen,
  LocationPermissionScreen,
  FarmMapTaggingScreen,
  AnalysisLoadingScreen,
  SuitabilityResultsScreen,
  PlantingGuideHandoffScreen,
  ProblemPickerScreen,
  ProblemCardScreen,
  ProblemSaveScreen,
} from '@/screens';

const Stack     = createStackNavigator();
const Tab       = createBottomTabNavigator();
const RootStack = createStackNavigator();

/* ── Stacks ────────────────────────────────────────── */

const HomeStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardHome"        component={HomeDashboardScreen} />
    <Stack.Screen name="GISPinning"           component={GISFarmPinningScreen} />
    <Stack.Screen name="EnvironmentalScanner" component={EnvironmentalScannerScreen} />
    <Stack.Screen name="RecommendationResults" component={RecommendationResultsScreen} />
    <Stack.Screen name="VarietyDetail"        component={VarietyDetailScreen} />
  </Stack.Navigator>
);

const PlantingStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PlantingGuideHome" component={PlantingGuideScreen} />
  </Stack.Navigator>
);

const AIStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AIChat" component={AIChatScreen} />
  </Stack.Navigator>
);

const ProgressStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProgressDashboardHome" component={ProgressDashboardScreen} />
    <Stack.Screen name="ProgressLog"           component={ProgressLogScreen} />
    <Stack.Screen name="YieldRecord"           component={YieldRecordScreen} />
    <Stack.Screen name="YieldProgress"         component={YieldProgressScreen} />
    <Stack.Screen name="ReportsHome"           component={ReportsScreen} />
  </Stack.Navigator>
);

const ProfileStack: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileHome" component={ProfileScreen} />
  </Stack.Navigator>
);

/* ── Icon + label maps ─────────────────────────────── */

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName; label: string }> = {
  HomeTab:     { active: 'home',        inactive: 'home-outline',        label: 'navHome' },
  ProgressTab: { active: 'trending-up', inactive: 'trending-up-outline', label: 'navProgress' },
  PlantingTab: { active: 'book',        inactive: 'book-outline',        label: 'navGuide' },
  ProfileTab:  { active: 'person',      inactive: 'person-outline',      label: 'navProfile' },
};
// The round button beside the bar opens a menu of things to do (the chat is one of them)
const AI_TAB = 'AITab';

// The menu, top to bottom: the most used sits lowest, nearest the thumb
const MENU = [
  { key: 'harvest', icon: 'basket-outline',        title: 'menuHarvest',      sub: '' },
  { key: 'log',     icon: 'create-outline',        title: 'menuLog',          sub: '' },
  { key: 'ai',      icon: 'sparkles',              title: 'helpAskTitle',     sub: 'menuAskSub' },
  { key: 'problem', icon: 'medkit-outline',        title: 'helpProblemTitle', sub: 'menuProblemSub' },
] as const;


/* ── Custom floating pill tab bar ──────────────────── */

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const tr = useTranslation();
  const keyboardOpen = useKeyboardOpen();
  const [menuOpen, setMenuOpen] = useState(false);
  if (keyboardOpen) return null;   // otherwise it can cover the field being typed in

  const go = (route: (typeof state.routes)[number], isFocused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigateDeprecated(route.name);
  };
  const focused = state.routes[state.index]?.name;
  const ai = state.routes.find(r => r.name === AI_TAB);
  const bottom = Math.max(insets.bottom, 8) + 10;

  const pick = (key: (typeof MENU)[number]['key']) => {
    setMenuOpen(false);
    if (key === 'problem') navigation.navigate('ProblemPicker' as never);
    else if (key === 'ai' && ai) go(ai, focused === AI_TAB);
    else if (key === 'harvest') navigation.navigateDeprecated('ProgressTab', { screen: 'YieldRecord' });
    else if (key === 'log') {
      // Progress opens its add-log form, where the farmer picks what to log
      useAppStore.getState().setPendingLogStep(NEW_LOG);
      navigation.navigateDeprecated('ProgressTab', { screen: 'ProgressDashboardHome' });
    }
  };

  return (
    <>
    {/* The menu in its own full-screen layer: on Android, taps on views drawn outside
        the tab bar's area do not always arrive. Its own close button sits where the
        menu button is. */}
    <Modal visible={menuOpen} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent
      onRequestClose={() => setMenuOpen(false)}>
      <Pressable style={tb.backdrop} onPress={() => setMenuOpen(false)} accessibilityLabel={tr.probClose} />
      <View style={[tb.menu, { bottom: bottom + 84 }]}>
        {MENU.map((item, i) => (
          <TouchableOpacity key={item.key} style={[tb.menuRow, i > 0 && tb.menuBorder]} activeOpacity={0.7}
            onPress={() => pick(item.key)} accessibilityRole="button">
            <View style={[tb.menuIcon, item.key === 'problem' && tb.menuIconProblem]}>
              <Ionicons name={item.icon as any} size={20}
                color={item.key === 'problem' ? '#FFFFFF' : LOOK.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={tb.menuTitle}>{(tr as any)[item.title]}</Text>
              {!!item.sub && <Text style={tb.menuSub} numberOfLines={1}>{(tr as any)[item.sub]}</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={[tb.ai, tb.aiOn, tb.menuClose, { bottom }]} onPress={() => setMenuOpen(false)}
        activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={tr.probClose}>
        <Ionicons name="close" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </Modal>
    <View style={[tb.wrapper, { bottom }]} pointerEvents="box-none">
      {/* Home, Progress, Guide, Profile: icon over a word; the open one sits in a gray pill */}
      <View style={tb.pill}>
        {state.routes.filter(r => r.name !== AI_TAB).map(route => {
          const isFocused = focused === route.name;
          const icons = ICONS[route.name];
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => go(route, isFocused)}
              style={[tb.tab, isFocused && tb.tabOn]}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
            >
              <Ionicons
                name={isFocused ? icons.active : icons.inactive}
                size={22}
                color={isFocused ? LOOK.green : LOOK.ink}
              />
              <Text style={[tb.label, isFocused && tb.labelOn]} numberOfLines={1}>
                {(tr as any)[icons.label]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* The menu button: three lines, a cross while the menu is open */}
      {ai && (
        <TouchableOpacity
          onPress={() => setMenuOpen(o => !o)}
          style={[tb.ai, (menuOpen || focused === AI_TAB) && tb.aiOn]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={tr.menuOpen}
          accessibilityState={{ expanded: menuOpen }}
        >
          <Ionicons name={menuOpen ? 'close' : 'menu'} size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
    </>
  );
};

/* ── Main tabs (the 5-tab floating bar) ────────────── */
// Registered via `component` (not a render function) so nested tab navigation
// works — e.g. navigate('MainTabs', { screen: 'PlantingTab' }) from a pushed
// flow screen. The starting tab comes from route params (set by initialParams).

const MainTabs: React.FC<{ route?: any; navigation?: any }> = ({ route, navigation }) => {
  // Mounted whenever the farmer is in the app: keeps the 7 AM guide reminders up to
  // date, and a tapped reminder opens the Planting tab
  useGuideReminders();
  useReminderTap(useCallback(() => navigation?.navigate('MainTabs', { screen: 'PlantingTab' }), [navigation]));
  // The admin's notices (a removed farm or cycle, an updated variety) go into the bell
  useFarmerNotices();
  // One forecast for the whole app, kept fresh; a step the weather rules out goes into the bell
  useFarmForecast();
  useStepWeatherAlert();
  // Load the Progress tab's data while the farmer is on Home, so its first visit
  // opens with data instead of skeletons
  const farmId = useSelectedFarm()?.id;
  useEffect(() => {
    if (farmId != null) fetchActiveCycleLogs(farmId).catch(() => {});
  }, [farmId]);
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName={route?.params?.initialTab ?? 'HomeTab'}
    >
      <Tab.Screen name="HomeTab"     component={HomeStack} />
      <Tab.Screen name="ProgressTab" component={ProgressStack} />
      <Tab.Screen name="AITab"       component={AIStack} />
      <Tab.Screen name="PlantingTab" component={PlantingStack} />
      <Tab.Screen name="ProfileTab"  component={ProfileStack} />
    </Tab.Navigator>
  );
};

/* ── App Navigator ─────────────────────────────────── */
// Wraps MainTabs in an outer stack so full-screen flows (like Add Farm) can be
// pushed ABOVE the tab bar — otherwise the floating tab bar would render on top
// of and block every screen in that flow, since it persists across all screens
// nested inside a tab's own stack.

export const AppNavigator: React.FC<{ initialTab?: string }> = ({ initialTab }) => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen
      name="MainTabs"
      component={MainTabs}
      initialParams={{ initialTab }}
    />

    {/* Add-farm flow — reuses the same screens as the initial setup. Pushed
        above the tabs so the floating tab bar is hidden during the flow.
        After it ends (PlantingGuideHandoff), it navigates back to the correct
        MainTabs tab (Home or Planting). */}
    <RootStack.Screen name="FarmDetailsForm"      component={FarmDetailsFormScreen} />
    <RootStack.Screen name="LocationPermission"   component={LocationPermissionScreen} />
    <RootStack.Screen name="FarmMapTagging"       component={FarmMapTaggingScreen} />
    <RootStack.Screen name="AnalysisLoading"      component={AnalysisLoadingScreen} />
    <RootStack.Screen name="SuitabilityResults"   component={SuitabilityResultsScreen} />
    <RootStack.Screen name="PlantingGuideHandoff" component={PlantingGuideHandoffScreen} />

    {/* A problem in the field: what you see, the booklet advice, then saving it */}
    <RootStack.Screen name="ProblemPicker" component={ProblemPickerScreen} />
    <RootStack.Screen name="ProblemCard"   component={ProblemCardScreen} />
    <RootStack.Screen name="ProblemSave"   component={ProblemSaveScreen} />
  </RootStack.Navigator>
);

/* ── Tab bar styles ────────────────────────────────── */

const BAR_SHADOW = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 22, elevation: 12,
} as const;

const tb = StyleSheet.create({
  wrapper: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 72, padding: 6, borderRadius: 36,
    backgroundColor: '#FFFFFF',
    ...BAR_SHADOW,
  },
  tab: {
    flex: 1, height: '100%', borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  tabOn:   { backgroundColor: LOOK.page },
  label:   { fontSize: 11, color: LOOK.ink, fontFamily: 'Inter_600SemiBold' },
  labelOn: { color: LOOK.green },
  ai: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: LOOK.ink,
    justifyContent: 'center', alignItems: 'center',
    ...BAR_SHADOW,
  },
  aiOn: { backgroundColor: LOOK.green },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.35)' },
  menuClose: { position: 'absolute', right: 16 },
  menu: {
    position: 'absolute', right: 16, width: 300, maxWidth: '92%',
    backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 4,
    ...BAR_SHADOW,
  },
  menuRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  menuBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  menuIcon:   { width: 40, height: 40, borderRadius: 14, backgroundColor: '#ECFDF5',
                alignItems: 'center', justifyContent: 'center' },
  menuIconProblem: { backgroundColor: LOOK.ink },
  menuTitle:  { fontSize: 15.5, color: LOOK.ink, fontFamily: 'Inter_700Bold' },
  menuSub:    { fontSize: 12.5, color: LOOK.soft, marginTop: 2 },
});
