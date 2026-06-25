import { spacing } from '@/theme';

export const SIZES = {
  // Component sizes
  BUTTON_HEIGHT: 48,
  INPUT_HEIGHT: 48,
  ICON_SMALL: 16,
  ICON_MEDIUM: 24,
  ICON_LARGE: 32,

  // Screen padding
  SCREEN_PADDING: spacing.lg,
  SCREEN_PADDING_H: spacing.lg,
  SCREEN_PADDING_V: spacing.lg,

  // Common gaps
  GAP_SM: spacing.sm,
  GAP_MD: spacing.md,
  GAP_LG: spacing.lg,
} as const;
