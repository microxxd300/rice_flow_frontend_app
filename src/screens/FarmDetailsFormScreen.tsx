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
import { goBackFromStep } from '@/utils/navigation';
import { SetupHeader } from '@/components/SetupHeader';

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
    navigation.navigateDeprecated('LocationPermission', {
      farmData: { farmName, barangay, municipality, province, area },
    });
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        <SetupHeader title="Farm details" step={1} onBack={() => goBackFromStep(navigation, 'FarmDetailsForm')} />

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
            label="Farm size"
            value={area}
            onChangeText={setArea}
            placeholder="e.g. 2.5"
            keyboardType="decimal-pad"
            unit="ha"
          />
          {/* Clarify that size is self-reported and only for yield estimates —
              the variety recommendation is derived from GPS location, not area. */}
          <Text style={s.fieldNote}>
            Enter your land size in hectares. This is used only for yield
            estimates — your rice variety recommendation is based on your
            farm's location.
          </Text>

          {/* Account location — read-only, plain row, no decorative chip */}
          {accountLoc ? (
            <View style={s.accountLoc}>
              <View style={s.locTile}><Ionicons name="location-sharp" size={18} color="#059669" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.accountLocLabel}>Account location</Text>
                <Text style={s.accountLocValue} numberOfLines={2}>{accountLoc}</Text>
              </View>
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
          placeholderTextColor="#9CA3AF"
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
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, color: '#111827', marginBottom: 8, fontFamily: 'Inter_700Bold' },
  req:   { color: '#DC2626' },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent', borderRadius: 18, paddingHorizontal: 16, minHeight: 56, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  boxFocused: { borderColor: '#111827' },
  input: { flex: 1, fontSize: 16, color: '#111827', paddingVertical: 12, fontFamily: 'Inter_500Medium' },
  unit: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F2F1' },


  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 24 },
  lead: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 18, paddingHorizontal: 4, fontFamily: 'Inter_500Medium' },
  fieldNote: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginTop: -4, paddingHorizontal: 4 },

  accountLoc: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, padding: 14, backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  locTile: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8F5EF', justifyContent: 'center', alignItems: 'center' },
  accountLocLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2, fontFamily: 'Inter_600SemiBold' },
  accountLocValue: { fontSize: 14, color: '#111827', fontFamily: 'Inter_600SemiBold' },

  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  saveBtn: { height: 56, borderRadius: 20, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
});
