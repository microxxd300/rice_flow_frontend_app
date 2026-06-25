import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Spacer } from '@/components/Spacer';
import { useTheme } from '@/theme';
import { useHomeStore } from '../store';
import { useAuthStore } from '@/features/auth/store';

/**
 * Home list screen
 * Displays items fetched from API
 */
export const HomeListScreen: React.FC = () => {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  // Example of using Zustand store for state
  const items = useHomeStore(state => state.items);
  const fetchItems = useHomeStore(state => state.fetchItems);

  // Example of using TanStack Query for server state
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['home', 'items'],
    queryFn: async () => {
      // Mock data - replace with actual API call
      return [
        { id: '1', title: 'Item 1', description: 'Description 1' },
        { id: '2', title: 'Item 2', description: 'Description 2' },
        { id: '3', title: 'Item 3', description: 'Description 3' },
      ];
    },
  });

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.lg }}>
          <View>
            <Text style={[theme.typography.h2, { color: theme.colors.text }]}>
              Home
            </Text>
            {user && (
              <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
                Welcome, {user.name}
              </Text>
            )}
          </View>
          <Button
            label="Logout"
            variant="outline"
            size="small"
            onPress={handleLogout}
          />
        </View>

        <Spacer size="lg" />

        {/* Items List */}
        <FlatList
          data={data || items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: theme.spacing.lg }}>
              <Text style={[theme.typography.h5, { color: theme.colors.text }]}>
                {item.title}
              </Text>
              <Spacer size="sm" />
              <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
                {item.description}
              </Text>
            </Card>
          )}
          ListEmptyComponent={
            <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: theme.spacing.xl }}>
              <Text style={[theme.typography.body1, { color: theme.colors.textSecondary }]}>
                No items yet
              </Text>
            </View>
          }
          scrollEnabled={false}
        />

        {error && (
          <View style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.body2, { color: theme.colors.error }]}>
              Failed to load items
            </Text>
            <Spacer size="md" />
            <Button
              label="Retry"
              variant="primary"
              onPress={() => refetch()}
            />
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
};
