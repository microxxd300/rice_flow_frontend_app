import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, TextInput, useWindowDimensions,
  type KeyboardTypeOptions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PHOTO_RATIO } from '@/utils/welcomeLayout';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const FieldPhoto  = require('../assets/bg/rice_field.jpg');
const LogoWhite   = require('../assets/logo/logo_white.png');
const BANNER_H    = 170;
const HORIZON     = 0.6;           // how far down the photo the horizon sits

/**
 * Log in and Create account, in the landing page's look: a strip of the same rice field
 * photo with a round back button, then a big title and one line under it.
 */
export const AuthHeader: React.FC<{ title: string; sub: string; onBack: () => void }> = ({ title, sub, onBack }) => {
  const { width } = useWindowDimensions();
  const { top }   = useSafeAreaInsets();
  const bannerH   = BANNER_H + top;
  const photoH    = width * PHOTO_RATIO;
  return (
    <>
      <View style={[h.banner, { height: bannerH }]}>
        {/* Centred on the horizon (about 60% down the photo): sunrise, palms and field */}
        <Image source={FieldPhoto} style={[h.photo, { width, height: photoH, top: bannerH / 2 - photoH * HORIZON }]} resizeMode="cover" />
        <TouchableOpacity style={[h.back, { top: top + 12 }]} onPress={onBack} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Image source={LogoWhite} style={[h.brand, { top: top + 10 }]} resizeMode="contain" />
      </View>
      <View style={h.titles}>
        <Text style={h.title}>{title}</Text>
        <Text style={h.sub}>{sub}</Text>
      </View>
    </>
  );
};

/** A white rounded field with a label, an icon, and its error under it. */
export const AuthField: React.FC<{
  label:          string;
  value:          string;
  onChangeText:   (v: string) => void;
  icon:           IconName;
  placeholder?:   string;
  keyboardType?:  KeyboardTypeOptions;
  autoCapitalize?:'none' | 'words' | 'sentences';
  secure?:        boolean;
  editable?:      boolean;
  rightSlot?:     React.ReactNode;
  error?:         string;
}> = ({ label, value, onChangeText, icon, placeholder, keyboardType, autoCapitalize, secure, editable, rightSlot, error }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.box, focused && f.boxFocused, !!error && f.boxError]}>
        <Ionicons name={icon} size={19} color={focused ? '#111827' : '#9CA3AF'} />
        <TextInput
          style={f.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType ?? 'default'}
          secureTextEntry={secure}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={false}
          editable={editable}
        />
        {rightSlot}
      </View>
      {!!error && <Text style={f.error}>{error}</Text>}
    </View>
  );
};

/** The red message at the top of a form. */
export const AuthErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <View style={b.errorBanner}>
    <Ionicons name="alert-circle" size={18} color="#B91C1C" />
    <Text style={b.errorText}>{message}</Text>
  </View>
);

/** The dark full-width button that submits a form. */
export const AuthSubmitButton: React.FC<{ label: string; loading: boolean; onPress: () => void }> = ({ label, loading, onPress }) => (
  <TouchableOpacity style={[b.submit, loading && b.submitBusy]} onPress={onPress} disabled={loading} activeOpacity={0.85} accessibilityRole="button">
    {loading
      ? <Ionicons name="hourglass-outline" size={18} color="#FFFFFF" />
      : <Text style={b.submitText}>{label}</Text>}
  </TouchableOpacity>
);

const b = StyleSheet.create({
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FDECEC', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 },
  errorText:   { flex: 1, fontSize: 13, color: '#B91C1C', fontFamily: 'Inter_600SemiBold' },
  submit:      { height: 56, borderRadius: 20, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  submitBusy:  { opacity: 0.6 },
  submitText:  { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
});

const SHADOW = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;

const h = StyleSheet.create({
  banner:    { width: '100%', overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: '#1F2937' },
  photo:     { position: 'absolute', left: 0 },
  back:      { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  // the white logo: 720 × 515
  brand:     { position: 'absolute', right: 18, width: 84, height: 84 * (515 / 720) },
  titles:    { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 18 },
  title:     { fontSize: 32, lineHeight: 38, color: '#111827', fontFamily: 'Inter_700Bold', letterSpacing: -0.8 },
  sub:       { fontSize: 15, color: '#6B7280', fontFamily: 'Inter_500Medium', marginTop: 6, lineHeight: 21 },
});

const f = StyleSheet.create({
  wrap:       { marginBottom: 14 },
  label:      { fontSize: 14, color: '#111827', fontFamily: 'Inter_700Bold', marginBottom: 8 },
  box:        {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16,
    borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'transparent', ...SHADOW,
  },
  boxFocused: { borderColor: '#111827' },
  boxError:   { borderColor: '#DC2626' },
  input:      { flex: 1, fontSize: 16, color: '#111827', paddingVertical: 12, fontFamily: 'Inter_500Medium' },
  error:      { fontSize: 12, color: '#DC2626', marginTop: 6, fontFamily: 'Inter_500Medium' },
});
