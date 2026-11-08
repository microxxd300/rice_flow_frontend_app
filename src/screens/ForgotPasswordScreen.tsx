import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '@/i18n/useTranslation';
import { AuthHeader, AuthField, AuthErrorBanner, AuthSubmitButton } from '@/components/AuthParts';
import { authPasswordResetRequest } from '@/services/apiService';
import { checkResetEmail, firstError, resetFailureKey } from '@/utils/passwordReset';

type Nav = StackNavigationProp<any>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const tr = useTranslation();
  const [email, setEmail] = useState<string>(route.params?.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (loading) return;
    const check = checkResetEmail(email);
    if (check !== 'ok') {
      setError(check === 'no-inbox' ? tr.fpNoInbox : tr.fpBadEmail);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await authPasswordResetRequest(email.trim());
      navigation.navigate('ResetPassword', { email: email.trim() });
    } catch (err: any) {
      setError(firstError(err?.response?.data?.email) ?? tr[resetFailureKey(err)]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
          <AuthHeader title={tr.fpTitle} sub={tr.fpSub} onBack={() => navigation.goBack()} />
          <View style={s.form}>
            {error && <AuthErrorBanner message={error} />}
            <AuthField
              label={tr.authEmailLbl}
              icon="mail-outline"
              value={email}
              onChangeText={(v) => { setEmail(v); if (error) setError(null); }}
              placeholder="juan@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <AuthSubmitButton label={tr.fpSend} loading={loading} onPress={handleSend} />
            <Text style={s.help}>{tr.fpHelp}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F1F2F1' },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  form:   { paddingHorizontal: 16 },
  help:   { fontSize: 14, lineHeight: 20, color: '#6B7280', textAlign: 'center', marginTop: 20, paddingHorizontal: 8, fontFamily: 'Inter_500Medium' },
});
