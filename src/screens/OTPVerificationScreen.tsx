import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAccessibility } from '../context/AccessibilityContext';

type Nav = NativeStackNavigationProp<any>;

const OTP_LENGTH = 6;

export const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<any>();
  const { isLargeText } = useAccessibility();
  const T = isLargeText;

  const phoneNumber: string = route.params?.phoneNumber ?? '+63 912 345 6789';

  const [otp,     setOtp]     = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const inputs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));

  const handleDigit = (text: string, index: number) => {
    if (!/^\d*$/.test(text)) return;
    const next = [...otp];
    next[index] = text.slice(-1);
    setOtp(next);
    if (text && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (next.every(d => d !== '') && text) handleVerify(next.join(''));
  };

  const handleBackspace = (key: string, index: number) => {
    if (key !== 'Backspace') return;
    if (otp[index] === '' && index > 0) inputs.current[index - 1]?.focus();
    const next = [...otp];
    next[index] = '';
    setOtp(next);
  };

  const handleVerify = (code?: string) => {
    const finalCode = code ?? otp.join('');
    if (finalCode.length < OTP_LENGTH || loading) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setVerified(true);
      setTimeout(() => navigation.navigate('App' as never), 800);
    }, 1400);
  };

  const handleResend = () => {
    setOtp(Array(OTP_LENGTH).fill(''));
    inputs.current[0]?.focus();
  };

  const isComplete = otp.every(d => d !== '');

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>

          {/* Icon */}
          {verified ? (
            <LinearGradient colors={['#27AE60', '#1E8449']} style={s.iconCircle}>
              <Ionicons name="checkmark" size={44} color="#FFFFFF" />
            </LinearGradient>
          ) : (
            <LinearGradient colors={['#059669', '#0F5C35']} style={s.iconCircle}>
              <Ionicons name="phone-portrait-outline" size={36} color="#FFFFFF" />
            </LinearGradient>
          )}

          <Text style={[s.title, T && { fontSize: 28 }]}>
            {verified ? 'Na-verify Na!' : 'Kumpirmahin ang Numero'}
          </Text>
          <Text style={[s.subtitle, T && { fontSize: 16 }]}>
            {verified
              ? 'Maligayang pagdating sa RiceFlow!'
              : <>Nagpadala kami ng 6-digit na code sa{'\n'}<Text style={s.phone}>{phoneNumber}</Text></>
            }
          </Text>

          {/* OTP boxes */}
          {!verified && (
            <View style={s.otpRow}>
              {Array(OTP_LENGTH).fill(null).map((_, i) => (
                <TextInput
                  key={i}
                  ref={ref => { inputs.current[i] = ref; }}
                  style={[s.otpBox, otp[i] ? s.otpBoxFilled : null]}
                  value={otp[i]}
                  onChangeText={text => handleDigit(text, i)}
                  onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  caretHidden
                  editable={!loading}
                />
              ))}
            </View>
          )}

          {/* Resend */}
          {!verified && (
            <View style={s.resendRow}>
              <Text style={[s.resendLabel, T && { fontSize: 15 }]}>Hindi natanggap? </Text>
              <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                <Text style={[s.resendLink, T && { fontSize: 15 }]}>Magpadala Ulit</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Verify button */}
          {!verified && (
            <TouchableOpacity
              style={[s.verifyBtn, (!isComplete || loading) && s.verifyBtnDisabled]}
              onPress={() => handleVerify()}
              disabled={!isComplete || loading}
              activeOpacity={0.85}
            >
              <Ionicons
                name={loading ? 'hourglass-outline' : 'checkmark-circle'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={[s.verifyBtnText, T && { fontSize: 17 }]}>
                {loading ? 'Sinusuri...' : 'Kumpirmahin ang Code'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Wrong number */}
          {!verified && (
            <TouchableOpacity style={s.changeRow} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={[s.changeText, T && { fontSize: 14 }]}>Mali ang numero? </Text>
              <Text style={[s.changeLink, T && { fontSize: 14 }]}>Baguhin</Text>
            </TouchableOpacity>
          )}

          {/* Privacy note */}
          {!verified && (
            <View style={s.noteCard}>
              <Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" />
              <Text style={[s.noteText, T && { fontSize: 13 }]}>
                Ginagamit lamang ang inyong numero para sa pag-verify. Hindi ito ibabahagi sa iba.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F7F9F8' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center', paddingTop: 16 },

  backBtn: { alignSelf: 'flex-start', padding: 4, marginBottom: 32 },

  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 16, elevation: 6,
  },

  title: {
    fontSize: 26, fontWeight: '700', color: '#1A1A2E',
    letterSpacing: -0.5, textAlign: 'center', marginBottom: 10,
  },
  subtitle: {
    fontSize: 15, color: '#6B7280', textAlign: 'center',
    lineHeight: 22, marginBottom: 40,
  },
  phone: { fontWeight: '700', color: '#1A1A2E' },

  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  otpBox: {
    width: 48, height: 58, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#1A1A2E',
    shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  otpBoxFilled: { borderColor: '#059669', backgroundColor: '#F0FDF8' },

  resendRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  resendLabel: { fontSize: 14, color: '#6B7280' },
  resendLink:  { fontSize: 14, fontWeight: '700', color: '#059669' },

  verifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#059669', height: 56, borderRadius: 14, width: '100%',
    marginBottom: 16,
    shadowColor: '#059669', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  verifyBtnDisabled: { backgroundColor: '#A8C5B5', elevation: 0, shadowOpacity: 0 },
  verifyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },

  changeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  changeText: { fontSize: 13, color: '#6B7280' },
  changeLink: { fontSize: 13, fontWeight: '700', color: '#059669' },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, width: '100%',
    shadowColor: '#1A1A2E', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  noteText: { flex: 1, fontSize: 12, color: '#9CA3AF', lineHeight: 18 },
});
