import React from 'react';
import {
  View,
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
  Text,
} from 'react-native';
import { useTheme } from '@/theme';
import { SIZES } from '@/constants/sizes';

interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Reusable text input with label, error, and hint support
 */
export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(
  ({ label, error, hint, style, ...rest }, ref) => {
    const theme = useTheme();

    return (
      <View>
        {label && (
          <Text
            style={[
              theme.typography.body2,
              {
                color: theme.colors.text,
                marginBottom: theme.spacing.sm,
                fontWeight: '600',
              },
            ]}
          >
            {label}
          </Text>
        )}

        <RNTextInput
          ref={ref}
          placeholderTextColor={theme.colors.textTertiary}
          style={[
            {
              height: SIZES.INPUT_HEIGHT,
              borderWidth: 1,
              borderColor: error ? theme.colors.error : theme.colors.border,
              borderRadius: theme.radius.md,
              paddingHorizontal: theme.spacing.md,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              fontSize: theme.typography.body1.fontSize,
            },
            style,
          ]}
          {...rest}
        />

        {error && (
          <Text
            style={[
              theme.typography.caption,
              {
                color: theme.colors.error,
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            {error}
          </Text>
        )}

        {hint && !error && (
          <Text
            style={[
              theme.typography.caption,
              {
                color: theme.colors.textSecondary,
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            {hint}
          </Text>
        )}
      </View>
    );
  }
);

TextInput.displayName = 'TextInput';
