import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '@/features/auth/store';
import { useTranslation } from '@/i18n/useTranslation';
import { AuthHeader, AuthField } from '@/components/AuthParts';

type Nav = StackNavigationProp<any>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { register } = useAuthStore();
  const tr = useTranslation();

  const [fullName,        setFullName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw,          setShowPw]          = useState(false);
  const [showCPw,         setShowCPw]         = useState(false);
  const [agreed,          setAgreed]          = useState(false);
  const [submitted,       setSubmitted]       = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  // Per-field error messages so the user sees exactly what to fix.
  type FieldErrors = Partial<Record<'fullName' | 'email' | 'password' | 'confirmPassword' | 'terms', string>>;
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const pwMismatch = submitted && confirmPassword.length > 0 && password !== confirmPassword;

  // Client-side validation → returns a map of field → message (empty = valid).
  const validate = (): FieldErrors => {
    const fe: FieldErrors = {};
    if (!fullName.trim()) fe.fullName = 'Please enter your full name.';
    const emailTrim = email.trim();
    if (!emailTrim) {
      fe.email = 'Please enter your email.';
    } else if (emailTrim.includes('@') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTrim)) {
      fe.email = 'Enter a valid email address.';
    }
    if (password.length < 8) fe.password = 'Password must be at least 8 characters.';
    if (confirmPassword !== password) fe.confirmPassword = "Passwords don't match.";
    if (!agreed) fe.terms = 'Please accept the Terms to continue.';
    return fe;
  };


  const handleRegister = async () => {
    setSubmitted(true);
    setError(null);
    // Show which fields are wrong instead of silently doing nothing.
    const fe = validate();
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0 || loading) return;
    setLoading(true);

    // Single-word names → keep last_name empty (don't duplicate first_name,
    // otherwise the display name comes out as "Juan Juan").
    const nameParts  = fullName.trim().split(/\s+/);
    const first_name = nameParts[0] ?? '';
    const last_name  = nameParts.slice(1).join(' ');

    try {
      const emailVal = email.trim().includes('@') ? email.trim() : `${email.trim()}@georice.app`;
      await register({
        email:        emailVal,
        password,
        password2:    confirmPassword,
        first_name,
        last_name,
      });
      // register() also signs in; the navigator then opens farm setup
    } catch (err: any) {
      if (err?.loginAfterRegister) {
        // Account exists, but signing in failed (e.g. the connection dropped): log in by hand
        Alert.alert('Account created', 'Please log in with your new email and password.');
        navigation.navigateDeprecated('Login' as never);
        return;
      }
      const data   = err?.response?.data;
      const status = err?.response?.status;
      const first  = (v: any) => (Array.isArray(v) ? String(v[0]) : String(v));

      if (!err?.response) {
        setError('Can’t reach the server. Check your internet connection.');
      } else if (data && typeof data === 'object') {
        // Map DRF field errors ({ email: [...], password: [...] }) onto the
        // matching field so the user sees exactly what's wrong and where.
        const fe: FieldErrors = {};
        if (data.email)     fe.email    = first(data.email);
        if (data.password)  fe.password = first(data.password);
        if (data.password2) fe.confirmPassword = first(data.password2);
        if (Object.keys(fe).length > 0) {
          setFieldErrors(prev => ({ ...prev, ...fe }));
          setError(null);
        } else {
          setError(String(data.detail || data.error || 'Could not register. Please check your details and try again.'));
        }
      } else if (status === 400) {
        setError('That email may already be registered, or some fields are invalid.');
      } else {
        setError(err?.message || 'Could not register. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Password strength meter (0–4 thin bars)
  const len   = password.length;
  // The server rejects common and all-number passwords (Django's password validators),
  // so never call those "Fair" here
  const COMMON_PASSWORDS = ['password', 'password1', 'password123', 'passw0rd', '12345678', '123456789',
    '1234567890', '87654321', '11111111', '00000000', 'qwerty123', 'qwertyuiop', 'iloveyou', 'admin123',
    'welcome1', 'abc12345', 'abcd1234', 'letmein1', 'sunshine', 'princess'];
  const tooCommon = len > 0 && (/^\d+$/.test(password) || COMMON_PASSWORDS.includes(password.toLowerCase()));
  const score = tooCommon ? 1
    : [len >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const strengthLabel = tooCommon ? 'Too common' : ['', 'Weak', 'Fair', 'Strong', 'Very strong'][score];
  const strengthColor = ['', '#DC2626', '#D97706', '#059669', '#0F4C28'][score];

  const clear = (k: keyof FieldErrors) => { if (fieldErrors[k]) setFieldErrors(e => ({ ...e, [k]: undefined })); };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>

          <AuthHeader title={tr.authRegTitle} sub={tr.authRegSub} onBack={() => navigation.goBack()} />

          <View style={s.form}>
            {error && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <AuthField label={tr.authNameLbl} icon="person-outline" value={fullName}
              onChangeText={(v) => { setFullName(v); clear('fullName'); }}
              placeholder="Juan Dela Cruz" autoCapitalize="words" error={fieldErrors.fullName} />
            <AuthField label={tr.authEmailLbl} icon="mail-outline" value={email}
              onChangeText={(v) => { setEmail(v); clear('email'); }}
              placeholder="juan@example.com" autoCapitalize="none" keyboardType="email-address" error={fieldErrors.email} />

            <AuthField
              label={tr.authPwLbl}
              icon="lock-closed-outline"
              value={password}
              onChangeText={(v) => { setPassword(v); clear('password'); }}
              placeholder={tr.authPwRule}
              autoCapitalize="none"
              secure={!showPw}
              error={fieldErrors.password}
              rightSlot={
                <TouchableOpacity onPress={() => setShowPw(v => !v)} activeOpacity={0.7} style={s.eye}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={19} color="#6B7280" />
                </TouchableOpacity>
              }
            />

            {password.length > 0 && (
              <View style={s.strengthWrap}>
                <View style={s.strengthBars}>
                  {[1, 2, 3, 4].map(i => (
                    <View key={i} style={[s.strengthBar, { backgroundColor: i <= score ? strengthColor : '#E4E6E4' }]} />
                  ))}
                </View>
                <Text style={[s.strengthText, { color: strengthColor }]}>{strengthLabel}</Text>
              </View>
            )}

            <AuthField
              label={tr.authPw2Lbl}
              icon="lock-closed-outline"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); clear('confirmPassword'); }}
              placeholder={tr.authPw2Ph}
              autoCapitalize="none"
              secure={!showCPw}
              error={fieldErrors.confirmPassword ?? (pwMismatch ? "Passwords don't match" : undefined)}
              rightSlot={
                <TouchableOpacity onPress={() => setShowCPw(v => !v)} activeOpacity={0.7} style={s.eye}>
                  <Ionicons name={showCPw ? 'eye-off-outline' : 'eye-outline'} size={19} color="#6B7280" />
                </TouchableOpacity>
              }
            />

            {/* Terms */}
            <TouchableOpacity style={s.termsRow} onPress={() => { setAgreed(v => !v); clear('terms'); }} activeOpacity={0.7}>
              <View style={[s.checkbox, agreed && s.checkboxActive, !!fieldErrors.terms && { borderColor: '#DC2626' }]}>
                {agreed && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
              </View>
              <Text style={s.termsText}>
                {tr.authAgree}{' '}
                <Text style={s.termsLink} onPress={() => navigation.navigate('PrivacyNotice')}>Terms</Text>
                {' '}{tr.authAnd}{' '}
                <Text style={s.termsLink} onPress={() => navigation.navigate('PrivacyNotice')}>Privacy Policy</Text>.
              </Text>
            </TouchableOpacity>
            {fieldErrors.terms ? <Text style={s.termsError}>{fieldErrors.terms}</Text> : null}

            <TouchableOpacity style={[s.darkBtn, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <Ionicons name="hourglass-outline" size={18} color="#FFFFFF" />
                : <Text style={s.darkBtnText}>{tr.welCreate}</Text>}
            </TouchableOpacity>

            <View style={s.switchRow}>
              <Text style={s.switchText}>{tr.authHaveAccount}</Text>
              <TouchableOpacity onPress={() => navigation.navigateDeprecated('Login')} activeOpacity={0.7}>
                <Text style={s.switchLink}>{tr.welLogin}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.noteRow}>
              <Ionicons name="lock-closed-outline" size={13} color="#6B7280" />
              <Text style={s.noteText}>{tr.welPrivate}</Text>
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

  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -4, marginBottom: 16, paddingHorizontal: 4 },
  strengthBars: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthBar:  { flex: 1, height: 6, borderRadius: 3 },
  strengthText: { fontSize: 12, minWidth: 80, textAlign: 'right', fontFamily: 'Inter_700Bold' },

  termsRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, marginBottom: 16, paddingHorizontal: 2 },
  checkbox:       { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: '#9CA3AF', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  checkboxActive: { backgroundColor: INK, borderColor: INK },
  termsText:      { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20, fontFamily: 'Inter_500Medium' },
  termsLink:      { color: INK, fontFamily: 'Inter_700Bold', textDecorationLine: 'underline' },
  termsError:     { fontSize: 12, color: '#DC2626', marginTop: -8, marginBottom: 12, marginLeft: 40 },

  noteRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 18 },
  noteText: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },
});
