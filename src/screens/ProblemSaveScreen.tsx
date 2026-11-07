import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { apiProgress } from '@/services/apiService';
import { fetchActiveCycleLogs, mergeLogs } from '@/utils/progressLogs';
import { useAppStore } from '@/store/appStore';
import { StepHeader } from '@/components/AdviceParts';
import type { Severity } from './ProblemCardScreen';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Step 3 of a problem in the field: what the farmer did, saved to the crop's field log. */
export const ProblemSaveScreen: React.FC = () => {
  const tr = useTranslation();
  const navigation = useNavigation<any>();
  const params = (useRoute<any>().params ?? {}) as {
    problemKey: string; name: string; severity: Severity | null; description?: string;
  };
  const farmId = useSelectedFarm()?.id;
  const [action, setAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [noCycle, setNoCycle] = useState(false);
  const [failed, setFailed] = useState(false);

  const sevWord = params.severity === 'high' ? tr.sevHigh
    : params.severity === 'medium' ? tr.sevMedium : params.severity === 'low' ? tr.sevLow : '';

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      const { cycle } = await fetchActiveCycleLogs(farmId);
      if (!cycle) { setNoCycle(true); return; }
      await apiProgress.createLog({
        farm_cycle: cycle.id,
        log_date: today(),
        observation: params.description || params.name,
        problem_key: params.problemKey,
        severity: params.severity ?? '',
        action_taken: action.trim(),
      });
      // Progress shows the new log straight away
      fetchActiveCycleLogs(farmId)
        .then(({ logs }) => useAppStore.getState().setProgressLogs(mergeLogs(logs, useAppStore.getState().progressLogs)))
        .catch(() => {});
      setSaved(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  // Back out of the whole problem flow, to wherever it was opened from
  const done = () => navigation.pop(3);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StepHeader step={3} title={tr.probSaveTitle} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <View style={s.summary}>
            <Text style={s.name}>{params.name}</Text>
            {!!sevWord && (
              <View style={[s.sev, params.severity === 'high' && s.sevHigh]}>
                <Text style={[s.sevText, params.severity === 'high' && s.sevTextHigh]}>{sevWord}</Text>
              </View>
            )}
          </View>
          {!!params.description && <Text style={s.desc}>“{params.description}”</Text>}
        </View>

        {saved ? (
          <View style={[s.card, s.done]}>
            <Ionicons name="checkmark-circle" size={44} color={LOOK.green} />
            <Text style={s.doneTitle}>{tr.probSaved}</Text>
            <Text style={s.doneSub}>{tr.probSavedSub}</Text>
          </View>
        ) : noCycle ? (
          <View style={s.card}><Text style={s.muted}>{tr.probNoCycle}</Text></View>
        ) : (
          <View style={s.card}>
            <TextInput style={s.input} value={action} onChangeText={setAction} multiline maxLength={300}
              placeholder={tr.probActionPlaceholder} placeholderTextColor="#9CA3AF" />
            {failed && <Text style={[s.muted, { marginTop: 8 }]}>{tr.probLoadError}</Text>}
          </View>
        )}
      </ScrollView>

      <View style={s.footer}>
        {saved || noCycle ? (
          <TouchableOpacity style={s.btn} onPress={done} activeOpacity={0.85}>
            <Text style={s.btnText}>{tr.probDone}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.btn} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.btnText}>{tr.probSaveBtn}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const shadow = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14,
                 shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: LOOK.page },
  scroll:      { padding: 20, paddingTop: 4, gap: 12 },
  card:        { ...shadow, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18 },
  summary:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name:        { flex: 1, fontSize: 18, fontWeight: '800', color: LOOK.ink },
  desc:        { fontSize: 14, color: LOOK.soft, marginTop: 8, lineHeight: 20 },
  sev:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F3F4F6' },
  sevHigh:     { backgroundColor: '#FEE2E2' },
  sevText:     { fontSize: 12, fontWeight: '700', color: LOOK.ink },
  sevTextHigh: { color: '#B91C1C' },
  input:       { minHeight: 110, borderRadius: 16, backgroundColor: LOOK.page, padding: 14, fontSize: 15,
                 color: LOOK.ink, textAlignVertical: 'top' },
  muted:       { fontSize: 14, color: LOOK.soft, lineHeight: 20 },
  done:        { alignItems: 'center', paddingVertical: 28, gap: 8 },
  doneTitle:   { fontSize: 18, fontWeight: '800', color: LOOK.ink },
  doneSub:     { fontSize: 14, color: LOOK.soft, textAlign: 'center', lineHeight: 20 },
  footer:      { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12 },
  btn:         { height: 54, borderRadius: 18, backgroundColor: LOOK.ink, alignItems: 'center', justifyContent: 'center' },
  btnText:     { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
