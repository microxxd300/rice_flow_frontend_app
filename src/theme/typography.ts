import { TextStyle } from 'react-native';

/**
 * Modern typography scale
 * Designed for readability and clear visual hierarchy
 * Easy to scan for farmers and non-technical users
 */

export const typography = {
  display: {
    fontSize: 36,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 43,
    letterSpacing: -0.5,
  } as TextStyle,

  h1: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 38,
    letterSpacing: -0.5,
  } as TextStyle,

  h2: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    lineHeight: 34,
    letterSpacing: -0.4,
  } as TextStyle,

  h3: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 30,
    letterSpacing: -0.3,
  } as TextStyle,

  h4: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 26,
    letterSpacing: -0.3,
  } as TextStyle,

  h5: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 24,
    letterSpacing: -0.3,
  } as TextStyle,

  h6: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 22,
    letterSpacing: -0.2,
  } as TextStyle,

  body1: {
    fontSize: 17,
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
    lineHeight: 25,
    letterSpacing: -0.4,
  } as TextStyle,

  body2: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    letterSpacing: -0.2,
  } as TextStyle,

  caption: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    letterSpacing: -0.1,
  } as TextStyle,

  overline: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 16,
    letterSpacing: 0.2,
  } as TextStyle,

  button: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 22,
    letterSpacing: -0.2,
  } as TextStyle,

  label: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
    lineHeight: 20,
    letterSpacing: -0.1,
  } as TextStyle,
} as const;

export type Typography = typeof typography;
export type TypographyKey = keyof Typography;
