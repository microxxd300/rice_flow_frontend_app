import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LOOK } from '@/theme/look';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppStore } from '@/store/appStore';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import type { RecommendationResult } from '@/services/apiService';
import { suitabilityText } from '@/utils/suitability';
import { nextCropParams } from '@/utils/nextCrop';

// The farm's latest real recommendation (from the store). With no crop growing, this list
// is from the last scan, so the screen offers a new scan to start the next crop.

export const RecommendationResultsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const tr = useTranslation();
  const rec = useAppStore(s => s.latestRecommendation) as any;
  const activeCycle = useAppStore(s => s.activeCycle) as any;
  const farm = useSelectedFarm() as any;
  const results: RecommendationResult[] = [...(rec?.results ?? [])].sort((a, b) => a.rank - b.rank);

  const canStartCrop = !!farm && activeCycle?.status !== 'active';
  const startNextCrop = () => navigation.navigateDeprecated('AnalysisLoading', nextCropParams(farm));

  const tolerance = (v?: string) => {
    const level = String(v ?? '').toLowerCase();
    return level === 'high' ? tr.valHigh : level === 'moderate' ? tr.valModerate : level === 'low' ? tr.valLow : '—';
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={LOOK.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{tr.recHeaderTitle}</Text>
          <Text style={s.headerSub} numberOfLines={1}>{tr.recHeaderSub}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {results.length === 0 ? (
          <View style={[s.card, s.empty]}>
            <View style={s.emptyIcon}><Ionicons name="leaf-outline" size={26} color={LOOK.green} /></View>
            <Text style={s.emptyTitle}>{tr.recEmptyTitle}</Text>
            <Text style={s.emptyBody}>{tr.recEmptyBody}</Text>
            <TouchableOpacity
              style={[s.darkBtn, { alignSelf: 'stretch', marginTop: 8 }]}
              onPress={canStartCrop ? startNextCrop : () => navigation.navigateDeprecated('EnvironmentalScanner')}
              activeOpacity={0.85}
            >
              <Text style={s.darkBtnText}>{canStartCrop ? tr.nextCropBtn : tr.recScanBtn}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {canStartCrop && (
              <View style={s.card}>
                <Text style={s.nextTitle}>{tr.nextCropTitle}</Text>
                <Text style={s.nextBody}>{tr.nextCropBody}</Text>
                <TouchableOpacity style={[s.darkBtn, { marginTop: 16 }]} onPress={startNextCrop} activeOpacity={0.85}>
                  <Text style={s.darkBtnText}>{tr.nextCropBtn}</Text>
                </TouchableOpacity>
              </View>
            )}
            {rec?.created_at ? (
              <Text style={s.meta}>{tr.recBasedOn.replace('{date}', String(rec.created_at).slice(0, 10))}</Text>
            ) : null}
            {results.map(r => (
              <View key={r.variety.id} style={s.card}>
                <View style={s.cardHead}>
                  <View style={[s.rank, r.rank === 1 && s.rankTop]}>
                    <Text style={[s.rankText, r.rank === 1 && { color: '#FFFFFF' }]}>{r.rank}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={2}>{r.variety.common_name}</Text>
                    <Text style={s.code}>{r.variety.nsic_code}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.score}>{Math.round(r.rsi_score)}</Text>
                    <Text style={s.scoreLabel}>RSI</Text>
                  </View>
                </View>
                <Text style={s.cls}>{suitabilityText(r.suitability_class)}</Text>
                <View style={s.facts}>
                  <Fact label={tr.recFactDays} value={`${r.variety.maturity_days}`} />
                  <Fact label={tr.recFactYield} value={`${r.variety.avg_yield_t_ha} t/ha`} />
                  <Fact label={tr.recFactFlood} value={tolerance(r.variety.submergence_tolerance)} />
                  <Fact label={tr.recFactDrought} value={tolerance(r.variety.drought_tolerance)} />
                </View>
                {(r as any).fit_explanation ? (
                  <Text style={s.fit}>{(r as any).fit_explanation}</Text>
                ) : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const Fact: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={s.fact}>
    <Text style={s.factLabel}>{label}</Text>
    <Text style={s.factValue}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: LOOK.page },
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 150 },   // room for the floating tab bar
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 21, color: LOOK.ink, letterSpacing: -0.4, fontFamily: 'Inter_700Bold' },
  headerSub:   { fontSize: 13, color: LOOK.soft, marginTop: 1, fontFamily: 'Inter_500Medium' },
  meta:        { fontSize: 13, color: LOOK.soft, marginBottom: 12, marginLeft: 4, fontFamily: 'Inter_500Medium' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  nextTitle: { fontSize: 18, color: LOOK.ink, letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  nextBody:  { fontSize: 14, color: LOOK.soft, lineHeight: 20, marginTop: 6, fontFamily: 'Inter_400Regular' },
  darkBtn:   { height: 54, borderRadius: 18, backgroundColor: LOOK.ink, justifyContent: 'center', alignItems: 'center' },
  darkBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: LOOK.page },
  rankTop:  { backgroundColor: LOOK.green },
  rankText: { fontSize: 14, color: LOOK.ink, fontFamily: 'Inter_700Bold' },
  name:     { fontSize: 16, color: LOOK.ink, fontFamily: 'Inter_700Bold' },
  code:     { fontSize: 13, color: LOOK.soft, marginTop: 2, fontFamily: 'Inter_500Medium' },
  score:    { fontSize: 24, color: LOOK.green, fontFamily: 'Inter_700Bold' },
  scoreLabel: { fontSize: 11, color: LOOK.soft, fontFamily: 'Inter_500Medium' },
  cls:      { fontSize: 13, color: LOOK.soft, marginTop: 12, fontFamily: 'Inter_600SemiBold' },
  facts:    { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  fact:     { flexBasis: '47%', flexGrow: 1, backgroundColor: LOOK.page, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12 },
  factLabel: { fontSize: 12, color: LOOK.soft, fontFamily: 'Inter_500Medium' },
  factValue: { fontSize: 15, color: LOOK.ink, marginTop: 2, fontFamily: 'Inter_700Bold' },
  fit:      { fontSize: 13, color: LOOK.soft, lineHeight: 19, marginTop: 12, fontFamily: 'Inter_400Regular' },

  empty:      { alignItems: 'center', gap: 10, paddingVertical: 32 },
  emptyIcon:  { width: 56, height: 56, borderRadius: 18, backgroundColor: '#E8F5EF', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, color: LOOK.ink, fontFamily: 'Inter_700Bold' },
  emptyBody:  { fontSize: 14, color: LOOK.soft, textAlign: 'center', lineHeight: 20, maxWidth: 300, fontFamily: 'Inter_400Regular' },
});
