import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

type BadgeStatus = 'low' | 'moderate' | 'high' | 'success' | 'warning' | 'error' | 'info';

interface StatusBadgeProps {
  label: string;
  status: BadgeStatus;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, status, style }) => {
  const getColors = (s: BadgeStatus) => {
    switch (s) {
      case 'low':
      case 'success':
        return { bg: '#E8F5E9', text: '#1B5E20', border: '#A5D6A7' };
      case 'moderate':
      case 'warning':
        return { bg: '#FFF8E1', text: '#E65100', border: '#FFE082' };
      case 'high':
      case 'error':
        return { bg: '#FFEBEE', text: '#B71C1C', border: '#FFCDD2' };
      case 'info':
        return { bg: '#E3F2FD', text: '#0D47A1', border: '#BBDEFB' };
      default:
        return { bg: '#F5F5F3', text: '#616161', border: '#E0E0E0' };
    }
  };

  const c = getColors(status);

  const styles = StyleSheet.create({
    badge: {
      paddingVertical: 5,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.full,
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.border,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
    },
    text: {
      fontSize: theme.typography.caption.fontSize,
      fontWeight: '700',
      color: c.text,
      letterSpacing: 0.2,
    },
  });

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};
