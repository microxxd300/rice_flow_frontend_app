import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from '@/i18n/useTranslation';
import { AuthHeader, AuthField, AuthErrorBanner, AuthSubmitButton } from '@/components/AuthParts';
import { authPasswordResetConfirm, authPasswordResetRequest } from '@/services/apiService';
import {
  CODE_LENGTH, MIN_PASSWORD_LENGTH, RESEND_WAIT_SECONDS, cleanCode, firstError, resetFailureKey,
} from '@/utils/passwordReset';

type Nav = StackNavigationProp<any>;
type FieldErrors = { code?: string; password?: string; confirm?: string };

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<any>();
  const tr = useTranslation();
  const email: string = route.params?.email ?? '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [wait, setWait] = useState(RESEND_WAIT_SECONDS);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const clear = (key: keyof FieldErrors) => {
    if (fieldErrors[key]) setFieldErrors((e) => ({ ...e, [key]: undefined }));
    if (error) setError(null);
  };

  const validate = (): FieldErrors => {
    const found: FieldErrors = {};
    if (code.length !== CODE_LENGTH) found.code = tr.rpBadCode;
    if (password.length < MIN_PASSWORD_LENGTH) found.password = tr.rpShortPw;
    if (confirm !== password) found.confirm = tr.rpMismatch;
    return found;
  };

  const handleSave = async () => {
    if (loading) return;
    const found = validate();
    setFieldErrors(found);
    setError(null);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    try {
      await authPasswordResetConfirm({ email, code, new_password: password, new_password2: confirm });
      Alert.alert(tr.rpDoneTitle, tr.rpDoneMsg);
      navigation.navigateDeprecated('Login');
    } catch (err: any) {
      const data = err?.response?.data;
      const codeError = firstError(data?.code);
      const passwordError = firstError(data?.new_password);
      if (codeError || passwordError) {
        setFieldErrors({ code: codeError, password: passwordError });
      } else {
        setError(tr[resetFailureKey(err)]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (wait > 0 || loading) return;
    setError(null);
    setWait(RESEND_WAIT_SECONDS);
    try {
      await authPasswordResetRequest(email);
      setCode('');
    } catch (err: any) {
      setError(tr[resetFailureKey(err)]);
    }
  };

  const eye = (
    <TouchableOpacity onPress={() => setShowPw((v) => !v)} activeOpacity={0.7} style={s.eye}>
      <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color="#6B7280" />
    </TouchableOpacity>
  );

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
          <AuthHeader title={tr.rpTitle} sub={tr.rpSentTo.replace('{email}', email)} onBack={() => navigation.goBack()} />
          <View style={s.form}>
            {error && <AuthErrorBanner message={error} />}
            <AuthField
              label={tr.rpCodeLbl}
              icon="keypad-outline"
              value={code}
              onChangeText={(v) => { setCode(cleanCode(v)); clear('code'); }}
              placeholder="123456"
              keyboardType="number-pad"
              autoCapitalize="none"
              editable={!loading}
              error={fieldErrors.code}
            />
            <AuthField
              label={tr.rpNewPwLbl}
              icon="lock-closed-outline"
              value={password}
              onChangeText={(v) => { setPassword(v); clear('password'); }}
              placeholder={tr.authPwRule}
              autoCapitalize="none"
              secure={!showPw}
              editable={!loading}
              error={fieldErrors.password}
              rightSlot={eye}
            />
            <AuthField
              label={tr.authPw2Lbl}
              icon="lock-closed-outline"
              value={confirm}
              onChangeText={(v) => { setConfirm(v); clear('confirm'); }}
              placeholder={tr.authPw2Ph}
              autoCapitalize="none"
              secure={!showPw}
              editable={!loading}
              error={fieldErrors.confirm}
            />
            <AuthSubmitButton label={tr.rpSave} loading={loading} onPress={handleSave} />
            <TouchableOpacity style={s.resend} onPress={handleResend} disabled={wait > 0} activeOpacity={0.7}>
              <Text style={[s.resendText, wait > 0 && s.resendWaiting]}>
                {wait > 0 ? tr.rpResendIn.replace('{s}', String(wait)) : tr.rpResend}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F1F2F1' },
  flex:          { flex: 1 },
  scroll:        { flexGrow: 1, paddingBottom: 32 },
  form:          { paddingHorizontal: 16 },
  eye:           { padding: 6 },
  resend:        { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 10 },
  resendText:    { fontSize: 14, color: '#111827', fontFamily: 'Inter_700Bold', textDecorationLine: 'underline' },
  resendWaiting: { color: '#6B7280', fontFamily: 'Inter_500Medium', textDecorationLine: 'none' },
});
