import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export const SETUP_STEPS = 4;

/**
 * The farm setup screens' header, in the app's new look: a round back button, a big
 * title, and (on the four steps) a bar of four parts showing how far the farmer is.
 */
export const SetupHeader: React.FC<{
  title:   string;
  step?:   number;            // 1..4; leave out on the screens before and after the steps
  onBack?: () => void;        // leave out to hide the back button
  stepLabel?: string;         // "Step {n} of {total}"
}> = ({ title, step, onBack, stepLabel }) => (
  <View style={s.wrap}>
    <View style={s.topRow}>
      {onBack ? (
        <TouchableOpacity style={s.back} onPress={onBack} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
      ) : <View style={{ height: 42 }} />}
      {step != null && (
        <Text style={s.stepText}>
          {(stepLabel ?? 'Step {n} of {total}').replace('{n}', String(step)).replace('{total}', String(SETUP_STEPS))}
        </Text>
      )}
    </View>
    <Text style={s.title}>{title}</Text>
    {step != null && (
      <View style={s.bar}>
        {Array.from({ length: SETUP_STEPS }, (_, i) => (
          <View key={i} style={[s.seg, i < step && s.segDone]} />
        ))}
      </View>
    )}
  </View>
);

const s = StyleSheet.create({
  wrap:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  topRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  stepText: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  title:    { fontSize: 28, lineHeight: 34, color: '#111827', fontFamily: 'Inter_700Bold', letterSpacing: -0.6, marginTop: 14 },
  bar:      { flexDirection: 'row', gap: 6, marginTop: 14 },
  seg:      { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E4E6E4' },
  segDone:  { backgroundColor: '#059669' },
});
