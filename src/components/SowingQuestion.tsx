import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppStore } from '@/store/appStore';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/i18n/useTranslation';
import { useAccessibility } from '@/context/AccessibilityContext';
import { answerSowing } from '@/services/guideLoader';
import { daysAgoISO, sowingQuestionDue } from '@/utils/sowing';

/** "Nov 14" from YYYY-MM-DD, in the app language's month names. */
export function shortDate(iso: string | null | undefined, tr: any): string {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  if (!y || !m || !d) return '';
  const months = [tr.monShortJan, tr.monShortFeb, tr.monShortMar, tr.monShortApr, tr.monShortMay, tr.monShortJun,
                  tr.monShortJul, tr.monShortAug, tr.monShortSep, tr.monShortOct, tr.monShortNov, tr.monShortDec];
  return `${months[m - 1]} ${d}`;
}

const EARLIER_DAYS = [1, 2, 3, 5, 7];

/**
 * "Did you sow already?" From the planned sowing day until the farmer answers. One tap:
 * the server moves the plan and the crop cycle to the real sowing day, or 3 days later
 * for "Not yet" (see utils/sowing and the backend's guides/sowing.py).
 */
export const SowingQuestion: React.FC = () => {
  const tr = useTranslation();
  const T = useAccessibility().isLargeText;
  const language  = useLanguageStore(s => s.language);
  const guide     = useAppStore(s => s.latestGuide) as any;
  const completed = useAppStore(s => s.completedGuideSteps);
  const [busy, setBusy]       = useState(false);
  const [earlier, setEarlier] = useState(false);

  if (!sowingQuestionDue(guide, completed)) return null;

  const send = async (sown: boolean, date?: string) => {
    setBusy(true);
    try {
      await answerSowing(sown, date, language);
      setEarlier(false);
    } catch {
      Alert.alert(tr.sowAskTitle, tr.sowFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Ionicons name="calendar-outline" size={18} color="#059669" />
        <Text style={[s.title, T && { fontSize: 17 }]}>{tr.sowAskTitle}</Text>
      </View>
      <Text style={[s.body, T && { fontSize: 14, lineHeight: 21 }]}>
        {tr.sowAskBody.replace('{date}', shortDate(guide?.start_date, tr))}
      </Text>

      {busy ? (
        <ActivityIndicator color="#059669" style={{ marginVertical: 12 }} />
      ) : earlier ? (
        <>
          <Text style={[s.when, T && { fontSize: 14 }]}>{tr.sowWhen}</Text>
          <View style={s.chips}>
            {EARLIER_DAYS.map(n => (
              <TouchableOpacity key={n} style={s.chip} onPress={() => send(true, daysAgoISO(n))} activeOpacity={0.8}>
                <Text style={[s.chipText, T && { fontSize: 14 }]}>
                  {n === 1 ? tr.sowYesterday : tr.sowDaysAgo.replace('{n}', String(n))}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : (
        <View style={s.buttons}>
          <TouchableOpacity style={[s.btn, s.btnMain]} onPress={() => send(true, daysAgoISO(0))} activeOpacity={0.85}>
            <Text style={[s.btnMainText, T && { fontSize: 15 }]}>{tr.sowYesToday}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={() => setEarlier(true)} activeOpacity={0.85}>
            <Text style={[s.btnText, T && { fontSize: 15 }]}>{tr.sowYesEarlier}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btn} onPress={() => send(false)} activeOpacity={0.85}>
            <Text style={[s.btnText, T && { fontSize: 15 }]}>{tr.sowNotYet}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: '#ECFDF5', borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0',
    padding: 14, marginTop: 16,
  },
  head:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '700', color: '#065F46' },
  body:  { fontSize: 12.5, lineHeight: 19, color: '#065F46' },
  when:  { fontSize: 12.5, fontWeight: '600', color: '#065F46', marginTop: 12, marginBottom: 8 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: {
    flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: '#A7F3D0',
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  btnMain:     { backgroundColor: '#059669', borderColor: '#059669' },
  btnText:     { fontSize: 13, fontWeight: '600', color: '#065F46', textAlign: 'center' },
  btnMainText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 9999, borderWidth: 1, borderColor: '#A7F3D0', backgroundColor: '#FFFFFF',
    paddingVertical: 8, paddingHorizontal: 14,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#065F46' },
});
