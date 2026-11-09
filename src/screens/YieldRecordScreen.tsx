import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput as RNTextInput, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAccessibility } from '../context/AccessibilityContext';
import { apiProgress, apiPredictions, apiScan } from '@/services/apiService';
import { useSelectedFarm } from '@/hooks/useSelectedFarm';
import { useAppStore } from '@/store/appStore';
import { useTranslation } from '@/i18n/useTranslation';
import { daysAgoISO } from '@/utils/sowing';
import { firstError } from '@/utils/passwordReset';
import { CAVAN_KG, DRY_MOISTURE, FRESH_MOISTURE, harvestFigures } from '@/utils/harvest';

interface YieldRecordScreenProps {
  onSaveYield?: (yieldData: any) => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const HarvestPhoto = require('../assets/bg/harvest.jpg');

// Optional details, kept in the record's notes (the model does not read them)
const QUALITY_OPTIONS = [{ value: 'Good', key: 'yhGood' }, { value: 'Average', key: 'yhAverage' }, { value: 'Poor', key: 'yhPoor' }];
const METHOD_OPTIONS  = [{ value: 'Manual', key: 'yhManual' }, { value: 'Mechanical', key: 'yhMachine' }];

/** A row of tap-to-choose chips. */
function Chips({ options, value, onSelect, T }: {
  options: { value: string; label: string; icon?: IoniconsName }[];
  value: string; onSelect: (v: string) => void; T: boolean;
}) {
  return (
    <View style={s.chipRow}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <TouchableOpacity key={o.value} style={[s.chip, active && s.chipOn]} onPress={() => onSelect(o.value)} activeOpacity={0.8}>
            {o.icon && <Ionicons name={o.icon} size={15} color={active ? '#FFFFFF' : '#111827'} />}
            <Text style={[s.chipText, active && s.chipTextOn, T && { fontSize: 14 }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Record the harvest, the DA way: sacks × kg per sack, dried or fresh, over the area
 * actually harvested → dry palay t/ha and cavans/ha (utils/harvest). The season, barangay,
 * ecosystem and seed type come from the farm and the crop, so each harvest is a clean row
 * for the yield model.
 */
export const YieldRecordScreen: React.FC<YieldRecordScreenProps> = ({ onSaveYield }) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isLargeText } = useAccessibility();
  const T = isLargeText;
  const tr = useTranslation();

  const route       = useRoute<any>();
  const activeCycle = useAppStore(s => s.activeCycle) as any;
  const latestRec   = useAppStore(s => s.latestRecommendation) as any;
  const cycleId     = route.params?.cycleId ?? activeCycle?.id ?? null;
  const farm        = useSelectedFarm() as any;

  // The variety actually planted (the crop cycle's), not just the top-ranked one
  const results     = (latestRec?.results ?? []) as any[];
  const plantedVar  = results.map(r => r.variety).find(v => v?.id === activeCycle?.variety) ?? results[0]?.variety;
  const variety     = activeCycle?.variety_name ?? plantedVar?.common_name ?? '—';

  const [saved,          setSaved]          = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [predictedYield, setPredictedYield] = useState<number | null>(null);
  const [harvestDate,    setHarvestDate]    = useState(daysAgoISO(0));
  const [recordSaved,    setRecordSaved]    = useState(false);
  const [pickDate,       setPickDate]       = useState(false);
  const [areaHarvested,  setAreaHarvested]  = useState(farm?.area_hectares ? String(farm.area_hectares) : '');
  const [sacks,          setSacks]          = useState('');
  const [kgPerSack,      setKgPerSack]      = useState(String(CAVAN_KG));
  const [moisture,       setMoisture]       = useState(DRY_MOISTURE);
  const [grainQuality,   setGrainQuality]   = useState('');
  const [harvestMethod,  setHarvestMethod]  = useState('');

  const figures = harvestFigures(parseFloat(sacks), parseFloat(kgPerSack), parseFloat(areaHarvested), moisture);

  // Android Back must not throw away a harvest that was typed in but not saved
  const unsaved = sacks.trim() !== '' && !saved && !loading;
  useEffect(() => navigation.addListener('beforeRemove', (e: any) => {
    if (!unsaved) return;
    e.preventDefault();
    Alert.alert(tr.leaveFormTitle, tr.leaveFormBody, [
      { text: tr.leaveFormStay, style: 'cancel' },
      { text: tr.leaveFormLeave, style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
    ]);
  }), [navigation, unsaved, tr]);

  const handleSave = async () => {
    if (!figures || figures.impossible) {
      Alert.alert(tr.yieldRecordHeader, figures ? tr.yhImpossible : tr.yhNeed);
      return;
    }
    if (!cycleId) {   // nothing to attach it to: never report a harvest that was not saved
      Alert.alert(tr.yhNotSavedT, tr.plogNotSavedB);
      return;
    }
    setLoading(true);
    try {
      const area  = parseFloat(areaHarvested);
      const notes = [grainQuality && `Quality: ${grainQuality}`, harvestMethod && `Method: ${harvestMethod}`,
                     `${sacks} sacks × ${kgPerSack} kg`].filter(Boolean).join(' · ');
      const record = {
        harvest_date:      harvestDate,
        area_harvested_ha: area,
        gross_yield_kg:    figures.totalKg,
        net_yield_kg:      figures.dryKg,     // dry palay at 14%, the DA basis
        moisture_pct:      moisture,
        notes,
      };
      // A crop has one harvest record: editing changes it, it does not add another
      const hasRecord = recordSaved || (activeCycle?.id === cycleId && activeCycle?.status === 'completed');
      await (hasRecord ? apiProgress.updateYield(cycleId, record) : apiProgress.createYield(cycleId, record).catch((err: any) => {
        // The phone's copy of the cycle can be older than the server's
        if (/already exists/i.test(String(err?.response?.data?.detail ?? ''))) return apiProgress.updateYield(cycleId, record);
        throw err;
      }));
      setRecordSaved(true);
      // The server ends the season with the harvest: Home and Progress follow at once
      if (activeCycle?.id === cycleId) {
        useAppStore.getState().setActiveCycle({ ...activeCycle, status: 'completed', yield_per_ha: figures.tHa });
      }
      try {
        // Predict from the farm's own conditions (latest scan + variety), never from the
        // harvest just entered, so "predicted vs actual" is a real comparison
        const scanRes = farm?.id ? await apiScan.history(farm.id) : null;
        const scan: any = (scanRes?.data ?? [])[0] ?? null;
        const predRes = await apiPredictions.predict({
          area_ha:           area,
          soil_ph:           scan?.soil_ph,
          organic_matter:    scan?.organic_matter,
          avg_temperature:   scan?.avg_temperature,
          seasonal_rainfall: scan?.seasonal_rainfall_mm,
          humidity:          scan?.humidity_pct,
          elevation_m:       scan?.elevation_m,
          flood_risk:        scan?.flood_risk,
          ecosystem:         farm?.ecosystem,
          maturity_days:     plantedVar?.maturity_days,
          variety_avg_yield: plantedVar?.avg_yield_t_ha,
          farm_id:           farm?.id,
          variety_id:        activeCycle?.variety ?? plantedVar?.id,
          season:            activeCycle?.season,
        });
        setPredictedYield(predRes.data.predicted_yield_t_ha);
      } catch {}
      onSaveYield?.({ harvestDate, variety, areaHarvested, actualYield: figures.dryKg, grainQuality, harvestMethod });
      setSaved(true);
    } catch (err: any) {
      const data = err?.response?.data;
      Alert.alert(tr.yhNotSavedT, firstError(data?.harvest_date) ?? firstError(data?.net_yield_kg) ?? tr.plogNotSavedB);
    } finally {
      setLoading(false);
    }
  };

  // Without a prediction, compare with the variety's average yield instead of a fixed number
  const yieldPerHa    = figures?.tHa ?? 0;
  const expectedYield = predictedYield ?? plantedVar?.avg_yield_t_ha ?? 6.5;
  const yieldPct      = Math.round((yieldPerHa / expectedYield) * 100);
  const perfStatus    = yieldPct >= 100 ? 'success' : yieldPct >= 80 ? 'warning' : 'error';
  const perfLabel     = yieldPct >= 100 ? 'Excellent' : yieldPct >= 80 ? 'Good' : 'Below Expected';

  const perfColors = {
    success: { bg: '#ECFDF5', border: '#D1FAE5', text: '#065F46' },
    warning: { bg: '#FFF7ED', border: '#FDE68A', text: '#D97706' },
    error:   { bg: '#FEF2F2', border: '#FECACA', text: '#EF4444' },
  };
  const pc = perfColors[perfStatus as keyof typeof perfColors];
  const word = (key: string) => (tr as any)[key] as string;

  // ── Success screen ──────────────────────────────────────────────────────────
  if (saved) {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.successScroll} showsVerticalScrollIndicator={false}>

          <View style={s.successAvatar}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={[s.successTitle, T && { fontSize: 28 }]}>{tr.yhSavedTitle}</Text>
          <Text style={[s.successSub, T && { fontSize: 16 }]}>{tr.yhSavedSub}</Text>

          <View style={[s.section, { width: '100%', marginTop: 20 }]}>
            <View style={s.card}>
              <Text style={s.cardTitleNew}>{tr.yieldSummary}</Text>
              {([
                { icon: 'calendar-outline'  as IoniconsName, label: tr.yieldHarvestDate, value: harvestDate || '—' },
                { icon: 'leaf-outline'      as IoniconsName, label: tr.yieldVarietyLbl,  value: variety || '—' },
                { icon: 'resize-outline'    as IoniconsName, label: tr.yhArea,           value: areaHarvested ? `${areaHarvested} ha` : '—' },
                { icon: 'cube-outline'      as IoniconsName, label: tr.yhDryTotal,       value: figures ? `${figures.dryKg} kg` : '—' },
                { icon: 'star-outline'      as IoniconsName, label: tr.yhQuality,        value: grainQuality ? word(QUALITY_OPTIONS.find(q => q.value === grainQuality)!.key) : '—' },
                { icon: 'construct-outline' as IoniconsName, label: tr.yhMethod,         value: harvestMethod ? word(METHOD_OPTIONS.find(m => m.value === harvestMethod)!.key) : '—' },
              ]).filter(row => row.value !== '—').map((row, i, arr) => (
                <View key={row.label} style={[s.listRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Ionicons name={row.icon} size={14} color="#9CA3AF" />
                    <Text style={[s.rowLabel, T && { fontSize: 15 }]}>{row.label.replace(/\s*\(.*\)$/, '')}</Text>
                  </View>
                  <Text style={[s.rowValue, T && { fontSize: 15 }]}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[s.perfBanner, { backgroundColor: pc.bg, borderColor: pc.border, width: '100%' }]}>
            <Ionicons
              name={perfStatus === 'success' ? 'trophy' : perfStatus === 'warning' ? 'thumbs-up-outline' : 'alert-circle-outline'}
              size={20} color={pc.text}
            />
            <View style={{ flex: 1 }}>
              <Text style={[s.perfBannerTitle, { color: pc.text }]}>{perfLabel}</Text>
              <Text style={s.perfBannerSub}>
                {tr.yhResult.replace('{tha}', yieldPerHa.toFixed(2)).replace('{cav}', String(figures?.cavansHa ?? 0))} · {yieldPct}%
              </Text>
            </View>
          </View>

          {predictedYield !== null && (
            <View style={[s.card, { width: '100%', marginTop: 12 }]}>
              <Text style={{ fontSize: 12, color: '#6B7280', fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>{tr.yhPossible}</Text>
              <Text style={{ fontSize: 28, color: '#111827', fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>{predictedYield} t/ha</Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{tr.yhPossibleNote}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 }}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setSaved(false)} activeOpacity={0.7}>
              <Text style={[s.cancelBtnText, T && { fontSize: 15 }]}>{tr.commonEdit}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={() => navigation.navigateDeprecated('ProgressDashboardHome', { tab: 'trends', at: Date.now() })} activeOpacity={0.85}>
              <Ionicons name="trending-up" size={16} color="#FFFFFF" />
              <Text style={[s.saveBtnText, T && { fontSize: 15 }]}>{tr.yhViewProgress}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Form screen ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, T && { fontSize: 24 }]}>{tr.yieldRecordHeader}</Text>
          <Text style={s.headerSub}>{farm?.name ?? ''}</Text>
        </View>
        <View style={s.backBtn}><NotificationBell color="#111827" size={20} /></View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={s.section}>
          <Image source={HarvestPhoto} style={s.harvestPhoto} resizeMode="cover" />
          <View style={s.card}>
            <Text style={s.cardTitleNew}>{tr.yieldForm}</Text>

            {/* The variety planted, from the crop cycle */}
            <View style={s.readOnlyRow}>
              <View>
                <Text style={s.readOnlyLabel}>{tr.yieldVarietyLbl}</Text>
                <Text style={s.readOnlyValue}>{variety}</Text>
              </View>
              <Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" />
            </View>

            {/* Harvest day: one tap for today or yesterday */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.yhDay}</Text>
              <Chips
                T={T}
                value={pickDate ? 'pick' : harvestDate}
                options={[
                  { value: daysAgoISO(0), label: tr.plogToday },
                  { value: daysAgoISO(1), label: tr.plogYesterday },
                  { value: 'pick', label: tr.plogPickDate, icon: 'calendar-outline' },
                ]}
                onSelect={v => { if (v === 'pick') setPickDate(true); else { setHarvestDate(v); setPickDate(false); } }}
              />
              {pickDate && (
                <View style={[s.inputBox, { marginTop: 8 }]}>
                  <RNTextInput
                    style={[s.input, T && { fontSize: 16 }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    value={harvestDate}
                    onChangeText={setHarvestDate}
                  />
                </View>
              )}
            </View>

            {/* Area actually harvested (the DA's yield is per area harvested) */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.yhArea} <Text style={s.req}>*</Text></Text>
              <Text style={[s.hint, T && { fontSize: 13 }]}>{tr.yhAreaHint}</Text>
              <View style={s.inputBox}>
                <RNTextInput
                  style={[s.input, T && { fontSize: 16 }]}
                  placeholder="e.g. 1.5"
                  placeholderTextColor="#9CA3AF"
                  value={areaHarvested}
                  onChangeText={setAreaHarvested}
                  keyboardType="decimal-pad"
                />
                <Text style={s.unit}>ha</Text>
              </View>
            </View>

            {/* How much: sacks × kg per sack */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.yhHowMuch} <Text style={s.req}>*</Text></Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <View style={[s.inputBox, { flex: 1 }]}>
                  <RNTextInput
                    style={[s.input, T && { fontSize: 16 }]}
                    placeholder="e.g. 100"
                    placeholderTextColor="#9CA3AF"
                    value={sacks}
                    onChangeText={setSacks}
                    keyboardType="decimal-pad"
                  />
                  <Text style={s.unit}>{tr.yhSacks}</Text>
                </View>
                <Text style={s.times}>×</Text>
                <View style={[s.inputBox, { flex: 1 }]}>
                  <RNTextInput
                    style={[s.input, T && { fontSize: 16 }]}
                    value={kgPerSack}
                    onChangeText={setKgPerSack}
                    keyboardType="decimal-pad"
                  />
                  <Text style={s.unit}>{tr.yhKgPerSack}</Text>
                </View>
              </View>
              {figures && (
                <Text style={[s.hint, { marginTop: 6, marginBottom: 0 }]}>{tr.yhTotal.replace('{kg}', figures.totalKg.toLocaleString())}</Text>
              )}
            </View>

            {/* Dried or fresh: the DA counts dry palay at 14% moisture */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.yhDried}</Text>
              <Chips
                T={T}
                value={String(moisture)}
                options={[
                  { value: String(DRY_MOISTURE),   label: tr.yhDry },
                  { value: String(FRESH_MOISTURE), label: tr.yhFresh },
                ]}
                onSelect={v => setMoisture(Number(v))}
              />
            </View>

            {/* The yield as the DA reports it, worked out as the farmer types */}
            {figures && (
              <View style={[s.resultBox, figures.unusual && s.resultBoxWarn]}>
                <Ionicons name={figures.unusual ? 'alert-circle-outline' : 'stats-chart-outline'} size={18}
                          color={figures.unusual ? '#B45309' : '#059669'} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.resultText, figures.unusual && { color: '#92400E' }, T && { fontSize: 16 }]}>
                    {tr.yhResult.replace('{tha}', figures.tHa.toFixed(2)).replace('{cav}', String(figures.cavansHa))}
                  </Text>
                  <Text style={s.resultNote}>{figures.impossible ? tr.yhImpossible : figures.unusual ? tr.yhCheck : tr.yhResultNote}</Text>
                </View>
              </View>
            )}

            {/* Optional details */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.yhQuality}</Text>
              <Chips T={T} value={grainQuality} onSelect={setGrainQuality}
                     options={QUALITY_OPTIONS.map(q => ({ value: q.value, label: word(q.key) }))} />
            </View>
            <View style={[s.fieldWrap, { marginBottom: 0 }]}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.yhMethod}</Text>
              <Chips T={T} value={harvestMethod} onSelect={setHarvestMethod}
                     options={METHOD_OPTIONS.map(m => ({ value: m.value, label: word(m.key) }))} />
            </View>

          </View>
        </View>

        {/* Save button row — primary/secondary */}
        <View style={[s.section, { flexDirection: 'row', gap: 10, marginTop: 20 }]}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[s.cancelBtnText, T && { fontSize: 15 }]}>{tr.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, (loading || !figures) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={loading || !figures || figures.impossible}
            activeOpacity={0.85}
          >
            <Ionicons name={loading ? 'hourglass-outline' : 'checkmark'} size={18} color="#FFFFFF" />
            <Text style={[s.saveBtnText, T && { fontSize: 15 }]}>{loading ? tr.yhSaving : tr.save}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F2F1' },
  scroll: { paddingBottom: 150 },   // room for the floating tab bar

  successScroll: {
    paddingHorizontal: 20, paddingBottom: 150,
    alignItems: 'center', justifyContent: 'center', flexGrow: 1,
  },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 21, color: '#111827', letterSpacing: -0.4, fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 1, fontFamily: 'Inter_500Medium' },

  /* Section */
  section: { paddingHorizontal: 16, marginTop: 12 },
  harvestPhoto: { width: '100%', height: 150, borderRadius: 24, marginBottom: 12, backgroundColor: '#E4E6E4' },
  cardTitleNew: { fontSize: 16, color: '#111827', marginBottom: 14, fontFamily: 'Inter_700Bold' },

  /* Card */
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },

  /* Form */
  fieldWrap: { marginBottom: 22 },
  label: { fontSize: 14, color: '#111827', marginBottom: 10, fontFamily: 'Inter_700Bold' },
  hint: { fontSize: 12, color: '#6B7280', marginTop: -4, marginBottom: 10, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  req:     { color: '#EF4444' },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: '#F1F2F1', paddingHorizontal: 16, height: 54 },
  input: { flex: 1, fontSize: 16, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  unit: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  times: { fontSize: 18, color: '#6B7280', fontFamily: 'Inter_700Bold' },

  /* Chips */
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: '#F1F2F1', minHeight: 44, paddingHorizontal: 16 },
  chipOn: { backgroundColor: '#111827' },
  chipText: { fontSize: 14, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  chipTextOn: { color: '#FFFFFF' },

  /* The worked-out yield */
  resultBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 18, backgroundColor: '#E8F5EF', padding: 16, marginBottom: 22 },
  resultBoxWarn: { backgroundColor: '#FEF3DC' },
  resultText: { fontSize: 18, color: '#065F46', letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  resultNote: { fontSize: 12, color: '#374151', marginTop: 4, lineHeight: 17, fontFamily: 'Inter_500Medium' },

  /* List rows */
  listRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  rowLabel: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  rowValue: { fontSize: 14, color: '#111827', fontFamily: 'Inter_700Bold' },

  /* Buttons — primary/secondary pair, equal width */
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 18, backgroundColor: '#111827' },
  saveBtnText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
  cancelBtn: { flex: 1, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cancelBtnText: { fontSize: 15, color: '#111827', fontFamily: 'Inter_600SemiBold' },

  /* Read-only variety row at top of form */
  readOnlyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1F2F1', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 22 },
  readOnlyLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2, fontFamily: 'Inter_500Medium' },
  readOnlyValue: { fontSize: 15, color: '#111827', fontFamily: 'Inter_700Bold' },

  /* Performance banner */
  perfBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 16, marginTop: 12 },
  perfBannerTitle: { fontSize: 15, marginBottom: 2, fontFamily: 'Inter_700Bold' },
  perfBannerSub:   { fontSize: 12, color: '#6B7280' },

  /* Success */
  successAvatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 40, marginBottom: 20,
  },
  successTitle: { fontSize: 26, color: '#111827', letterSpacing: -0.5, textAlign: 'center', marginBottom: 10, fontFamily: 'Inter_700Bold' },
  successSub: {
    fontSize: 14, color: '#6B7280', textAlign: 'center',
    lineHeight: 22, paddingHorizontal: 16,
  },
});
