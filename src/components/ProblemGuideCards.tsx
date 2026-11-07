import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/languageStore';
import { apiAdvice, apiProgress, type AdviceExplanation, type ProblemCard } from '@/services/apiService';
import { fetchActiveCycleLogs } from '@/utils/progressLogs';
import { AdviceRow, AiBadge, SourceChips } from './AdviceParts';

const SHOWN = 2;   // the newest open problems; older ones wait until these are fixed

type OpenLog = { id: number; problem_key: string; severity: string; observation: string; advice_tip: any };

/**
 * Under the planting guide: each problem the farmer logged and has not marked fixed,
 * with the PhilRice booklet advice and a GeoRice AI tip for this farm. The tip loads by
 * itself and is saved on the log, so each problem asks the AI only once.
 */
export const ProblemGuideCards: React.FC<{ farmId?: number }> = ({ farmId }) => {
  const [open, setOpen] = useState<OpenLog[]>([]);

  const load = useCallback(() => {
    let alive = true;
    fetchActiveCycleLogs(farmId)
      .then(({ cycle }) => (cycle ? apiProgress.listLogs(cycle.id) : null))
      .then(res => {
        if (!alive || !res) return;
        setOpen((res.data as any[])
          .filter(l => l.problem_key && !l.resolved_at)
          .sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)) || b.id - a.id)
          .slice(0, SHOWN));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [farmId]);
  useFocusEffect(load);

  if (!open.length) return null;
  return (
    <>
      {open.map(log => (
        <ProblemCardView key={`${log.id}-${log.problem_key}`} log={log} farmId={farmId}
          onChanged={load} />
      ))}
    </>
  );
};

