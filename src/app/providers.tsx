import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '@/features/auth/store';
import { useLanguageStore } from '@/store/languageStore';
import { reactQueryClient } from './queryClient';
import { View, Text, ActivityIndicator } from 'react-native';
import { AccessibilityProvider } from '@/context/AccessibilityContext';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

// Apply Inter as the base font for every Text in the app.
// Component-level styles (color, fontWeight, etc.) still override normally.
const _defaults = (Text as any).defaultProps ?? {};
(Text as any).defaultProps = {
  ..._defaults,
  style: [{ fontFamily: 'Inter_400Regular' }, _defaults.style],
};

export const RootProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AccessibilityProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={reactQueryClient}>
          <NavigationContainer>
            {children}
          </NavigationContainer>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </AccessibilityProvider>
  );
};

export const AppWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initializeAuth = useAuthStore(state => state.initializeAuth);
  const loadLanguage   = useLanguageStore(state => state.loadLanguage);
  const [authReady, setAuthReady] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadLanguage().catch(() => {});
    initializeAuth()
      .catch(() => {})
      .finally(() => setAuthReady(true));
  }, [initializeAuth]);

  const isReady = authReady && (fontsLoaded || !!fontError);

  if (!isReady) {
    return (
      <RootProviders>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
          <ActivityIndicator size="small" color="#1F6B3F" />
        </View>
      </RootProviders>
    );
  }

  return <RootProviders>{children}</RootProviders>;
};
