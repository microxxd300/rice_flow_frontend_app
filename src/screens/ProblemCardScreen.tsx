import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/languageStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { apiAdvice, apiProgress, type AdviceExplanation, type ProblemCard } from '@/services/apiService';
import { fetchActiveCycleLogs } from '@/utils/progressLogs';
import { AdviceRow, SourceChips } from '@/components/AdviceParts';

type Severity = 'low' | 'medium' | 'high';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * One field problem: the PhilRice booklet card (always shown, no AI), the AI's
 * explanation of it for this farm (every point with its booklet page), and saving
 * the problem and what the farmer did to the field log.
 */
export const ProblemCardScreen: React.FC = () => {
  const tr = useTranslation();
  const lang = useLanguageStore(st => st.language);
  const navigation = useNavigation<any>();
  const params = (useRoute<any>().params ?? {}) as { problemKey: string; description?: string; saved?: boolean };
  const farmId = useSelectedFarm()?.id;

  const [card, setCard] = useState<ProblemCard | null>(null);
  const [failed, setFailed] = useState(false);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [question, setQuestion] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [explained, setExplained] = useState<AdviceExplanation | null>(null);
  const [action, setAction] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!params.saved);
  const [noCycle, setNoCycle] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    apiAdvice.problem(params.problemKey, lang).then(r => setCard(r.data)).catch(() => setFailed(true));
  }, [params.problemKey, lang]);

  const explain = async () => {
    setExplaining(true);
    try {
      const r = await apiAdvice.explain({ problem: params.problemKey, language: lang, farm: farmId,
                                          question: question.trim() || undefined });
      setExplained(r.data);
    } catch {
      setExplained({ problem: params.problemKey, ai_used: false, not_covered: false,
                     note: 'ai_unavailable', points: [] });
    } finally {
      setExplaining(false);
    }
  };

  const save = async () => {
    if (!card) return;
    setSaving(true);
    setSaveFailed(false);
    try {
      const { cycle } = await fetchActiveCycleLogs(farmId);
      if (!cycle) { setNoCycle(true); return; }
      await apiProgress.createLog({
        farm_cycle: cycle.id,
        log_date: today(),
        observation: params.description || card.name,
        problem_key: card.key,
        severity: severity ?? '',
        action_taken: action.trim(),
      });
      fetchActiveCycleLogs(farmId).catch(() => {});   // the Progress tab shows it next time
      setSaved(true);
    } catch {
      setSaveFailed(true);
    } finally {
      setSaving(false);
    }
  };

  const note = explained && !explained.ai_used
    ? (explained.note === 'daily_limit' ? tr.probNoteLimit
      : explained.note === 'rejected' ? tr.probNoteRejected : tr.probNoteUnavailable)
    : null;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={LOOK.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{card?.name ?? ''}</Text>
      </View>

      {failed ? <Text style={[s.muted, { padding: 20 }]}>{tr.probLoadError}</Text>
        : !card ? <ActivityIndicator color={LOOK.green} style={{ marginTop: 40 }} />
        : (
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Where this comes from */}
          <View style={s.badgeRow}>
            <View style={s.badge}>
              <Ionicons name="book-outline" size={13} color={LOOK.green} />
              <Text style={s.badgeText}>{tr.probFromBooklets}</Text>
            </View>
            {!card.checked_by_validator && <Text style={s.unchecked}>{tr.probNotChecked}</Text>}
          </View>

          {/* How bad is it */}
          {!saved && (
            <View style={s.card}>
              <Text style={s.cardTitle}>{tr.probSeverity}</Text>
              <View style={s.chips}>
                {(['low', 'medium', 'high'] as Severity[]).map(sev => (
                  <TouchableOpacity key={sev} onPress={() => setSeverity(sev)} activeOpacity={0.8}
                    style={[s.chip, severity === sev && (sev === 'high' ? s.chipHigh : s.chipOn)]}>
                    <Text style={[s.chipText, severity === sev && s.chipTextOn]}>
                      {sev === 'low' ? tr.sevLow : sev === 'medium' ? tr.sevMedium : tr.sevHigh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          {severity === 'high' && (
            <View style={s.urgent}>
              <Ionicons name="alert-circle" size={22} color="#B91C1C" />
              <Text style={s.urgentText}>{card.urgent}</Text>
            </View>
          )}

          {/* The booklet card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{tr.probIdentify}</Text>
            {card.identify.map((l, i) => <AdviceRow key={i} line={l} />)}
            {card.serious_when && (
              <View style={s.serious}>
                <Text style={s.seriousTitle}>{tr.probSerious}</Text>
                <Text style={s.seriousText}>{card.serious_when.text}</Text>
                <SourceChips sources={card.serious_when.sources} />
              </View>
            )}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>{tr.probDoNow}</Text>
            {card.do_now.map((l, i) => <AdviceRow key={i} line={l} mark="do" />)}
          </View>

          {card.dont.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>{tr.probDont}</Text>
              {card.dont.map((l, i) => <AdviceRow key={i} line={l} mark="dont" />)}
            </View>
          )}

          {/* The AI explains the card for this farm */}
          <View style={s.aiCard}>
            {!explained?.ai_used && (
              <>
                <TextInput style={s.aiInput} value={question} onChangeText={setQuestion} maxLength={300}
                  placeholder={tr.probQuestionPlaceholder} placeholderTextColor="#9CA3AF" />
                <TouchableOpacity style={s.aiBtn} onPress={explain} disabled={explaining} activeOpacity={0.85}>
                  {explaining
                    ? <><ActivityIndicator color={LOOK.ink} /><Text style={s.aiBtnText}>{tr.probExplainLoading}</Text></>
                    : <><Ionicons name="sparkles" size={16} color={LOOK.ink} /><Text style={s.aiBtnText}>{tr.probExplainBtn}</Text></>}
                </TouchableOpacity>
              </>
            )}
            {note && <Text style={s.aiNote}>{note}</Text>}
            {explained?.ai_used && (
              <>
                <View style={s.aiHead}>
                  <Ionicons name="sparkles" size={16} color="#6EE7B7" />
                  <Text style={s.aiTitle}>{tr.probExplainTitle}</Text>
                </View>
                {explained.points.map((p, i) => (
                  <View key={i} style={s.aiPoint}>
                    <Text style={s.aiText}>{p.text}</Text>
                    <SourceChips sources={p.sources} dark />
                  </View>
                ))}
                {explained.not_covered && <Text style={s.aiNote}>{tr.probNotCovered}</Text>}
                <Text style={s.aiFoot}>{tr.probExplainNote}</Text>
              </>
            )}
          </View>

          {card.next_season.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>{tr.probNextSeason}</Text>
              {card.next_season.map((l, i) => <AdviceRow key={i} line={l} />)}
            </View>
          )}

          <View style={s.card}>
            <Text style={s.cardTitle}>{tr.probGetHelp}</Text>
            <Text style={s.helpText}>{card.get_help.text}</Text>
          </View>

          {/* Save the problem and what was done */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{tr.probSaveTitle}</Text>
            {saved ? (
              <View style={s.savedRow}>
                <Ionicons name="checkmark-circle" size={20} color={LOOK.green} />
                <Text style={s.savedText}>{tr.probSaved}</Text>
              </View>
            ) : noCycle ? (
              <Text style={s.muted}>{tr.probNoCycle}</Text>
            ) : (
              <>
                <TextInput style={s.input} value={action} onChangeText={setAction} multiline maxLength={300}
                  placeholder={tr.probActionPlaceholder} placeholderTextColor="#9CA3AF" />
                {saveFailed && <Text style={[s.muted, { marginTop: 8 }]}>{tr.probLoadError}</Text>}
                <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
                  {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveText}>{tr.probSaveBtn}</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const shadow = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14,
                 shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: LOOK.page },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  back:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: LOOK.ink },
  scroll:      { padding: 20, paddingTop: 4, paddingBottom: 150, gap: 12 },
  muted:       { fontSize: 14, color: LOOK.soft, lineHeight: 20 },
  badgeRow:    { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5,
                 borderRadius: 12, backgroundColor: '#ECFDF5' },
  badgeText:   { fontSize: 12, fontWeight: '700', color: '#047857' },
  unchecked:   { fontSize: 12, color: LOOK.soft },
  card:        { ...shadow, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18 },
  cardTitle:   { fontSize: 16, fontWeight: '800', color: LOOK.ink, marginBottom: 4 },
  chips:       { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip:        { flex: 1, height: 42, borderRadius: 14, backgroundColor: LOOK.page, alignItems: 'center',
                 justifyContent: 'center' },
  chipOn:      { backgroundColor: LOOK.ink },
  chipHigh:    { backgroundColor: '#B91C1C' },
  chipText:    { fontSize: 14, fontWeight: '700', color: LOOK.ink },
  chipTextOn:  { color: '#FFFFFF' },
  urgent:      { flexDirection: 'row', gap: 10, padding: 16, borderRadius: 20, backgroundColor: '#FEF2F2',
                 borderWidth: 1, borderColor: '#FECACA' },
  urgentText:  { flex: 1, fontSize: 14, lineHeight: 20, color: '#7F1D1D', fontWeight: '600' },
  serious:     { marginTop: 8, padding: 14, borderRadius: 16, backgroundColor: '#FFFBEB' },
  seriousTitle:{ fontSize: 13, fontWeight: '800', color: '#92400E' },
  seriousText: { fontSize: 14, lineHeight: 20, color: LOOK.ink, marginTop: 4 },
  aiCard:      { backgroundColor: LOOK.ink, borderRadius: 24, padding: 18, gap: 10 },
  aiInput:     { height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14,
                 fontSize: 14.5, color: '#FFFFFF' },
  aiBtn:       { height: 48, borderRadius: 16, backgroundColor: '#FFFFFF', flexDirection: 'row',
                 alignItems: 'center', justifyContent: 'center', gap: 8 },
  aiBtnText:   { fontSize: 15, fontWeight: '700', color: LOOK.ink },
  aiHead:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiTitle:     { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  aiPoint:     { paddingVertical: 6 },
  aiText:      { fontSize: 14.5, lineHeight: 21, color: '#F9FAFB' },
  aiNote:      { fontSize: 13.5, lineHeight: 19, color: '#FDE68A' },
  aiFoot:      { fontSize: 11.5, color: '#9CA3AF' },
  helpText:    { fontSize: 14.5, lineHeight: 21, color: LOOK.ink, marginTop: 4 },
  input:       { minHeight: 64, borderRadius: 16, backgroundColor: LOOK.page, padding: 14, fontSize: 15,
                 color: LOOK.ink, textAlignVertical: 'top', marginTop: 8 },
  saveBtn:     { marginTop: 12, height: 50, borderRadius: 16, backgroundColor: LOOK.ink, alignItems: 'center',
                 justifyContent: 'center' },
  saveText:    { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  savedRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  savedText:   { fontSize: 14.5, fontWeight: '600', color: LOOK.ink },
});
