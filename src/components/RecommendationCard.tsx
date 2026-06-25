import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';
import { StatusBadge } from './StatusBadge';

interface RecommendationCardProps {
  rank: number;
  varietyName: string;
  suitabilityScore: number;
  rsiScore: number;
  climateResilience: 'low' | 'moderate' | 'high';
  description: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  rank,
  varietyName,
  suitabilityScore,
  rsiScore,
  climateResilience,
  description,
  onPress,
  style,
}) => {
  const isBest = rank === 1;
  const accentColor = isBest
    ? theme.colors.harvestGold
    : rank === 2
      ? theme.colors.primary
      : theme.colors.textTertiary;

  return (
    <TouchableOpacity
      style={[styles.container, isBest && styles.containerBest, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            {isBest && (
              <View style={styles.bestBadge}>
                <Ionicons name="star" size={10} color={theme.colors.harvestGold} />
                <Text style={styles.bestLabel}>Best Match</Text>
              </View>
            )}
            <Text style={styles.varietyName}>{varietyName}</Text>
          </View>
          <View style={[styles.rankPill, { backgroundColor: isBest ? theme.colors.harvestGold : theme.colors.border }]}>
            <Text style={[styles.rankText, { color: isBest ? theme.colors.white : theme.colors.textSecondary }]}>
              #{rank}
            </Text>
          </View>
        </View>

        {/* Scores */}
        <View style={styles.scoresRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Suitability</Text>
            <Text style={[styles.scoreValue, { color: isBest ? theme.colors.harvestGold : theme.colors.primary }]}>
              {suitabilityScore}%
            </Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>RSI Score</Text>
            <Text style={[styles.scoreValue, { color: isBest ? theme.colors.harvestGold : theme.colors.primary }]}>
              {rsiScore}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{description}</Text>

        {/* Footer */}
        <View style={styles.footer}>
          <StatusBadge
            label={`${climateResilience.charAt(0).toUpperCase() + climateResilience.slice(1)} Resilience`}
            status={climateResilience === 'high' ? 'success' : climateResilience === 'moderate' ? 'warning' : 'info'}
          />
          {onPress && (
            <View style={styles.viewDetail}>
              <Text style={styles.viewDetailText}>View details</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.sm,
  },
  containerBest: {
    borderColor: theme.colors.harvestGold + '60',
    borderWidth: 1.5,
  },
  accentBar: {
    height: 4,
  },
  body: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  titleBlock: {
    flex: 1,
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  bestLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.harvestGold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  varietyName: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  rankPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radius.full,
    marginLeft: theme.spacing.sm,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  scoreBox: {
    flex: 1,
    alignItems: 'center',
  },
  scoreDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.borderLight,
  },
  scoreLabel: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
