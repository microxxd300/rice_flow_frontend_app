import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/languageStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { apiAdvice, type AdviceExplanation, type ProblemCard } from '@/services/apiService';
import { AdviceRow, AiBadge, Fold, SourceChips, StepHeader } from '@/components/AdviceParts';

export type Severity = 'low' | 'medium' | 'high';

/**
 * Step 2 of a problem in the field: the PhilRice booklet advice (always shown, no AI).
 * What to do and what not to do are open; the rest folds. GeoRice AI can explain the
 * advice for this farm, every point with its booklet page. Step 3 saves it.
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

  const note = explained && !explained.ai_used
    ? (explained.note === 'daily_limit' ? tr.probNoteLimit
      : explained.note === 'rejected' ? tr.probNoteRejected : tr.probNoteUnavailable)
    : null;

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <StepHeader step={2} title={card?.name ?? ''} onBack={() => navigation.goBack()} />

      {failed ? <Text style={[s.muted, { padding: 20 }]}>{tr.probLoadError}</Text>
        : !card ? <ActivityIndicator color={LOOK.green} style={{ marginTop: 40 }} />
        : (
        <>
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

          {/* How bad is it (not asked again for a problem already saved) */}
          {!params.saved && (
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
              {severity === 'high' && (
                <View style={s.urgent}>
                  <Ionicons name="alert-circle" size={22} color="#B91C1C" />
                  <Text style={s.urgentText}>{card.urgent}</Text>
                </View>
              )}
            </View>
          )}

          {/* The advice: open */}
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

          {/* GeoRice AI explains the advice for this farm */}
          <View style={s.aiCard}>
            <AiBadge dark />
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
                <Text style={s.aiTitle}>{tr.probExplainTitle}</Text>
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

          {/* The rest of the booklet card: folded */}
          <View style={[s.card, { paddingVertical: 4 }]}>
            <Fold title={tr.probIdentify} first>
              {card.identify.map((l, i) => <AdviceRow key={i} line={l} />)}
            </Fold>
            {card.serious_when && (
              <Fold title={tr.probSerious}>
                <Text style={s.body}>{card.serious_when.text}</Text>
                <SourceChips sources={card.serious_when.sources} />
              </Fold>
            )}
            {card.next_season.length > 0 && (
              <Fold title={tr.probNextSeason}>
                {card.next_season.map((l, i) => <AdviceRow key={i} line={l} />)}
              </Fold>
            )}
            <Fold title={tr.probGetHelp}>
              <Text style={s.body}>{card.get_help.text}</Text>
            </Fold>
          </View>
        </ScrollView>

        {/* Step 3 */}
        <View style={s.footer}>
          {params.saved ? (
            <TouchableOpacity style={s.nextBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={s.nextText}>{tr.probDone}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.nextBtn} activeOpacity={0.85}
              onPress={() => navigation.navigate('ProblemSave', {
                problemKey: card.key, name: card.name, severity, description: params.description ?? '',
              })}>
              <Text style={s.nextText}>{tr.probNext}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        </>
      )}
    </SafeAreaView>
  );
};

const shadow = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14,
                 shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: LOOK.page },
  scroll:      { padding: 20, paddingTop: 4, paddingBottom: 24, gap: 12 },
  muted:       { fontSize: 14, color: LOOK.soft, lineHeight: 20 },
  body:        { fontSize: 14.5, lineHeight: 21, color: LOOK.ink },
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
  urgent:      { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: '#FEF2F2',
                 marginTop: 12 },
  urgentText:  { flex: 1, fontSize: 14, lineHeight: 20, color: '#7F1D1D', fontWeight: '600' },
  aiCard:      { backgroundColor: LOOK.ink, borderRadius: 24, padding: 18, gap: 10 },
  aiInput:     { height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14,
                 fontSize: 14.5, color: '#FFFFFF' },
  aiBtn:       { height: 48, borderRadius: 16, backgroundColor: '#FFFFFF', flexDirection: 'row',
                 alignItems: 'center', justifyContent: 'center', gap: 8 },
  aiBtnText:   { fontSize: 15, fontWeight: '700', color: LOOK.ink },
  aiTitle:     { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  aiPoint:     { paddingVertical: 6 },
  aiText:      { fontSize: 14.5, lineHeight: 21, color: '#F9FAFB' },
  aiNote:      { fontSize: 13.5, lineHeight: 19, color: '#FDE68A' },
  aiFoot:      { fontSize: 11.5, color: '#9CA3AF' },
  footer:      { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, backgroundColor: LOOK.page },
  nextBtn:     { height: 54, borderRadius: 18, backgroundColor: LOOK.ink, flexDirection: 'row', alignItems: 'center',
                 justifyContent: 'center', gap: 8 },
  nextText:    { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
