import React from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/TextInput';
import { Spacer } from '@/components/Spacer';
import { useTheme } from '@/theme';
import { useAuthStore } from '../store';

/**
 * Login form validation schema
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Login screen with form
 */
export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const login = useAuthStore(state => state.login);
  const isLoading = useAuthStore(state => state.isLoading);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch (error: any) {
      const msg = error?.response?.data
        ? JSON.stringify(error.response.data)
        : error?.message || 'Please check your credentials and try again';
      Alert.alert('Login Failed', msg);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={[theme.typography.h1, { color: theme.colors.text, marginBottom: theme.spacing.xl }]}>
            Welcome Back
          </Text>

          <Spacer size="lg" />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Email"
                placeholder="Enter your email"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            )}
          />

          <Spacer size="lg" />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Password"
                placeholder="Enter your password"
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
                secureTextEntry
                editable={!isLoading}
              />
            )}
          />

          <Spacer size="xl" />

          <Button
            label={isLoading ? 'Logging in...' : 'Login'}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            isLoading={isLoading}
          />

          <Spacer size="lg" />

          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
              Don't have an account?{' '}
            </Text>
            <Button
              label="Sign Up"
              variant="ghost"
              size="small"
              onPress={() => {}}  // Navigation would be handled by navigation state
              style={{ padding: 0 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};
