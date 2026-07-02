import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/theme';
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

const ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  HomeTab:     { active: 'home',        inactive: 'home-outline' },
  ProgressTab: { active: 'trending-up', inactive: 'trending-up-outline' },
  AITab:       { active: 'sparkles',    inactive: 'sparkles' },
  PlantingTab: { active: 'book',        inactive: 'book-outline' },
  ProfileTab:  { active: 'person',      inactive: 'person-outline' },
};


/* ── Custom floating pill tab bar ──────────────────── */

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[tb.wrapper, { bottom: Math.max(insets.bottom, 8) + 12 }]} pointerEvents="box-none">
      <View style={tb.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isCenter  = route.name === 'AITab';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCenter) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={tb.centerWrap}
                activeOpacity={0.85}
              >
                <View style={[tb.centerBtn, isFocused && tb.centerBtnActive]}>
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            );
          }

          const icons = ICONS[route.name];
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={tb.tabBtn}
              activeOpacity={0.7}
            >
              <View style={[tb.iconChip, isFocused && tb.iconChipActive]}>
                <Ionicons
                  name={isFocused ? icons.active : icons.inactive}
                  size={21}
                  color={isFocused ? colors.navActive : '#BDBDBD'}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/* ── Main tabs (the 5-tab floating bar) ────────────── */

const MainTabs: React.FC<{ initialTab?: string }> = ({ initialTab }) => (
  <Tab.Navigator
    tabBar={(props) => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
    initialRouteName={initialTab ?? 'HomeTab'}
  >
    <Tab.Screen name="HomeTab"     component={HomeStack} />
    <Tab.Screen name="ProgressTab" component={ProgressStack} />
    <Tab.Screen name="AITab"       component={AIStack} />
    <Tab.Screen name="PlantingTab" component={PlantingStack} />
    <Tab.Screen name="ProfileTab"  component={ProfileStack} />
  </Tab.Navigator>
);

/* ── App Navigator ─────────────────────────────────── */
// Wraps MainTabs in an outer stack so full-screen flows (like Add Farm) can be
// pushed ABOVE the tab bar — otherwise the floating tab bar would render on top
// of and block every screen in that flow, since it persists across all screens
// nested inside a tab's own stack.

export const AppNavigator: React.FC<{ initialTab?: string }> = ({ initialTab }) => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="MainTabs">
      {() => <MainTabs initialTab={initialTab} />}
    </RootStack.Screen>

    {/* Add-farm flow — reuses the same screens as the initial setup. Pushed
        above the tabs so the floating tab bar is hidden during the flow.
        After it ends (PlantingGuideHandoff), the screen pops back to
        MainTabs since onEnterApp/onGoToGuide aren't passed here. */}
    <RootStack.Screen name="FarmDetailsForm"      component={FarmDetailsFormScreen} />
    <RootStack.Screen name="LocationPermission"   component={LocationPermissionScreen} />
    <RootStack.Screen name="FarmMapTagging"       component={FarmMapTaggingScreen} />
    <RootStack.Screen name="AnalysisLoading"      component={AnalysisLoadingScreen} />
    <RootStack.Screen name="SuitabilityResults"   component={SuitabilityResultsScreen} />
    <RootStack.Screen name="PlantingGuideHandoff" component={PlantingGuideHandoffScreen} />
  </RootStack.Navigator>
);

/* ── Tab bar styles ────────────────────────────────── */

const tb = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: 3,
  },
  iconChip: {
    width: 40,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconChipActive: {
    borderRadius: 12,
    backgroundColor: `${colors.navActive}26`,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  centerBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.navActive,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.navActive,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 5,
  },
  centerBtnActive: {
    backgroundColor: '#047857',
  },
});
