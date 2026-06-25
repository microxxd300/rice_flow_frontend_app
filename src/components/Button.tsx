import React from 'react';
import {
  TouchableOpacity,
  Text,
  TouchableOpacityProps,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { useTheme } from '@/theme';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Modern, premium button component
 * Soft rounded corners, refined shadows, clear visual hierarchy
 */
export const Button = React.forwardRef<View, ButtonProps>(
  (
    {
      label,
      variant = 'primary',
      size = 'medium',
      isLoading = false,
      disabled = false,
      onPress,
      style,
      ...rest
    },
    ref
  ) => {
    const theme = useTheme();

    const sizeStyles = {
      small: {
        height: 40,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.full,
      },
      medium: {
        height: 52,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radius.full,
      },
      large: {
        height: 56,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radius.full,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1.5,
        borderColor: '#A7F3D0',
      },
      outline: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
    };

    const textColorMap = {
      primary: theme.colors.white,
      secondary: theme.colors.primary,
      outline: theme.colors.primary,
      ghost: theme.colors.primary,
    };

    const shadowStyle = {};

    return (
      <TouchableOpacity
        ref={ref}
        disabled={disabled || isLoading}
        onPress={onPress}
        activeOpacity={0.8}
        style={[
          {
            justifyContent: 'center',
            alignItems: 'center',
            opacity: disabled || isLoading ? 0.6 : 1,
          },
          sizeStyles[size],
          variantStyles[variant],
          shadowStyle,
          style,
        ]}
        {...rest}
      >
        {isLoading ? (
          <ActivityIndicator color={textColorMap[variant]} />
        ) : (
          <Text
            style={[
              theme.typography.button,
              {
                color: textColorMap[variant],
                fontWeight: '600',
              },
            ]}
          >
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';
