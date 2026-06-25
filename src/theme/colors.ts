/**
 * RiceFlow Premium Color System v2.0
 * Sophisticated emerald + amber palette â€” Airbnb meets precision agriculture
 */

export const colors = {
  // â”€â”€ Brand Primary â€” Deep Emerald â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  primary:        '#059669',   // deep emerald â€” authority, growth
  primaryLight:   '#2EAD6A',   // fresh mid-green
  primaryLighter: '#E8F5EF',   // soft green tint for backgrounds
  primaryDark:    '#0F5C35',   // darkest green â€” gradient end, nav
  navActive:      '#059669',   // nav active accent â€” bright emerald

  // â”€â”€ Brand Accent â€” Golden Amber (harvest, CTAs, highlights) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  accent:         '#F5A623',   // golden amber â€” primary CTA color
  accentDark:     '#D4881B',   // pressed / dark accent
  accentLight:    '#FEF3DC',   // soft amber tint background

  // â”€â”€ Semantic Status Colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  success:        '#27AE60',   // RSI high score, positive
  successLight:   '#D5F5E3',   // success tint background
  warning:        '#E67E22',   // RSI moderate score, caution
  warningLight:   '#FDEBD0',   // warning tint background
  error:          '#E74C3C',   // RSI low / alerts
  errorLight:     '#FADBD8',   // error tint background
  info:           '#2980B9',   // informational

  // â”€â”€ Risk / RSI Level Colors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  riskLow:        '#27AE60',
  riskModerate:   '#E67E22',
  riskHigh:       '#E74C3C',
  riskLowBg:      '#D5F5E3',
  riskModerateBg: '#FDEBD0',
  riskHighBg:     '#FADBD8',

  // â”€â”€ Text Hierarchy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  text:           '#1A1A2E',   // near-black, deep navy â€” max readability
  textSecondary:  '#6B7280',   // muted secondary labels
  textTertiary:   '#9CA3AF',   // captions, helper text
  textMuted:      '#D1D5DB',   // disabled / placeholder

  // â”€â”€ Surfaces & Backgrounds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  background:     '#F7F9F8',   // warm off-white screen background
  surface:        '#FFFFFF',   // card / modal surface
  surfaceAlt:     '#F3F6F4',   // alternate surface (subtle green tint)
  surfaceElevated:'#FFFFFF',   // elevated surface (modals)

  // â”€â”€ Borders & Dividers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  border:         '#E5E7EB',   // standard border
  borderLight:    '#F0F2F1',   // ultra-subtle divider
  borderMuted:    '#EAECEB',   // muted border

  // â”€â”€ Agricultural Theme Extras â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  harvestGold:    '#F5A623',   // alias â†’ accent
  fieldGreen:     '#059669',   // alias â†’ primary
  soilBrown:      '#8D6E63',   // warm earth
  waterBlue:      '#3498DB',   // rainfall / water
  skyLight:       '#EBF5FB',   // sky tint

  // â”€â”€ Functional â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  disabled:       '#D1D5DB',
  placeholder:    '#9CA3AF',
  overlay:        'rgba(26,31,46,0.5)',

  // â”€â”€ Gold accent surfaces (for #1 rank cards, harvest summaries) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  goldSurface:    '#FEF3DC',
  goldDark:       '#B7790F',
  skySurface:     '#EBF5FB',

  // â”€â”€ Gray scale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  gray100:        '#F9FAFB',
  gray200:        '#F3F4F6',
  gray300:        '#E5E7EB',

  // â”€â”€ Primitives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  white:          '#FFFFFF',
  black:          '#000000',

  // â”€â”€ Legacy aliases (kept so existing screens don't break) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  secondary:      '#D4A574',
  secondaryLight: '#EBD9C3',
  tertiary:       '#87CEEB',
  tertiaryLight:  '#D4E9F7',
  sky:            '#87CEEB',
} as const;

export type Colors = typeof colors;
export type ColorKey = keyof Colors;