const ProblemCardView: React.FC<{ log: OpenLog; farmId?: number; onChanged: () => void }> = ({ log, farmId, onChanged }) => {
  const tr = useTranslation();
  const lang = useLanguageStore(st => st.language);
  const [card, setCard] = useState<ProblemCard | null>(null);
  const [tip, setTip] = useState<AdviceExplanation | null>(
    log.advice_tip?.problem === log.problem_key && log.advice_tip?.language === lang ? log.advice_tip : null);
  const [guess, setGuess] = useState<{ key: string; name: string } | null>(null);
  // "Not sure" with a description: no tip until GeoRice AI's guess is answered (one AI request less)
  const [waitForGuess, setWaitForGuess] = useState(log.problem_key === 'unknown' && !!log.observation?.trim());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiAdvice.problem(log.problem_key, lang).then(r => setCard(r.data)).catch(() => {});
  }, [log.problem_key, lang]);

  // The GeoRice AI tip for this farm: asked once, then read from the log
  useEffect(() => {
    if (tip || waitForGuess) return;
    let alive = true;
    apiAdvice.explain({ problem: log.problem_key, language: lang, farm: farmId, log: log.id })
      .then(r => { if (alive) setTip(r.data); })
      .catch(() => { if (alive) setTip({ problem: log.problem_key, ai_used: false, not_covered: false, note: 'ai_unavailable', points: [] }); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.id, log.problem_key, lang, waitForGuess]);

  // "Not sure": GeoRice AI reads what the farmer wrote and guesses which problem it is
  useEffect(() => {
    if (log.problem_key !== 'unknown' || !log.observation?.trim()) return;
    apiAdvice.match(log.observation, lang)
      .then(r => {
        const m = r.data.matches[0];
        if (m) setGuess({ key: m.key, name: m.name });
        else setWaitForGuess(false);
      })
      .catch(() => setWaitForGuess(false));
  }, [log.problem_key, log.observation, lang]);

  const patch = async (data: any) => {
    setBusy(true);
    try {
      await apiProgress.updateLog(log.id, data);
      onChanged();
    } catch {
      setBusy(false);
    }
  };

  const tipLoading = !tip && !waitForGuess;   // asked once; a failure still sets a tip (with a note)
  const sevWord = log.severity === 'high' ? tr.sevHigh : log.severity === 'medium' ? tr.sevMedium
    : log.severity === 'low' ? tr.sevLow : '';
  const note = tip && !tip.ai_used
    ? (tip.note === 'daily_limit' ? tr.probNoteLimit : tip.note === 'rejected' ? tr.probNoteRejected : tr.probNoteUnavailable)
    : null;

  return (
    <View style={s.card}>
      <View style={s.head}>
        <View style={s.warnIcon}><Ionicons name="warning-outline" size={20} color="#B45309" /></View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{tr.probCardTitle}</Text>
          <Text style={s.name} numberOfLines={2}>{card?.name ?? ''}</Text>
        </View>
        {!!sevWord && (
          <View style={[s.sev, log.severity === 'high' && s.sevHigh]}>
            <Text style={[s.sevText, log.severity === 'high' && s.sevTextHigh]}>{sevWord}</Text>
          </View>
        )}
      </View>

      {/* Not sure: one tap to accept GeoRice AI's guess */}
      {guess && (
        <View style={s.guess}>
          <AiBadge />
          <Text style={s.guessText}>{tr.probGuess.replace('{name}', guess.name)}</Text>
          <View style={s.guessBtns}>
            <TouchableOpacity style={[s.guessBtn, s.guessYes]} disabled={busy}
              onPress={() => patch({ problem_key: guess.key })}>
              <Text style={s.guessYesText}>{tr.probYes}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.guessBtn} onPress={() => { setGuess(null); setWaitForGuess(false); }}>
              <Text style={s.guessNoText}>{tr.probNo}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!card ? <ActivityIndicator color={LOOK.green} style={{ marginVertical: 16 }} /> : (
        <>
          <Text style={s.section}>{tr.probDoNow}</Text>
          {card.do_now.map((l, i) => <AdviceRow key={`d${i}`} line={l} mark="do" />)}
          {card.dont.length > 0 && <Text style={s.section}>{tr.probDont}</Text>}
          {card.dont.map((l, i) => <AdviceRow key={`x${i}`} line={l} mark="dont" />)}
        </>
      )}

      {/* GeoRice AI: a tip for this farm, from the booklet advice above (after any guess) */}
      {!waitForGuess && <View style={s.ai}>
        <AiBadge dark />
        {tipLoading && (
          <View style={s.aiLoading}>
            <ActivityIndicator color="#6EE7B7" size="small" />
            <Text style={s.aiNote}>{tr.probExplainLoading}</Text>
          </View>
        )}
        {note && <Text style={s.aiNote}>{note}</Text>}
        {tip?.ai_used && tip.points.map((p, i) => (
          <View key={i} style={{ paddingVertical: 4 }}>
            <Text style={s.aiText}>{p.text}</Text>
            <SourceChips sources={p.sources} dark />
          </View>
        ))}
        {tip?.ai_used && tip.not_covered && <Text style={s.aiNote}>{tr.probNotCovered}</Text>}
      </View>}

      {!!card && <Text style={s.help}>{card.get_help.text}</Text>}

      <TouchableOpacity style={s.fixed} disabled={busy} activeOpacity={0.85}
        onPress={() => patch({ resolved_at: new Date().toISOString() })}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : (
          <>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text style={s.fixedText}>{tr.probFixed}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  card:      { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, marginBottom: 14, borderWidth: 1.5,
               borderColor: '#FDE68A', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14,
               shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  head:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warnIcon:  { width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center' },
  label:     { fontSize: 12, fontWeight: '700', color: '#B45309' },
  name:      { fontSize: 18, fontWeight: '800', color: LOOK.ink },
  sev:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F3F4F6' },
  sevHigh:   { backgroundColor: '#FEE2E2' },
  sevText:   { fontSize: 12, fontWeight: '700', color: LOOK.ink },
  sevTextHigh: { color: '#B91C1C' },
  guess:     { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: '#ECFDF5', gap: 8 },
  guessText: { fontSize: 14.5, fontWeight: '700', color: LOOK.ink },
  guessBtns: { flexDirection: 'row', gap: 8 },
  guessBtn:  { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  guessYes:  { backgroundColor: LOOK.ink },
  guessYesText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  guessNoText:  { fontSize: 14, fontWeight: '700', color: LOOK.ink },
  section:   { fontSize: 14.5, fontWeight: '800', color: LOOK.ink, marginTop: 14 },
  ai:        { marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: LOOK.ink, gap: 6 },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiText:    { fontSize: 14.5, lineHeight: 21, color: '#F9FAFB' },
  aiNote:    { fontSize: 13.5, lineHeight: 19, color: '#FDE68A' },
  help:      { fontSize: 13, lineHeight: 19, color: LOOK.soft, marginTop: 12 },
  fixed:     { marginTop: 14, height: 48, borderRadius: 16, backgroundColor: LOOK.green, flexDirection: 'row',
               alignItems: 'center', justifyContent: 'center', gap: 8 },
  fixedText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
