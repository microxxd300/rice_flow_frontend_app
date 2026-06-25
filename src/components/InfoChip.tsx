import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface InfoChipProps {
  label: string;
  value: string;
  iconName?: IconName;
  style?: ViewStyle;
}

export const InfoChip: React.FC<InfoChipProps> = ({ label, value, iconName, style }) => {
  return (
    <View style={[styles.container, style]}>
      {iconName && (
        <View style={styles.iconBox}>
          <Ionicons name={iconName} size={16} color={theme.colors.primary} />
        </View>
      )}
      <View style={styles.textBlock}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primaryLighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  value: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '700',
  },
});
