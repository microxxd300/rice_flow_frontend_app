import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';
import { useAccessibility } from '../context/AccessibilityContext';

interface GuideStepCardProps {
  stepNumber: number;
  title: string;
  instruction: string;
  daysAfterPlanting: number;
  isCompleted?: boolean;
  isLast?: boolean;
  style?: ViewStyle;
}

export const GuideStepCard: React.FC<GuideStepCardProps> = ({
  stepNumber,
  title,
  instruction,
  daysAfterPlanting,
  isCompleted = false,
  isLast = false,
  style,
}) => {
  const { isLargeText } = useAccessibility();
  const T = isLargeText;
  const dayLabel =
    daysAfterPlanting < 0
      ? `${Math.abs(daysAfterPlanting)} days before planting`
      : daysAfterPlanting === 0
        ? 'Planting Day'
        : `Day ${daysAfterPlanting}`;

  const dotColor = isCompleted ? theme.colors.success : theme.colors.primary;

  return (
    <View style={[styles.row, style]}>
      {/* Timeline column */}
      <View style={styles.timelineCol}>
        <View style={[styles.circle, { backgroundColor: dotColor }]}>
          {isCompleted ? (
            <Ionicons name="checkmark" size={16} color={theme.colors.white} />
          ) : (
            <Text style={styles.circleNum}>{stepNumber}</Text>
          )}
        </View>
        {!isLast && <View style={[styles.connector, isCompleted && styles.connectorDone]} />}
      </View>

      {/* Card */}
      <View style={[styles.card, isCompleted && styles.cardDone, isLast && { marginBottom: 0 }]}>
        <View style={styles.dayChip}>
          <Text style={[styles.dayText, isCompleted && styles.dayTextDone, T && { fontSize: 13 }]}>{dayLabel}</Text>
        </View>
        <Text style={[styles.title, T && { fontSize: 19 }]}>{title}</Text>
        <Text style={[styles.instruction, T && { fontSize: 17, lineHeight: 25 }]}>{instruction}</Text>
        {isCompleted && (
          <View style={styles.completedRow}>
            <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
            <Text style={[styles.completedText, T && { fontSize: 15 }]}>Step completed</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineCol: {
    alignItems: 'center',
    width: 44,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.xs,
  },
  circleNum: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.white,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 4,
    backgroundColor: theme.colors.borderLight,
    borderRadius: 1,
    minHeight: 20,
  },
  connectorDone: {
    backgroundColor: theme.colors.success + '50',
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.xs,
  },
  cardDone: {
    backgroundColor: '#F4FBF6',
    borderColor: theme.colors.success + '40',
  },
  dayChip: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLighter,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
    marginBottom: 8,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayTextDone: {
    color: theme.colors.success,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 6,
  },
  instruction: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.success + '25',
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
});
