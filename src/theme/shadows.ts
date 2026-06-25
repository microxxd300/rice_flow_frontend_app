import { ViewStyle } from 'react-native';

/**
 * RiceFlow Elevation System v2.0
 * Intentional depth — every shadow implies real elevation.
 * Based on "0 2px 12px rgba(0,0,0,0.08)" design spec.
 */

export const shadows = {
  none: {} as ViewStyle,

  // Fine detail lift — focused inputs, small chips
  xs: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  } as ViewStyle,

  // Standard card lift — most content cards
  sm: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  } as ViewStyle,

  // Featured card — hero cards, stat panels
  md: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  } as ViewStyle,

  // Prominent elevation — floating headers, featured content
  lg: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  } as ViewStyle,

  // Modals, bottom sheets, overlays
  xl: {
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 10,
  } as ViewStyle,
} as const;

export type Shadows = typeof shadows;
export type ShadowKey = keyof Shadows;
