import { colors } from './colors';
import { spacing, radius } from './spacing';
import { typography } from './typography';
import { shadows } from './shadows';
import { componentStyles } from './components';

export { useTheme, useThemeValue } from './useTheme';

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  componentStyles,
} as const;

export type Theme = typeof theme;

export { colors, spacing, radius, typography, shadows, componentStyles };
export type { Colors, ColorKey } from './colors';
export type { Spacing, SpacingKey, Radius, RadiusKey } from './spacing';
export type { Typography, TypographyKey } from './typography';
export type { Shadows, ShadowKey } from './shadows';
export type { ComponentStyles } from './components';
