import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface MapPreviewCardProps {
  placeholder?: string;
  style?: ViewStyle;
}

export const MapPreviewCard: React.FC<MapPreviewCardProps> = ({
  placeholder = 'Map Preview',
  style,
}) => {
  const styles = StyleSheet.create({
    container: {
      borderRadius: theme.radius['2xl'],
      minHeight: 260,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    sky: {
      flex: 1,
      backgroundColor: '#D4E9F7',
      minHeight: 260,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    gridOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.15,
    },
    gridH: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: theme.colors.primary,
    },
    gridV: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 1,
      backgroundColor: theme.colors.primary,
    },
    centerContent: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    mapIcon: {
      fontSize: 52,
    },
    pinRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.85)',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: theme.radius.full,
      ...theme.shadows.sm,
    },
    pinDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    placeholderText: {
      fontSize: theme.typography.body2.fontSize,
      color: theme.colors.text,
      fontWeight: '600',
    },
    bottomBar: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    bottomText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.9)',
    },
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.sky}>
        {/* Grid lines for map feel */}
        <View style={styles.gridOverlay}>
          {[25, 50, 75].map(pct => (
            <View key={`h${pct}`} style={[styles.gridH, { top: `${pct}%` as any }]} />
          ))}
          {[25, 50, 75].map(pct => (
            <View key={`v${pct}`} style={[styles.gridV, { left: `${pct}%` as any }]} />
          ))}
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <View style={styles.pinRow}>
            <View style={styles.pinDot} />
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>📍 GIS Map — Tap to interact</Text>
      </View>
    </View>
  );
};
