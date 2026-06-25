import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface YieldSummaryCardProps {
  harvestDate: string;
  areaHarvested: number;
  actualYield: number;
  rsiValue: number;
  remarks: string;
  style?: ViewStyle;
}

export const YieldSummaryCard: React.FC<YieldSummaryCardProps> = ({
  harvestDate,
  areaHarvested,
  actualYield,
  rsiValue,
  remarks,
  style,
}) => {
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.radius['2xl'],
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    header: {
      backgroundColor: theme.colors.harvestGold,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    harvestIcon: {
      fontSize: 32,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: theme.typography.h5.fontSize,
      fontWeight: '800',
      color: theme.colors.white,
    },
    headerDate: {
      fontSize: theme.typography.body2.fontSize,
      color: 'rgba(255,255,255,0.85)',
      marginTop: 2,
    },
    metricsRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    metric: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.sm,
    },
    metricDivider: {
      width: 1,
      backgroundColor: theme.colors.borderLight,
      marginVertical: theme.spacing.md,
    },
    metricLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 6,
      textAlign: 'center',
    },
    metricValue: {
      fontSize: theme.typography.h4.fontSize,
      fontWeight: '800',
      color: theme.colors.text,
      textAlign: 'center',
    },
    metricUnit: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '500',
      textAlign: 'center',
      marginTop: 2,
    },
    remarksSection: {
      padding: theme.spacing.lg,
    },
    remarksLabel: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: theme.spacing.sm,
    },
    remarksText: {
      fontSize: theme.typography.body2.fontSize,
      color: theme.colors.text,
      fontWeight: '400',
      lineHeight: 21,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.harvestIcon}>🌾</Text>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Harvest Summary</Text>
          <Text style={styles.headerDate}>📅 {harvestDate}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Area</Text>
          <Text style={styles.metricValue}>{areaHarvested}</Text>
          <Text style={styles.metricUnit}>hectares</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Actual Yield</Text>
          <Text style={styles.metricValue}>{actualYield}</Text>
          <Text style={styles.metricUnit}>kg</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>RSI Score</Text>
          <Text style={styles.metricValue}>{rsiValue}</Text>
          <Text style={styles.metricUnit}>/ 10</Text>
        </View>
      </View>

      <View style={styles.remarksSection}>
        <Text style={styles.remarksLabel}>📝 Farmer Notes</Text>
        <Text style={styles.remarksText}>{remarks}</Text>
      </View>
    </View>
  );
};
