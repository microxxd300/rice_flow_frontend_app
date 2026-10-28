import React, { useState, useCallback } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  FarmSetupWelcomeScreen,
  FarmDetailsFormScreen,
  LocationPermissionScreen,
  FarmMapTaggingScreen,
  AnalysisLoadingScreen,
  SuitabilityResultsScreen,
  PlantingGuideHandoffScreen,
} from '../../screens';
import { useAppStore } from '@/store/appStore';

interface SetupNavigatorProps {
  onComplete: () => void;
  onGoToGuide: () => void;
}

const Stack = createStackNavigator();

// Steps we can reopen straight into. AnalysisLoading is excluded — it creates the
// farm / runs the analysis, so resuming there would re-run it. Quitting during
// analysis falls back to the last recorded step (FarmMapTagging).
const RESUMABLE_STEPS = [
  'FarmDetailsForm', 'LocationPermission', 'FarmMapTagging',
  'SuitabilityResults', 'PlantingGuideHandoff',
];

export const SetupNavigator: React.FC<SetupNavigatorProps> = ({ onComplete, onGoToGuide }) => {
  // Read the resume point ONCE, at mount.
  //
  // These values only seed the navigator's initial route and params, which
  // React Navigation reads on first mount and never again. Subscribing to them
  // reactively meant every screen that recorded its progress (each one writes a
  // fresh setupData object on mount) re-rendered this navigator — which in turn
  // churned the screen definitions below and remounted the visible screen
  // mid-transition. That churn is what made "Go to Dashboard" bounce.
  const [{ initialRoute, resumeParams }] = useState(() => {
    const { setupStep, setupData } = useAppStore.getState();
    return {
      initialRoute: setupStep && RESUMABLE_STEPS.includes(setupStep) ? setupStep : 'FarmSetupWelcome',
      resumeParams: setupData ?? {},
    };
  });

  // Stable identity: a new inline function here would be treated as a new
  // component type on every render, unmounting and remounting the screen.
  const renderHandoff = useCallback(
    () => <PlantingGuideHandoffScreen onEnterApp={onComplete} onGoToGuide={onGoToGuide} />,
    [onComplete, onGoToGuide],
  );

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="FarmSetupWelcome" component={FarmSetupWelcomeScreen} />
      <Stack.Screen name="FarmDetailsForm"    component={FarmDetailsFormScreen} />
      <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} initialParams={resumeParams} />
      <Stack.Screen name="FarmMapTagging"     component={FarmMapTaggingScreen}     initialParams={resumeParams} />
      <Stack.Screen name="AnalysisLoading"    component={AnalysisLoadingScreen} />
      <Stack.Screen name="SuitabilityResults" component={SuitabilityResultsScreen} initialParams={resumeParams} />
      <Stack.Screen name="PlantingGuideHandoff" initialParams={resumeParams}>
        {renderHandoff}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
