import React from 'react';
import { View } from 'react-native';
import type { SpacingKey } from '@/theme/spacing';
import { spacing } from '@/theme/spacing';

interface SpacerProps {
  size?: SpacingKey | number;
  horizontal?: boolean;
}

/**
 * Simple spacer component to add consistent spacing
 */
export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  horizontal = false,
}) => {
  const sizeValue = typeof size === 'number' ? size : spacing[size];

  return (
    <View
      style={
        horizontal
          ? { width: sizeValue }
          : { height: sizeValue }
      }
    />
  );
};
