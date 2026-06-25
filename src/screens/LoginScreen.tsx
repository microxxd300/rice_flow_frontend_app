import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, TextInput as RNTextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '@/features/auth/store';

type Nav = StackNavigationProp<any>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { login: authLogin } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const isValid = username.trim().length > 0 && password.length > 0;
  const toEmail = (u: string) => u.includes('@') ? u.trim() : `${u.trim()}@georice.app`;

  const handleLogin = () => {
    if (!isValid || loading) return;
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
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Sign in</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Error banner */}
          {error && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#B91C1C" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Username */}
          <Field
            label="Username or email"
            value={username}
            onChangeText={(v) => { setUsername(v); if (error) setError(null); }}
            placeholder="juanfarm"
            autoCapitalize="none"
            editable={!loading}
          />

          {/* Password */}
          <Field
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); if (error) setError(null); }}
            placeholder="Enter your password"
            autoCapitalize="none"
            secure={!showPw}
            editable={!loading}
            rightSlot={
              <TouchableOpacity onPress={() => setShowPw(v => !v)} activeOpacity={0.7} style={s.eye}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            }
          />

          {/* Forgot link */}
          <TouchableOpacity style={s.forgotBtn} onPress={() => {}} activeOpacity={0.7}>
            <Text style={s.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Primary action — same vocabulary as the rest of the app */}
          <TouchableOpacity
            style={[s.saveBtn, (!isValid || loading) && { opacity: 0.55 }]}
            onPress={handleLogin}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <Ionicons name="hourglass-outline" size={18} color="#FFFFFF" />
              : <Text style={s.saveBtnText}>Log in</Text>
            }
          </TouchableOpacity>

          {/* Register link */}
          <View style={s.registerRow}>
            <Text style={s.registerText}>New here?  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={s.registerLink}>Create an account</Text>
            </TouchableOpacity>
          </View>

          {/* Demo helper — small text-only link */}
          <TouchableOpacity
            style={s.demoBtn}
            onPress={() => { setUsername('demo'); setPassword('demo1234'); }}
            activeOpacity={0.7}
          >
            <Text style={s.demoBtnText}>Use demo account</Text>
          </TouchableOpacity>

        </ScrollView>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ── Plain label-above input (matches RegisterScreen) ── */
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  editable?: boolean;
  rightSlot?: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({
  label, value, onChangeText, placeholder, secure, autoCapitalize, editable, rightSlot,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.box, focused && f.boxFocused]}>
        <RNTextInput
          style={f.input}
          placeholder={placeholder}
          placeholderTextColor="#D1D5DB"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={false}
          editable={editable}
        />
        {rightSlot}
      </View>
    </View>
  );
};

const f = StyleSheet.create({
  wrap:  { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  box: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, minHeight: 50, backgroundColor: '#FFFFFF',
  },
  boxFocused: { borderColor: '#059669' },
  input:      { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 12 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  backBtn:     { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  eye: { padding: 4 },

  forgotBtn:  { alignSelf: 'flex-end', marginTop: 2, marginBottom: 24 },
  forgotText: { fontSize: 12, fontWeight: '600', color: '#059669' },

  /* Primary button — matches modal Save / Register Create-account / Welcome Log-in */
  saveBtn: {
    height: 50, borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  registerRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  registerText: { fontSize: 13, color: '#6B7280' },
  registerLink: { fontSize: 13, fontWeight: '700', color: '#059669' },

  demoBtn:     { alignSelf: 'center', marginTop: 18, paddingVertical: 6 },
  demoBtnText: { fontSize: 12, color: '#9CA3AF', textDecorationLine: 'underline' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, color: '#B91C1C', fontWeight: '600' },
});
