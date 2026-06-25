/**
 * Modern spacing scale with 8px base unit
 * Provides rhythm and breathing room for premium feel
 */

export const spacing = {
  xs: 4,    // Minimal spacing for tight groups
  sm: 8,    // Small gaps
  md: 12,   // Medium spacing within components
  lg: 16,   // Standard section spacing
  xl: 24,   // Large section padding
  '2xl': 32, // Extra large section gaps
  '3xl': 40, // Major section separations
  '4xl': 48, // Full section margins
} as const;

export type Spacing = typeof spacing;
export type SpacingKey = keyof Spacing;

/**
 * Border radius scale for modern, soft aesthetic
 * Soft rounded corners (20-28px) for cards and components
 */
export const radius = {
  none: 0,
  xs: 4,    // Minimal rounding
  sm: 8,    // Small elements
  md: 12,   // Standard components
  lg: 16,   // Medium cards
  xl: 20,   // Modern card radius
  '2xl': 24, // Larger cards
  '3xl': 28, // Premium component radius
  full: 9999, // Fully rounded (pill-shaped)
} as const;

export type Radius = typeof radius;
export type RadiusKey = keyof Radius;
