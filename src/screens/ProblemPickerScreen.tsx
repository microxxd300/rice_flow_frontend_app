import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import { useLanguageStore } from '@/store/languageStore';
import { apiAdvice, type ProblemSummary } from '@/services/apiService';

const CATEGORY_ICON: Record<string, any> = {
  pest: 'bug-outline', disease: 'leaf-outline', weather: 'rainy-outline',
  nutrient: 'flask-outline', other: 'help-circle-outline',
};

/** "What do you see?": describe it (the AI picks from the booklet list) or pick it. */
export const ProblemPickerScreen: React.FC = () => {
  const tr = useTranslation();
  const lang = useLanguageStore(st => st.language);
  const navigation = useNavigation<any>();
  const [problems, setProblems] = useState<ProblemSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [finding, setFinding] = useState(false);
  const [matches, setMatches] = useState<{ key: string; name: string; why: string }[] | null>(null);

  useEffect(() => {
    apiAdvice.problems(lang).then(r => setProblems(r.data)).catch(() => setFailed(true));
  }, [lang]);

  const find = async () => {
    if (!text.trim() || finding) return;
    setFinding(true);
    try {
      setMatches((await apiAdvice.match(text.trim(), lang)).data.matches);
    } catch {
      setMatches([]);
    } finally {
      setFinding(false);
    }
  };

  const open = (key: string) => navigation.navigate('ProblemCard', { problemKey: key, description: text.trim() });

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={LOOK.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{tr.probPickTitle}</Text>
      </View>

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
              : <><Ionicons name="sparkles" size={16} color="#FFFFFF" /><Text style={s.findText}>{tr.probDescribeBtn}</Text></>}
          </TouchableOpacity>

          {matches && (
            <View style={{ marginTop: 14 }}>
              {matches.length === 0 ? (
                <Text style={s.noMatch}>{tr.probNoMatch}</Text>
              ) : (
                <>
                  <Text style={s.label}>{tr.probSuggestTitle}</Text>
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
        {failed && <Text style={s.noMatch}>{tr.probLoadError}</Text>}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const card = { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05,
               shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 } as const;

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: LOOK.page },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  back:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: LOOK.ink },
  scroll:      { padding: 20, paddingTop: 8, paddingBottom: 140 },
  card:        { ...card, padding: 18 },
  label:       { fontSize: 13.5, fontWeight: '700', color: LOOK.ink, marginBottom: 8 },
  input:       { minHeight: 72, borderRadius: 16, backgroundColor: LOOK.page, padding: 14, fontSize: 15,
                 color: LOOK.ink, textAlignVertical: 'top' },
  findBtn:     { marginTop: 12, height: 48, borderRadius: 16, backgroundColor: LOOK.ink, flexDirection: 'row',
                 alignItems: 'center', justifyContent: 'center', gap: 8 },
  findOff:     { opacity: 0.4 },
  findText:    { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  noMatch:     { fontSize: 13.5, color: LOOK.soft, lineHeight: 19 },
  match:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16,
                 backgroundColor: '#ECFDF5', marginTop: 8 },
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
});
