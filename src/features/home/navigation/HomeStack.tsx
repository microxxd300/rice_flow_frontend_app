import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeListScreen } from '../screens/HomeListScreen';

const Stack = createStackNavigator();

/**
 * Home feature stack navigator
 * Can be extended with detail screens, etc.
 */
export const HomeStack: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="HomeList"
        component={HomeListScreen}
        options={{
          title: 'Home',
        }}
      />
    </Stack.Navigator>
  );
};
