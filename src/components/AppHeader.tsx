import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Image, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  description?: string;
  logo?: any;
  style?: ViewStyle;
  onBack?: () => void;
  variant?: 'light' | 'green';
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  description,
  logo,
  style,
  onBack,
  variant = 'light',
}) => {
  const isGreen = variant === 'green';

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      backgroundColor: isGreen ? theme.colors.primary : theme.colors.white,
      borderBottomWidth: isGreen ? 0 : 1,
      borderBottomColor: theme.colors.borderLight,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.full,
      backgroundColor: isGreen ? 'rgba(255,255,255,0.2)' : theme.colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backText: {
      fontSize: 20,
      color: isGreen ? theme.colors.white : theme.colors.text,
    },
    textBlock: {
      flex: 1,
    },
    logo: {
      width: 44,
      height: 44,
      resizeMode: 'contain',
      borderRadius: theme.radius.sm,
    },
    title: {
      fontSize: theme.typography.h5.fontSize,
      fontWeight: '700',
      color: isGreen ? theme.colors.white : theme.colors.text,
      marginBottom: 2,
    },
    subtitle: {
      fontSize: theme.typography.body2.fontSize,
      fontWeight: '400',
      color: isGreen ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary,
    },
    description: {
      fontSize: theme.typography.caption.fontSize,
      color: isGreen ? 'rgba(255,255,255,0.7)' : theme.colors.textTertiary,
      marginTop: theme.spacing.xs,
    },
  });

  const displayTitle = title || subtitle;
  const displaySubtitle = title ? subtitle : description;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
        {logo && <Image source={logo} style={styles.logo} />}
        <View style={styles.textBlock}>
          {displayTitle && <Text style={styles.title}>{displayTitle}</Text>}
          {displaySubtitle && <Text style={styles.subtitle}>{displaySubtitle}</Text>}
          {description && title && subtitle && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
      </View>
    </View>
  );
};
