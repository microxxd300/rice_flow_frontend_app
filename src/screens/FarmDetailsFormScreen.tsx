import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  TextInput as RNTextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppStore } from '@/store/appStore';

type Nav = StackNavigationProp<any>;

export const FarmDetailsFormScreen: React.FC = () => {
  const navigation  = useNavigation<Nav>();
  const userProfile = useAppStore(s => s.user);

  const [farmName, setFarmName] = useState('');
  const [area,     setArea]     = useState('');

  // Remember this step so an interrupted setup resumes here after the app reopens
  const setSetupProgress = useAppStore(s => s.setSetupProgress);
  useEffect(() => { setSetupProgress('FarmDetailsForm', {}); }, []);

  const barangay     = userProfile?.barangay    || '';
  const municipality = userProfile?.municipality || '';
  const province     = userProfile?.province    || '';
  const accountLoc   = [barangay, municipality, province].filter(Boolean).join(', ');

  const isValid = Boolean(farmName.trim());

  const handleContinue = () => {
    navigation.navigate('LocationPermission', {
      farmData: { farmName, barangay, municipality, province, area },
    });
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        {/* Header — back chevron + page title + step indicator */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Farm details</Text>
          <Text style={s.stepText}>1 / 4</Text>
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <Text style={s.lead}>What should we call this farm, and how big is it?</Text>

          <Field
            label="Farm name"
            value={farmName}
            onChangeText={setFarmName}
            placeholder="e.g. Santos Family Farm"
            required
            autoCapitalize="words"
          />
          <Field
            label="Area"
            value={area}
            onChangeText={setArea}
            placeholder="e.g. 2.5"
            keyboardType="decimal-pad"
            unit="ha"
          />

          {/* Account location — read-only, plain row, no decorative chip */}
          {accountLoc ? (
            <View style={s.accountLoc}>
              <Text style={s.accountLocLabel}>Account location</Text>
              <Text style={s.accountLocValue} numberOfLines={2}>{accountLoc}</Text>
            </View>
          ) : null}

        </ScrollView>

        {/* Footer — primary action with subtle hint */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.saveBtn, !isValid && { opacity: 0.55 }]}
            onPress={handleContinue}
            disabled={!isValid}
            activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

/* ── Plain label-above field (matches Login / Register) ── */
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  unit?: string;
  required?: boolean;
}

const Field: React.FC<FieldProps> = ({
  label, value, onChangeText, placeholder, keyboardType, autoCapitalize, unit, required,
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.wrap}>
      <Text style={f.label}>
        {label}{required && <Text style={f.req}> *</Text>}
      </Text>
      <View style={[f.box, focused && f.boxFocused]}>
        <RNTextInput
          style={f.input}
          placeholder={placeholder}
          placeholderTextColor="#D1D5DB"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          autoCorrect={false}
        />
        {unit ? <Text style={f.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
};

const f = StyleSheet.create({
  wrap:  { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  req:   { color: '#DC2626' },
  box: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, minHeight: 50, backgroundColor: '#FFFFFF',
  },
  boxFocused: { borderColor: '#059669' },
  input:      { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 12 },
  unit:       { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
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
  stepText:    { width: 32, textAlign: 'right', fontSize: 12, fontWeight: '600', color: '#9CA3AF' },

  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  lead:   { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 22 },

  accountLoc: {
    marginTop: 14, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6',
  },
  accountLocLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  accountLocValue: { fontSize: 13, color: '#374151', fontWeight: '500' },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    height: 50, borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});
