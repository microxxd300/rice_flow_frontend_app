import { ViewStyle, TextStyle } from 'react-native';
import { colors } from './colors';
import { spacing, radius } from './spacing';
import { shadows } from './shadows';
import { typography } from './typography';

/**
 * Modern, premium component styles
 * Soft rounded corners, refined shadows, clear hierarchy
 */

export const componentStyles = {
  // Premium Card Styles
  card: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.xl, // Soft rounded (20px)
    ...shadows.md,
  } as ViewStyle,

  cardElevated: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    ...shadows.lg,
  } as ViewStyle,

  cardAlt: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    borderWidth: 0,
  } as ViewStyle,

  cardMinimal: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.xs,
  } as ViewStyle,

  // Button Styles — pill-shaped per Apple HIG
  buttonPrimary: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: colors.primary,
  } as ViewStyle,

  buttonPrimaryText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '600',
  } as TextStyle,

  buttonSecondary: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.primary,
  } as ViewStyle,

  buttonSecondaryText: {
    ...typography.button,
    color: colors.primary,
    fontWeight: '600',
  } as TextStyle,

  buttonOutline: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  } as ViewStyle,

  buttonSmall: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    backgroundColor: colors.primary,
    ...shadows.xs,
  } as ViewStyle,

  // Premium Input Styles
  input: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.text,
    minHeight: 52,
  } as TextStyle & { borderWidth: number },

  inputFocused: {
    borderColor: colors.primary,
    ...shadows.xs,
  } as ViewStyle,

  // Chip / Pill Styles
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  chipActive: {
    backgroundColor: colors.primaryLighter,
    borderColor: colors.primary,
  } as ViewStyle,

  chipSuccess: {
    backgroundColor: colors.riskLowBg,
    borderColor: colors.riskLow,
  } as ViewStyle,

  chipWarning: {
    backgroundColor: colors.riskModerateBg,
    borderColor: colors.riskModerate,
  } as ViewStyle,

  chipError: {
    backgroundColor: colors.riskHighBg,
    borderColor: colors.riskHigh,
  } as ViewStyle,

  // Badge Styles
  badge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLighter,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  badgeSmall: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLighter,
  } as ViewStyle,

  // Container Styles
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,

  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  } as ViewStyle,

  screenPadding: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  } as ViewStyle,

  // Section Headers
  sectionHeader: {
    marginBottom: spacing.lg,
    marginTop: spacing.xl,
  } as ViewStyle,

  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    fontWeight: '700',
  } as TextStyle,

  sectionSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  } as TextStyle,

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.lg,
  } as ViewStyle,

  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    minHeight: 200,
  } as ViewStyle,

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  } as ViewStyle,

  gridItem: {
    flex: 1,
    minWidth: 150,
  } as ViewStyle,
} as const;

export type ComponentStyles = typeof componentStyles;
