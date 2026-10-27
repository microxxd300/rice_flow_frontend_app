import React, { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/store';
import { useAppStore } from '@/store/appStore';
import { useLanguageStore } from '@/store/languageStore';
import { reactQueryClient } from './queryClient';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
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
  // RootNavigator swaps the ENTIRE root navigator between auth / setup / app.
  // Those navigators deliberately share route names — SuitabilityResults and
  // PlantingGuideHandoff exist in both the setup stack and the in-app add-farm
  // stack — so NavigationContainer carried its state across the swap and
  // rehydrated the matching route, landing the user back on the very screen
  // they had just finished. Keying the container per mode means each mode
  // builds a fresh stack with nothing inherited from the previous one.
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const setupComplete   = useAppStore(s => s.setupComplete);
  const navMode = !isAuthenticated ? 'auth' : setupComplete ? 'app' : 'setup';

  return (
    <AccessibilityProvider>
      {/* SafeAreaProvider makes every screen's SafeAreaView / useSafeAreaInsets
          read each device's REAL top/bottom insets (notch, Dynamic Island,
          punch-hole, plain status bar) — so headers adapt across phone sizes
          instead of using a fixed fallback. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {/* Dark icons/text on the white app background so the status bar
              (time, battery, wifi) is actually visible. */}
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
          <QueryClientProvider client={reactQueryClient}>
            {/* navigationInChildEnabled keeps React Navigation 6's navigate-by-name into
                nested navigators (removed by default in 7) */}
            <NavigationContainer key={navMode} navigationInChildEnabled>
              {children}
            </NavigationContainer>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
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
