import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

interface FarmInfoCardProps {
  farmName: string;
  location: string;
  areaHectares: number;
  latitude: number;
  longitude: number;
  profileType?: string;
  style?: ViewStyle;
}

export const FarmInfoCard: React.FC<FarmInfoCardProps> = ({
  farmName,
  location,
  areaHectares,
  latitude,
  longitude,
  profileType,
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
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    },
    farmIcon: {
      fontSize: 28,
      marginBottom: theme.spacing.sm,
    },
    farmName: {
      fontSize: theme.typography.h5.fontSize,
      fontWeight: '800',
      color: theme.colors.white,
      marginBottom: 4,
    },
    locationText: {
      fontSize: theme.typography.body2.fontSize,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '400',
    },
    body: {
      padding: theme.spacing.lg,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    rowIcon: {
      fontSize: 16,
      width: 24,
    },
    rowLabel: {
      fontSize: theme.typography.body2.fontSize,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    rowValue: {
      fontSize: theme.typography.body1.fontSize,
      fontWeight: '700',
      color: theme.colors.text,
    },
    profilePill: {
      marginTop: theme.spacing.md,
      backgroundColor: theme.colors.primaryLighter,
      borderRadius: theme.radius.full,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
    },
    profileText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.primary,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.farmIcon}>🌾</Text>
        <Text style={styles.farmName}>{farmName}</Text>
        <Text style={styles.locationText}>📍 {location}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>📐</Text>
            <Text style={styles.rowLabel}>Farm Area</Text>
          </View>
          <Text style={styles.rowValue}>{areaHectares} hectares</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>🧭</Text>
            <Text style={styles.rowLabel}>Latitude</Text>
          </View>
          <Text style={styles.rowValue}>{latitude.toFixed(4)}°</Text>
        </View>

        <View style={[styles.row, styles.rowLast]}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowIcon}>🧭</Text>
            <Text style={styles.rowLabel}>Longitude</Text>
          </View>
          <Text style={styles.rowValue}>{longitude.toFixed(4)}°</Text>
        </View>

        {profileType && (
          <View style={styles.profilePill}>
            <Text style={styles.profileText}>🏷️ {profileType}</Text>
          </View>
        )}
      </View>
    </View>
  );
};
