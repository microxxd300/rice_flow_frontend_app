import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '@/theme';

interface CardProps extends ViewProps {
  children?: React.ReactNode;
  padding?: boolean;
  onPress?: () => void;
}

/**
 * Reusable card component with consistent styling
 */
export const Card = React.forwardRef<View, CardProps>(
  ({ children, padding = true, style, ...rest }, ref) => {
    const theme = useTheme();

    return (
      <View
        ref={ref}
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: padding ? theme.spacing.md : 0,
          },
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    );
  }
);

Card.displayName = 'Card';
