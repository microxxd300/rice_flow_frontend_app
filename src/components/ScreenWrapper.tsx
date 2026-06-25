import React from 'react';
import {
  View,
  ViewStyle,
  SafeAreaView,
} from 'react-native';
import { spacing } from '@/theme/spacing';
import { useTheme } from '@/theme';

interface SafeAreaViewProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

interface ScreenWrapperProps extends SafeAreaViewProps {
  children?: React.ReactNode;
  padding?: boolean;
  style?: ViewStyle;
}

/**
 * Universal screen wrapper with safe area, padding, and background
 * Use this for all screen components
 */
export const ScreenWrapper = React.forwardRef<View, ScreenWrapperProps>(
  ({ children, padding = true, style, ...rest }, ref) => {
    const theme = useTheme();

    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
        {...rest}
      >
        <View
          ref={ref}
          style={[
            {
              flex: 1,
              paddingHorizontal: padding ? spacing.lg : 0,
              paddingVertical: padding ? spacing.lg : 0,
            },
            style,
          ]}
        >
          {children}
        </View>
      </SafeAreaView>
    );
  }
);

ScreenWrapper.displayName = 'ScreenWrapper';

ScreenWrapper.displayName = 'ScreenWrapper';
