import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TextInput as RNTextInput, TouchableOpacity, Modal, Pressable, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '@/features/auth/store';

const PANABO_BARANGAYS = [
  'A.O. Floirendo', 'Buenavista', 'Cacao', 'Cagangohan', 'Consolacion',
  'Dapco', 'Datu Abdul Dadia', 'Gredu', 'J.P. Laurel', 'Kasilak',
  'Katipunan', 'Katualan', 'Kauswagan', 'Kiotoy', 'Little Panay',
  'Lower Panaga', 'Mabunao', 'Malativas', 'Manay', 'Nanyo',
  'New Malaga', 'New Malitbog', 'New Pandan', 'New Visayas', 'Quezon',
  'Salvacion', 'San Francisco', 'San Nicolas', 'San Pedro', 'San Roque',
  'San Vicente', 'Santa Cruz', 'Santo Niño', 'Sindaton', 'Southern Davao',
  'Tagpore', 'Tibungol', 'Upper Licanan', 'Waterfall',
];

type Nav = StackNavigationProp<any>;

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { register } = useAuthStore();

  const [fullName,        setFullName]        = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [barangay,        setBarangay]        = useState('');
  const [municipality,    setMunicipality]    = useState('Panabo City');
  const [province,        setProvince]        = useState('Davao del Norte');
  const [showPw,          setShowPw]          = useState(false);
  const [showCPw,         setShowCPw]         = useState(false);
  const [agreed,          setAgreed]          = useState(false);
  const [submitted,       setSubmitted]       = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [barangayOpen,    setBarangayOpen]    = useState(false);

  const pwMismatch = submitted && confirmPassword.length > 0 && password !== confirmPassword;

  const isValid =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    password === confirmPassword &&
    agreed;

  const handleRegister = async () => {
    setSubmitted(true);
    setError(null);
    if (!isValid || loading) return;
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
        barangay:     barangay.trim(),
        municipality: municipality.trim(),
        province:     province.trim(),
      });
      navigation.navigate('Login' as never);
    } catch (err: any) {
      const data   = err?.response?.data;
      const status = err?.response?.status;
      let msg: string;
      if (data && typeof data === 'object') {
        // Pull first useful message from DRF-style { field: [errors] } or { detail }
        const detail = data.detail || data.error;
        if (detail) {
          msg = String(detail);
        } else {
          const firstField = Object.entries(data).find(([, v]) => Array.isArray(v) && v.length);
          msg = firstField
            ? `${firstField[0]}: ${(firstField[1] as any[])[0]}`
            : 'Could not register. Please check your details and try again.';
        }
      } else if (!err?.response) {
        msg = 'Can’t reach the server. Check your internet connection.';
      } else if (status === 400) {
        msg = 'That email may already be registered, or some fields are invalid.';
      } else {
        msg = err?.message || 'Could not register. Please try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Password strength meter (0–4 thin bars)
  const len   = password.length;
  const score = [len >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  const strengthLabel = ['', 'Weak', 'Fair', 'Strong', 'Very strong'][score];
  const strengthColor = ['', '#DC2626', '#D97706', '#059669', '#0F4C28'][score];

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* Header — minimal: back chevron + page title */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Create account</Text>
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

          {/* About you */}
          <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Juan Dela Cruz" autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="juan@example.com" autoCapitalize="none" keyboardType="email-address" />

          {/* Security */}
          <View style={s.groupGap} />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            autoCapitalize="none"
            secure={!showPw}
            rightSlot={
              <TouchableOpacity onPress={() => setShowPw(v => !v)} activeOpacity={0.7} style={s.eye}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            }
          />

          {password.length > 0 && (
            <View style={s.strengthWrap}>
              <View style={s.strengthBars}>
                {[1, 2, 3, 4].map(i => (
                  <View key={i} style={[s.strengthBar, { backgroundColor: i <= score ? strengthColor : '#E5E7EB' }]} />
                ))}
              </View>
              <Text style={[s.strengthText, { color: strengthColor }]}>{strengthLabel}</Text>
            </View>
          )}

          <Field
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter password"
            autoCapitalize="none"
            secure={!showCPw}
            error={pwMismatch ? "Passwords don't match" : undefined}
            rightSlot={
              <TouchableOpacity onPress={() => setShowCPw(v => !v)} activeOpacity={0.7} style={s.eye}>
                <Ionicons name={showCPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            }
          />

          {/* Location — Panabo, Davao del Norte */}
          <View style={s.groupGap} />

          {/* Barangay — dropdown of 39 official Panabo barangays */}
          <View style={f.wrap}>
            <Text style={f.label}>Barangay</Text>
            <TouchableOpacity
              style={[f.box, barangayOpen && f.boxFocused]}
              activeOpacity={0.7}
              onPress={() => setBarangayOpen(true)}
            >
              <Text style={[f.input, !barangay && { color: '#D1D5DB' }]}>
                {barangay || 'Select your barangay'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Field label="City / Municipality" value={municipality} onChangeText={setMunicipality} placeholder="Panabo City"        autoCapitalize="words" />
          <Field label="Province"            value={province}     onChangeText={setProvince}     placeholder="Davao del Norte"   autoCapitalize="words" />

          {/* Terms */}
          <TouchableOpacity style={s.termsRow} onPress={() => setAgreed(v => !v)} activeOpacity={0.7}>
            <View style={[s.checkbox, agreed && s.checkboxActive]}>
              {agreed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
            </View>
            <Text style={s.termsText}>
              I agree to the{' '}
              <Text style={s.termsLink}>Terms</Text>
              {' '}and{' '}
              <Text style={s.termsLink}>Privacy Policy</Text>.
            </Text>
          </TouchableOpacity>

          {/* Submit + Cancel — same primary/ghost vocabulary as the rest of the app */}
          <View style={s.actions}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, (!isValid || loading) && { opacity: 0.55 }]}
              onPress={handleRegister}
              disabled={loading || !isValid}
              activeOpacity={0.85}
            >
              {loading
                ? <Ionicons name="hourglass-outline" size={18} color="#FFFFFF" />
                : <Text style={s.saveBtnText}>Create account</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={s.loginRow}>
            <Text style={s.loginText}>Already have an account?  </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={s.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.noteText}>
            Your information stays private and is used only for farm recommendations.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barangay picker modal */}
      <Modal
        visible={barangayOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBarangayOpen(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setBarangayOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Barangay</Text>
              <Text style={s.modalSub}>Panabo City, Davao del Norte</Text>
            </View>
            <FlatList
              data={PANABO_BARANGAYS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.modalItem, barangay === item && s.modalItemActive]}
                  onPress={() => { setBarangay(item); setBarangayOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.modalItemText, barangay === item && s.modalItemTextActive]}>{item}</Text>
                  {barangay === item && <Ionicons name="checkmark" size={16} color="#059669" />}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

/* ── Plain label-above input (no floating label gimmick, no decorative icons) ── */
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secure?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  rightSlot?: React.ReactNode;
  error?: string;
}

const Field: React.FC<FieldProps> = ({
  label, value, onChangeText, placeholder,
  keyboardType, secure, autoCapitalize, rightSlot, error,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.box, focused && f.boxFocused, error && f.boxError]}>
        <RNTextInput
          style={f.input}
          placeholder={placeholder}
          placeholderTextColor="#D1D5DB"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType ?? 'default'}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={false}
        />
        {rightSlot}
      </View>
      {error && <Text style={f.errorText}>{error}</Text>}
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
  boxError:   { borderColor: '#DC2626' },
  input:      { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 12 },
  errorText:  { fontSize: 11, color: '#DC2626', marginTop: 4 },
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

  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  /* Subtle spacing between field groups — replaces the old per-section titles */
  groupGap: { height: 12 },

  eye: { padding: 4 },

  /* Password strength */
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -8, marginBottom: 16 },
  strengthBars: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthBar:  { flex: 1, height: 3, borderRadius: 2 },
  strengthText: { fontSize: 11, fontWeight: '700', minWidth: 80, textAlign: 'right' },

  /* Terms */
  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginTop: 22, marginBottom: 18,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: '#D1D5DB',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginTop: 1, backgroundColor: '#FFFFFF',
  },
  checkboxActive: { backgroundColor: '#059669', borderColor: '#059669' },
  termsText:      { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  termsLink:      { color: '#059669', fontWeight: '600' },

  /* Actions — primary/ghost pair, same as modal Save/Cancel */
  actions:  { flexDirection: 'row', gap: 10, marginBottom: 24 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  saveBtn: {
    flex: 1, height: 50, borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  /* Login link */
  loginRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  loginText: { fontSize: 13, color: '#6B7280' },
  loginLink: { fontSize: 13, fontWeight: '700', color: '#059669' },

  noteText: {
    fontSize: 11, color: '#9CA3AF',
    textAlign: 'center', lineHeight: 16, paddingHorizontal: 12,
  },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, color: '#B91C1C', fontWeight: '600' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24,
    maxHeight: '78%',
  },
  modalHeader: { marginBottom: 12, paddingHorizontal: 4 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalSub:   { fontSize: 12, color: '#6B7280', marginTop: 2 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  modalItemActive: { backgroundColor: '#F0FDF4' },
  modalItemText: { fontSize: 14, color: '#111827' },
  modalItemTextActive: { fontWeight: '700', color: '#059669' },
});
