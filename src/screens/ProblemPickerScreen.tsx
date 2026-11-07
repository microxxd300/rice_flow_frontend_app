import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/languageStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { apiAdvice, apiProgress, type ProblemSummary } from '@/services/apiService';
import { fetchActiveCycleLogs } from '@/utils/progressLogs';
import { AiBadge, StepHeader } from '@/components/AdviceParts';

const CATEGORY_ICON: Record<string, any> = {
  pest: 'bug-outline', disease: 'leaf-outline', weather: 'rainy-outline',
  nutrient: 'flask-outline', other: 'help-circle-outline',
};

type Recent = { id: number; key: string; date: string; severity: string };

/**
 * Step 1 of a problem in the field, "What do you see?": describe it (GeoRice AI picks
 * from the booklet list) or pick it. The farmer's recent problems are underneath.
 */
export const ProblemPickerScreen: React.FC = () => {
  const tr = useTranslation();
  const lang = useLanguageStore(st => st.language);
  const navigation = useNavigation<any>();
  const farmId = useSelectedFarm()?.id;
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [finding, setFinding] = useState(false);
  const [matches, setMatches] = useState<{ key: string; name: string; why: string }[] | null>(null);
  const [matchedByAi, setMatchedByAi] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    apiAdvice.problems(lang).then(r => setProblems(r.data)).catch(() => setFailed(true));
  }, [lang]);

  // The problems already logged on the farm's current crop, newest first
  useFocusEffect(useCallback(() => {
    let alive = true;
    fetchActiveCycleLogs(farmId)
      .then(({ cycle }) => (cycle ? apiProgress.listLogs(cycle.id) : null))
      .then(res => {
        if (!alive || !res) return;
        setRecent((res.data as any[])
          .filter(l => l.problem_key)
          .sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)) || b.id - a.id)
          .slice(0, 5)
          .map(l => ({ id: l.id, key: l.problem_key, date: l.log_date, severity: l.severity })));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [farmId]));

  const find = async () => {
    if (!text.trim() || finding) return;
    setFinding(true);
    try {
      const res = (await apiAdvice.match(text.trim(), lang)).data;
      setMatches(res.matches);
      setMatchedByAi(res.ai_used);
    } catch {
      setMatches([]);
    } finally {
      setFinding(false);
    }
  };

  const open = (key: string) => navigation.navigate('ProblemCard', { problemKey: key, description: text.trim() });
  const nameOf = (key: string) => problems?.find(p => p.key === key)?.name ?? key;
  const sevWord = (sev: string) =>
    sev === 'high' ? tr.sevHigh : sev === 'medium' ? tr.sevMedium : sev === 'low' ? tr.sevLow : '';

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StepHeader step={1} title={tr.probPickTitle} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Describe it */}
        <View style={s.card}>
          <Text style={s.label}>{tr.probDescribeLabel}</Text>
          <TextInput style={s.input} value={text} onChangeText={setText} multiline maxLength={400}
            placeholder={tr.probDescribePlaceholder} placeholderTextColor="#9CA3AF" />
          <TouchableOpacity style={[s.findBtn, (!text.trim() || finding) && s.findOff]} onPress={find}
            disabled={!text.trim() || finding} activeOpacity={0.85}>
            {finding
              ? <ActivityIndicator color="#FFFFFF" />
              : <><Ionicons name="search" size={16} color="#FFFFFF" /><Text style={s.findText}>{tr.probDescribeBtn}</Text></>}
          </TouchableOpacity>

          {matches && (
            <View style={{ marginTop: 14, gap: 8 }}>
              {matches.length === 0 ? (
                <Text style={s.muted}>{tr.probNoMatch}</Text>
              ) : (
                <>
                  <View style={s.suggestHead}>
                    <Text style={s.label}>{tr.probSuggestTitle}</Text>
                    {matchedByAi && <AiBadge />}
                  </View>
                  {matches.map(m => (
                    <TouchableOpacity key={m.key} style={s.match} onPress={() => open(m.key)} activeOpacity={0.8}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.matchName}>{m.name}</Text>
                        {!!m.why && <Text style={s.matchWhy}>{m.why}</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={LOOK.ink} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}
        </View>

        {/* Or pick it */}
        <Text style={s.section}>{tr.probOrPick}</Text>
        {failed && <Text style={s.muted}>{tr.probLoadError}</Text>}
        {!problems && !failed && <ActivityIndicator color={LOOK.green} style={{ marginTop: 20 }} />}
        <View style={s.grid}>
          {problems?.map(p => (
            <TouchableOpacity key={p.key} style={[s.tile, p.key === 'unknown' && s.tileUnknown]}
              onPress={() => open(p.key)} activeOpacity={0.8} accessibilityRole="button">
              <View style={s.tileIcon}>
                <Ionicons name={CATEGORY_ICON[p.category] ?? 'help-circle-outline'} size={20} color={LOOK.green} />
              </View>
              <Text style={s.tileName} numberOfLines={2}>{p.name}</Text>
              <Text style={s.tileHint} numberOfLines={3}>{p.hint}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Problems already saved on this crop */}
        {recent.length > 0 && (
          <>
            <Text style={s.section}>{tr.helpRecent}</Text>
            <View style={[s.card, { paddingVertical: 4 }]}>
              {recent.map((r, i) => (
                <TouchableOpacity key={r.id} style={[s.recentRow, i > 0 && s.recentBorder]} activeOpacity={0.7}
                  onPress={() => navigation.navigate('ProblemCard', { problemKey: r.key, saved: true })}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.recentName}>{nameOf(r.key)}</Text>
                    <Text style={s.recentDate}>{r.date}</Text>
                  </View>
                  {!!sevWord(r.severity) && (
                    <View style={[s.sev, r.severity === 'high' && s.sevHigh]}>
                      <Text style={[s.sevText, r.severity === 'high' && s.sevTextHigh]}>{sevWord(r.severity)}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={LOOK.soft} />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const card = { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05,
               shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: LOOK.page },
  scroll:      { padding: 20, paddingTop: 8, paddingBottom: 40 },
  card:        { ...card, padding: 18 },
  label:       { fontSize: 13.5, fontWeight: '700', color: LOOK.ink, marginBottom: 8 },
  muted:       { fontSize: 13.5, color: LOOK.soft, lineHeight: 19 },
  input:       { minHeight: 72, borderRadius: 16, backgroundColor: LOOK.page, padding: 14, fontSize: 15,
                 color: LOOK.ink, textAlignVertical: 'top' },
  findBtn:     { marginTop: 12, height: 48, borderRadius: 16, backgroundColor: LOOK.ink, flexDirection: 'row',
                 alignItems: 'center', justifyContent: 'center', gap: 8 },
  findOff:     { opacity: 0.4 },
  findText:    { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  suggestHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  match:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16,
                 backgroundColor: '#ECFDF5' },
  matchName:   { fontSize: 15, fontWeight: '700', color: LOOK.ink },
  matchWhy:    { fontSize: 13, color: LOOK.soft, marginTop: 3, lineHeight: 18 },
  section:     { fontSize: 16, fontWeight: '700', color: LOOK.ink, marginTop: 24, marginBottom: 10 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile:        { ...card, width: '48.5%', padding: 14, minHeight: 140 },
  tileUnknown: { backgroundColor: '#F9FAFB' },
  tileIcon:    { width: 36, height: 36, borderRadius: 12, backgroundColor: '#ECFDF5', alignItems: 'center',
                 justifyContent: 'center', marginBottom: 10 },
  tileName:    { fontSize: 14.5, fontWeight: '700', color: LOOK.ink },
  tileHint:    { fontSize: 12, color: LOOK.soft, marginTop: 4, lineHeight: 16 },
  recentRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  recentBorder:{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  recentName:  { fontSize: 15, fontWeight: '700', color: LOOK.ink },
  recentDate:  { fontSize: 12.5, color: LOOK.soft, marginTop: 2 },
  sev:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F3F4F6' },
  sevHigh:     { backgroundColor: '#FEE2E2' },
  sevText:     { fontSize: 12, fontWeight: '700', color: LOOK.ink },
  sevTextHigh: { color: '#B91C1C' },
});
