import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ROUTES } from '@/constants/routes';
import {
  SplashScreen, WelcomeScreen, LoginScreen, RegisterScreen, OTPVerificationScreen,
} from '@/screens';

const Stack = createStackNavigator();

/**
 * Auth stack navigator for unauthenticated users
 * Plays the splash animation once, then shows Welcome → Login flow
 */
export const AuthNavigator: React.FC = () => {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animationEnabled: true,
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{
          cardStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          cardStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ cardStyle: { backgroundColor: '#FFFFFF' } }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{ cardStyle: { backgroundColor: '#FFFFFF' } }}
      />
    </Stack.Navigator>
  );
};
