import React from 'react';
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
  const setupStep = useAppStore(s => s.setupStep);
  const setupData = useAppStore(s => s.setupData);

  const initialRoute =
    setupStep && RESUMABLE_STEPS.includes(setupStep) ? setupStep : 'FarmSetupWelcome';
  // setupData holds the exact route params recorded for the current step
  const resumeParams = setupData ?? {};

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      <Stack.Screen name="FarmSetupWelcome" component={FarmSetupWelcomeScreen} />
      <Stack.Screen name="FarmDetailsForm"    component={FarmDetailsFormScreen} />
      <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} initialParams={resumeParams} />
      <Stack.Screen name="FarmMapTagging"     component={FarmMapTaggingScreen}     initialParams={resumeParams} />
      <Stack.Screen name="AnalysisLoading"    component={AnalysisLoadingScreen} />
      <Stack.Screen name="SuitabilityResults" component={SuitabilityResultsScreen} initialParams={resumeParams} />
      <Stack.Screen name="PlantingGuideHandoff" initialParams={resumeParams}>
        {() => <PlantingGuideHandoffScreen onEnterApp={onComplete} onGoToGuide={onGoToGuide} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};
