import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '@/features/auth/store';
import { useTranslation } from '@/i18n/useTranslation';
import { AuthHeader, AuthField } from '@/components/AuthParts';

type Nav = StackNavigationProp<any>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { login: authLogin } = useAuthStore();
  const tr = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const toEmail = (u: string) => u.includes('@') ? u.trim() : `${u.trim()}@georice.app`;

  const handleLogin = () => {
    if (loading) return;
    // Tell the user what's missing instead of silently doing nothing.
    if (!username.trim() && !password) { setError('Please enter your email and password.'); return; }
    if (!username.trim())              { setError('Please enter your email.'); return; }
    if (!password)                     { setError('Please enter your password.'); return; }
    setError(null);
    setLoading(true);
    authLogin(toEmail(username), password)
      .then(() => setLoading(false))
      .catch((err: any) => {
        setLoading(false);
        const status = err?.response?.status;
        const data   = err?.response?.data;
        const detail = data?.detail || data?.error || data?.non_field_errors?.[0];
        if (status === 400 || status === 401) {
          setError(detail || 'Incorrect email or password. Please try again.');
        } else if (!err?.response) {
          setError('Can’t reach the server. Check your internet connection.');
        } else {
          setError(detail || 'Login failed. Please try again.');
        }
      });
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>

          <AuthHeader title={tr.authLoginTitle} sub={tr.authLoginSub} onBack={() => navigation.goBack()} />

          <View style={s.form}>
            {error && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <AuthField
              label={tr.authUserLbl}
              icon="person-outline"
              value={username}
              onChangeText={(v) => { setUsername(v); if (error) setError(null); }}
              placeholder="juanfarm"
              autoCapitalize="none"
              editable={!loading}
            />
            <AuthField
              label={tr.authPwLbl}
              icon="lock-closed-outline"
              value={password}
              onChangeText={(v) => { setPassword(v); if (error) setError(null); }}
              placeholder={tr.authPwPh}
              autoCapitalize="none"
              secure={!showPw}
              editable={!loading}
              rightSlot={
                <TouchableOpacity onPress={() => setShowPw(v => !v)} activeOpacity={0.7} style={s.eye}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color="#6B7280" />
                </TouchableOpacity>
              }
            />

            <TouchableOpacity
              style={s.forgotBtn}
              onPress={() => navigation.navigate('ForgotPassword', username.includes('@') ? { email: username.trim() } : undefined)}
              activeOpacity={0.7}
            >
              <Text style={s.forgotText}>{tr.authForgot}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.darkBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <Ionicons name="hourglass-outline" size={18} color="#FFFFFF" />
                : <Text style={s.darkBtnText}>{tr.welLogin}</Text>}
            </TouchableOpacity>

            <View style={s.switchRow}>
              <Text style={s.switchText}>{tr.authNew}</Text>
              <TouchableOpacity onPress={() => navigation.navigateDeprecated('Register')} activeOpacity={0.7}>
                <Text style={s.switchLink}>{tr.authCreateLink}</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const INK = '#111827';

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F1F2F1' },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  form:   { paddingHorizontal: 16 },
  eye:    { padding: 6 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FDECEC', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  errorText:   { flex: 1, fontSize: 13, color: '#B91C1C', fontFamily: 'Inter_600SemiBold' },

  darkBtn:     { height: 56, borderRadius: 20, backgroundColor: INK, justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  darkBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },

  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 6 },
  switchText: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  switchLink: { fontSize: 14, color: INK, fontFamily: 'Inter_700Bold', textDecorationLine: 'underline' },

  forgotBtn:  { alignSelf: 'flex-end', paddingVertical: 4, marginBottom: 18 },
  forgotText: { fontSize: 13, color: INK, fontFamily: 'Inter_600SemiBold' },
});
