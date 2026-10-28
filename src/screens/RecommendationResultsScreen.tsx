import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colors, spacing, radius } from '../theme';
import { useTranslation } from '@/i18n/useTranslation';
import { useAppStore } from '@/store/appStore';
import type { RecommendationResult } from '@/services/apiService';

// The farm's latest real recommendation (from the store). This screen used to show a
// hard-coded prototype list, so every farmer saw the same three varieties and scores.

const TOLERANCE: Record<string, string> = { high: 'High', moderate: 'Moderate', low: 'Low' };
const tol = (v?: string) => TOLERANCE[String(v ?? '').toLowerCase()] ?? '—';

export const RecommendationResultsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const tr = useTranslation();
  const rec = useAppStore(s => s.latestRecommendation) as any;
  const results: RecommendationResult[] = [...(rec?.results ?? [])].sort((a, b) => a.rank - b.rank);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{tr.recHeaderTitle}</Text>
          <Text style={s.headerSub}>{tr.recHeaderSub}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {results.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="leaf-outline" size={30} color={colors.primary} />
            <Text style={s.emptyTitle}>No recommendation yet</Text>
            <Text style={s.emptyBody}>
              Scan your farm to get rice varieties matched to its soil, rainfall, and flood risk.
            </Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => navigation.navigateDeprecated('EnvironmentalScanner')}
              activeOpacity={0.85}
            >
              <Ionicons name="scan-outline" size={16} color="#FFFFFF" />
              <Text style={s.emptyBtnText}>Scan my farm</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {rec?.created_at ? (
              <Text style={s.meta}>Based on your scan of {String(rec.created_at).slice(0, 10)}</Text>
            ) : null}
            {results.map(r => (
              <View key={r.variety.id} style={[s.card, r.rank === 1 && s.cardTop]}>
                <View style={s.cardHead}>
                  <View style={[s.rank, r.rank === 1 && s.rankTop]}>
                    <Text style={[s.rankText, r.rank === 1 && { color: '#FFFFFF' }]}>{r.rank}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{r.variety.common_name}</Text>
                    <Text style={s.code}>{r.variety.nsic_code}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.score}>{Math.round(r.rsi_score)}</Text>
                    <Text style={s.scoreLabel}>RSI</Text>
                  </View>
                </View>
                <Text style={s.cls}>{r.suitability_class}</Text>
                <View style={s.facts}>
                  <Fact label="Days to harvest" value={`${r.variety.maturity_days}`} />
                  <Fact label="Avg. yield" value={`${r.variety.avg_yield_t_ha} t/ha`} />
                  <Fact label="Flood tol." value={tol(r.variety.submergence_tolerance)} />
                  <Fact label="Drought tol." value={tol(r.variety.drought_tolerance)} />
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
  root:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: 16, paddingBottom: 110 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10,
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  headerSub:   { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  meta:        { fontSize: 12, color: colors.textTertiary, marginBottom: 12 },

  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12,
  },
  cardTop:  { borderColor: colors.primary + '60' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
  },
  rankTop:    { backgroundColor: colors.primary },
  rankText:   { fontSize: 13, fontWeight: '700', color: colors.text },
  name:       { fontSize: 15, fontWeight: '700', color: colors.text },
  code:       { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
  score:      { fontSize: 20, fontWeight: '800', color: colors.primary },
  scoreLabel: { fontSize: 10, color: colors.textTertiary },
  cls:        { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginTop: 8 },
  facts:      { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  fact: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.background,
    borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 10,
  },
  factLabel: { fontSize: 11, color: colors.textTertiary },
  factValue: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
  fit:       { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginTop: 10 },

  empty:      { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyBody:  { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, maxWidth: 300 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 18,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
