import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/languageStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { apiAdvice, apiProgress } from '@/services/apiService';
import { fetchActiveCycleLogs } from '@/utils/progressLogs';

type Recent = { id: number; key: string; name: string; date: string; severity: string };

/**
 * The middle tab: help for a problem in the field (PhilRice booklet advice the AI can
 * explain) and the GeoRice AI chat, with the farmer's recent problems underneath.
 */
export const HelpHomeScreen: React.FC = () => {
  const tr = useTranslation();
  const lang = useLanguageStore(st => st.language);
  const navigation = useNavigation<any>();
  const farmId = useSelectedFarm()?.id;
  const [recent, setRecent] = useState<Recent[] | null>(null);

  // The problems logged on the farm's current crop, newest first
  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      try {
        const { cycle } = await fetchActiveCycleLogs(farmId);
        if (!cycle) { if (alive) setRecent([]); return; }
        const [logs, problems] = await Promise.all([apiProgress.listLogs(cycle.id), apiAdvice.problems(lang)]);
        const names = Object.fromEntries(problems.data.map(p => [p.key, p.name]));
        const rows = (logs.data as any[])
          .filter(l => l.problem_key)
          .sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)) || b.id - a.id)
          .slice(0, 5)
          .map(l => ({ id: l.id, key: l.problem_key, name: names[l.problem_key] ?? l.problem_key,
                       date: l.log_date, severity: l.severity }));
        if (alive) setRecent(rows);
      } catch {
        if (alive) setRecent([]);
      }
    })();
    return () => { alive = false; };
  }, [farmId, lang]));

  const sevWord = (sev: string) =>
    sev === 'high' ? tr.sevHigh : sev === 'medium' ? tr.sevMedium : sev === 'low' ? tr.sevLow : '';

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>{tr.helpTitle}</Text>
        <Text style={s.sub}>{tr.helpSub}</Text>

        {/* A problem in the field: the main reason to open this tab */}
        <TouchableOpacity style={s.problemCard} activeOpacity={0.85}
          onPress={() => navigation.navigate('ProblemPicker')} accessibilityRole="button">
          <View style={s.problemIcon}>
            <Ionicons name="warning-outline" size={26} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.problemTitle}>{tr.helpProblemTitle}</Text>
            <Text style={s.problemSub}>{tr.helpProblemSub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* The AI chat */}
        <TouchableOpacity style={s.askCard} activeOpacity={0.85}
          onPress={() => navigation.navigate('AIChat')} accessibilityRole="button">
          <View style={s.askIcon}>
            <Ionicons name="sparkles" size={22} color={LOOK.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.askTitle}>{tr.helpAskTitle}</Text>
            <Text style={s.askSub}>{tr.helpAskSub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={LOOK.soft} />
        </TouchableOpacity>

        {/* Recent problems on this crop */}
        <Text style={s.section}>{tr.helpRecent}</Text>
        <View style={s.listCard}>
          {recent === null ? (
            <Text style={s.empty}>...</Text>
          ) : recent.length === 0 ? (
            <Text style={s.empty}>{tr.helpRecentEmpty}</Text>
          ) : recent.map((r, i) => (
            <TouchableOpacity key={r.id} style={[s.recentRow, i > 0 && s.recentBorder]} activeOpacity={0.7}
              onPress={() => navigation.navigate('ProblemCard', { problemKey: r.key, saved: true })}>
              <View style={{ flex: 1 }}>
                <Text style={s.recentName}>{r.name}</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
};

const card = { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05,
               shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: LOOK.page },
  scroll:       { padding: 20, paddingBottom: 140 },
  title:        { fontSize: 30, fontWeight: '800', color: LOOK.ink, letterSpacing: -0.5 },
  sub:          { fontSize: 14, color: LOOK.soft, marginTop: 4, marginBottom: 20 },
  problemCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: LOOK.ink,
                  borderRadius: 24, padding: 20 },
  problemIcon:  { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center', justifyContent: 'center' },
  problemTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  problemSub:   { fontSize: 13, color: '#D1D5DB', marginTop: 4, lineHeight: 18 },
  askCard:      { ...card, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, marginTop: 12 },
  askIcon:      { width: 46, height: 46, borderRadius: 16, backgroundColor: '#ECFDF5',
                  alignItems: 'center', justifyContent: 'center' },
  askTitle:     { fontSize: 16, fontWeight: '700', color: LOOK.ink },
  askSub:       { fontSize: 13, color: LOOK.soft, marginTop: 2 },
  section:      { fontSize: 16, fontWeight: '700', color: LOOK.ink, marginTop: 28, marginBottom: 10 },
  listCard:     { ...card, paddingHorizontal: 18, paddingVertical: 6 },
  empty:        { fontSize: 14, color: LOOK.soft, paddingVertical: 16 },
  recentRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  recentBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  recentName:   { fontSize: 15, fontWeight: '700', color: LOOK.ink },
  recentDate:   { fontSize: 12.5, color: LOOK.soft, marginTop: 2 },
  sev:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F3F4F6' },
  sevHigh:      { backgroundColor: '#FEE2E2' },
  sevText:      { fontSize: 12, fontWeight: '700', color: LOOK.ink },
  sevTextHigh:  { color: '#B91C1C' },
});
