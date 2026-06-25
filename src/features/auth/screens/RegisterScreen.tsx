import React from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/TextInput';
import { Spacer } from '@/components/Spacer';
import { useTheme } from '@/theme';
import { useAuthStore } from '../store';
import { passwordSchema } from '@/utils/validation';

/**
 * Register form validation schema
 */
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Register screen with form
 */
export const RegisterScreen: React.FC = () => {
  const theme = useTheme();
  const register = useAuthStore(state => state.register);
  const isLoading = useAuthStore(state => state.isLoading);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data.email, data.password, data.name);
    } catch (error) {
      Alert.alert('Registration Failed', 'Please try again with different details');
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Spacer size="xl" />

          <Text style={[theme.typography.h1, { color: theme.colors.text, marginBottom: theme.spacing.md }]}>
            Create Account
          </Text>

          <Spacer size="lg" />

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Full Name"
                placeholder="Enter your name"
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
                editable={!isLoading}
              />
            )}
          />

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
                hint="Min 8 chars, uppercase, lowercase, number"
                editable={!isLoading}
              />
            )}
          />

          <Spacer size="lg" />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={value}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
                secureTextEntry
                editable={!isLoading}
              />
            )}
          />

          <Spacer size="xl" />

          <Button
            label={isLoading ? 'Creating Account...' : 'Sign Up'}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            isLoading={isLoading}
          />

          <Spacer size="lg" />

          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={[theme.typography.body2, { color: theme.colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Button
              label="Login"
              variant="ghost"
              size="small"
              onPress={() => {}}  // Navigation would be handled by navigation state
              style={{ padding: 0 }}
            />
          </View>

          <Spacer size="xl" />
        </KeyboardAvoidingView>
      </ScrollView>
    </ScreenWrapper>
  );
};
