import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AppNavigator } from './AppNavigator';
import { SetupNavigator } from './SetupNavigator';
import { AuthNavigator } from './AuthNavigator';
import { useAuthStore } from '@/features/auth/store';
import { useAppStore } from '@/store/appStore';

export const RootNavigator: React.FC = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const farmsLoaded   = useAppStore(state => state.farmsLoaded);
  const setupComplete = useAppStore(state => state.setupComplete);
  const setSetupComplete = useAppStore(state => state.setSetupComplete);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  if (!farmsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="small" color="#1F6B3F" />
      </View>
    );
  }

  // setupComplete is persisted (loaded on login/init), so an unfinished setup
  // resumes after the app is quit and reopened — even if a farm was created mid-flow.
  const needsSetup = !setupComplete;

  if (needsSetup) {
    return (
      <SetupNavigator
        onComplete={() => setSetupComplete(true)}
        onGoToGuide={() => {
          setInitialTab('PlantingTab');
          setSetupComplete(true);
        }}
      />
    );
  }

  return <AppNavigator initialTab={initialTab} />;
};
