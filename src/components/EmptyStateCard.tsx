import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface EmptyStateCardProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  title,
  message,
  icon,
  actionText,
  onAction,
  style,
}) => {
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
    },
    icon: {
      marginBottom: theme.spacing.lg,
      width: 64,
      height: 64,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: theme.typography.h4.fontSize,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    message: {
      fontSize: theme.typography.body2.fontSize,
      color: theme.colors.textSecondary,
      fontWeight: '400',
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: actionText ? theme.spacing.lg : 0,
    },
    actionText: {
      fontSize: theme.typography.body2.fontSize,
      fontWeight: '600',
      color: theme.colors.primary,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
  });

  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionText && onAction && (
        <Text style={styles.actionText} onPress={onAction}>
          {actionText}
        </Text>
      )}
    </View>
  );
};
