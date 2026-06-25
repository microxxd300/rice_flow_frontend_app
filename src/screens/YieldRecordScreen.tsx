import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput as RNTextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAccessibility } from '../context/AccessibilityContext';
import { apiProgress, apiPredictions } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';
import { useTranslation } from '@/i18n/useTranslation';

interface YieldRecordScreenProps {
  onSaveYield?: (yieldData: any) => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const QUALITY_OPTIONS = ['Good', 'Average', 'Poor'];
const METHOD_OPTIONS  = ['Manual', 'Mechanical'];

function Dropdown({
  placeholder, value, options, open, onToggle, onSelect, T,
}: {
  icon?: IoniconsName; placeholder: string; value: string;
  options: string[]; open: boolean;
  onToggle: () => void; onSelect: (v: string) => void; T: boolean;
}) {
  return (
    <View>
      <TouchableOpacity style={s.inputBox} onPress={onToggle} activeOpacity={0.75}>
        <Text style={[s.input, { color: value ? '#111827' : '#D1D5DB' }, T && { fontSize: 16 }]}>
          {value || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {open && (
        <View style={s.dropMenu}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt}
              style={[s.dropItem, i < options.length - 1 && s.dropItemBorder]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.7}
            >
              <Text style={[s.dropItemText, value === opt && s.dropItemTextActive, T && { fontSize: 15 }]}>
                {opt}
              </Text>
              {value === opt && <Ionicons name="checkmark" size={16} color="#059669" />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export const YieldRecordScreen: React.FC<YieldRecordScreenProps> = ({ onSaveYield }) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isLargeText } = useAccessibility();
  const T = isLargeText;
  const tr = useTranslation();

  const route       = useRoute<any>();
  const activeCycle = useAppStore(s => s.activeCycle);
  const latestRec   = useAppStore(s => s.latestRecommendation);
  const cycleId     = route.params?.cycleId ?? activeCycle?.id ?? null;

  // Auto-fill variety from the cycle's recommendation (no free-text typing → no typos)
  const cycleVariety = (latestRec as any)?.results?.[0]?.variety?.common_name ?? '—';

  const [saved,            setSaved]            = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [predictedYield,   setPredictedYield]   = useState<number | null>(null);
  const [modelUsed,        setModelUsed]        = useState('');
  const [harvestDate,      setHarvestDate]      = useState('');
  const [areaHarvested, setAreaHarvested] = useState('');
  const [actualYield,   setActualYield]   = useState('');
  const [sacks,         setSacks]         = useState('');     // Bilang ng sako (50 kg each)
  const [netYield,      setNetYield]      = useState('');     // Optional; computed if blank
  const [moisturePct,   setMoisturePct]   = useState('14');   // Default to 14% (standard)
  const [grainQuality,  setGrainQuality]  = useState('');
  const [harvestMethod, setHarvestMethod] = useState('');
  const [openQuality,   setOpenQuality]   = useState(false);
  const [openMethod,    setOpenMethod]    = useState(false);
  const variety = cycleVariety;

  // Auto-convert sacks → kg when user types in sacks
  const handleSacksChange = (v: string) => {
    setSacks(v);
    const n = parseFloat(v);
    if (!isNaN(n) && n > 0) setActualYield(String(Math.round(n * 50)));
  };

  const handleSave = async () => {
    if (!harvestDate || !actualYield) {
      Alert.alert('Kulang', 'Punan ang petsa ng pag-ani at dami ng ani.');
      return;
    }
    setLoading(true);
    try {
      const grossYieldKg = parseFloat(actualYield) || 0;
      const areaN        = parseFloat(areaHarvested) || 1;
      const moistureN    = parseFloat(moisturePct) || 14;
      // If farmer didn't enter net yield, derive from gross using moisture loss.
      // Standard formula: net = gross × (100 − moisture) / 86  (normalized to 14% MC)
      const netN = parseFloat(netYield) || +(grossYieldKg * (100 - moistureN) / 86).toFixed(0);
      if (cycleId) {
        await apiProgress.createYield(cycleId, {
          harvest_date:      harvestDate,
          area_harvested_ha: areaN,
          gross_yield_kg:    grossYieldKg,
          net_yield_kg:      netN,
          moisture_pct:      moistureN,
        });
      }
      try {
        const predRes = await apiPredictions.predict({
          area_ha:           areaN,
          variety_avg_yield: grossYieldKg / 1000 / areaN,
        });
        setPredictedYield(predRes.data.predicted_yield_t_ha);
        setModelUsed(predRes.data.model_used);
      } catch {}
      onSaveYield?.({ harvestDate, variety, areaHarvested, actualYield, grainQuality, harvestMethod });
      setSaved(true);
    } catch {
      Alert.alert('Error', 'Hindi ma-save ang rekord. Subukan muli.');
    } finally {
      setLoading(false);
    }
  };

  const yieldNum   = parseFloat(actualYield)   || 0;
  const areaNum    = parseFloat(areaHarvested) || 1;
  const yieldPerHa = (yieldNum / areaNum / 1000).toFixed(2);

  const expectedYield = predictedYield ?? 6.5;
  const yieldPct      = Math.round((parseFloat(yieldPerHa) / expectedYield) * 100);
  const perfStatus    = yieldPct >= 100 ? 'success' : yieldPct >= 80 ? 'warning' : 'error';
  const perfLabel     = yieldPct >= 100 ? 'Napakahusay' : yieldPct >= 80 ? 'Mahusay' : 'Kulang sa Inaasahan';

  const perfColors = {
    success: { bg: '#ECFDF5', border: '#D1FAE5', text: '#065F46' },
    warning: { bg: '#FFF7ED', border: '#FDE68A', text: '#D97706' },
    error:   { bg: '#FEF2F2', border: '#FECACA', text: '#EF4444' },
  };
  const pc = perfColors[perfStatus as keyof typeof perfColors];

  // ── Success screen ──────────────────────────────────────────────────────────
  if (saved) {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.successScroll} showsVerticalScrollIndicator={false}>

          <View style={s.successAvatar}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={[s.successTitle, T && { fontSize: 28 }]}>Harvest Recorded!</Text>
          <Text style={[s.successSub, T && { fontSize: 16 }]}>
            Matagumpay na na-save ang rekord ng inyong ani para sa season na ito.
          </Text>

          <View style={[s.section, { width: '100%', marginTop: 20 }]}>
            <View style={s.card}>
              <Text style={s.cardTitleNew}>{tr.yieldSummary}</Text>
              {([
                { icon: 'calendar-outline'  as IoniconsName, label: tr.yieldHarvestDate, value: harvestDate   || '—' },
                { icon: 'leaf-outline'      as IoniconsName, label: 'Uri ng Palay',      value: variety       || '—' },
                { icon: 'resize-outline'    as IoniconsName, label: 'Lugar na Inani',    value: areaHarvested ? `${areaHarvested} ha` : '—' },
                { icon: 'cube-outline'      as IoniconsName, label: 'Total Yield',       value: actualYield   ? `${actualYield} kg`   : '—' },
                { icon: 'star-outline'      as IoniconsName, label: 'Kalidad ng Bigas',  value: grainQuality  || '—' },
                { icon: 'construct-outline' as IoniconsName, label: 'Paraan ng Pag-ani', value: harvestMethod || '—' },
              ]).map((row, i, arr) => (
                <View key={row.label} style={[s.listRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={row.icon} size={14} color="#9CA3AF" />
                    <Text style={[s.rowLabel, T && { fontSize: 15 }]}>{row.label}</Text>
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
              <Text style={s.perfBannerSub}>{yieldPct}% ng inaasahang ani ({yieldPerHa} t/ha)</Text>
            </View>
          </View>

          {predictedYield !== null && (
            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 14, borderWidth: 1, borderColor: '#D1FAE5', padding: 14, width: '100%', marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700', marginBottom: 4 }}>AI YIELD PREDICTION ({modelUsed})</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1F6B3F' }}>{predictedYield} t/ha</Text>
              <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Based on your farm and weather data</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 }}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setSaved(false)} activeOpacity={0.7}>
              <Text style={[s.cancelBtnText, T && { fontSize: 15 }]}>{tr.commonEdit}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={() => navigation.navigate('YieldProgress')} activeOpacity={0.85}>
              <Ionicons name="trending-up" size={16} color="#FFFFFF" />
              <Text style={[s.saveBtnText, T && { fontSize: 15 }]}>View Progress</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={s.titleIcon}>
            <Ionicons name="basket-outline" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[s.headerTitle, T && { fontSize: 15 }]}>{tr.yieldRecordHeader}</Text>
            <Text style={s.headerSub}>Santos Family Farm</Text>
          </View>
        </View>
        <NotificationBell color="#059669" size={22} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.section}>
          <View style={s.card}>
            <Text style={s.cardTitleNew}>{tr.yieldForm}</Text>

            {/* Read-only variety from cycle */}
            <View style={s.readOnlyRow}>
              <View>
                <Text style={s.readOnlyLabel}>{tr.yieldVarietyLbl}</Text>
                <Text style={s.readOnlyValue}>{variety}</Text>
              </View>
              <Ionicons name="lock-closed-outline" size={14} color="#9CA3AF" />
            </View>

            {/* Harvest Date */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.yieldHarvestDate} <Text style={s.req}>*</Text></Text>
              <View style={s.inputBox}>
                <RNTextInput
                  style={[s.input, T && { fontSize: 16 }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#D1D5DB"
                  value={harvestDate}
                  onChangeText={setHarvestDate}
                />
              </View>
            </View>

            {/* Lugar na Inani */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>Area Harvested <Text style={s.req}>*</Text></Text>
              <View style={s.inputBox}>
                <RNTextInput
                  style={[s.input, T && { fontSize: 16 }]}
                  placeholder="e.g. 2.5"
                  placeholderTextColor="#D1D5DB"
                  value={areaHarvested}
                  onChangeText={setAreaHarvested}
                  keyboardType="decimal-pad"
                />
                <Text style={s.unit}>ha</Text>
              </View>
            </View>

            {/* Bag count + Total Yield (linked) */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[s.fieldWrap, { flex: 1 }]}>
                <Text style={[s.label, T && { fontSize: 14 }]}>Number of bags</Text>
                <View style={s.inputBox}>
                  <RNTextInput
                    style={[s.input, T && { fontSize: 16 }]}
                    placeholder="e.g. 165"
                    placeholderTextColor="#D1D5DB"
                    value={sacks}
                    onChangeText={handleSacksChange}
                    keyboardType="decimal-pad"
                  />
                  <Text style={s.unit}>sako</Text>
                </View>
              </View>
              <View style={[s.fieldWrap, { flex: 1.2 }]}>
                <Text style={[s.label, T && { fontSize: 14 }]}>Total Yield <Text style={s.req}>*</Text></Text>
                <View style={s.inputBox}>
                  <RNTextInput
                    style={[s.input, T && { fontSize: 16 }]}
                    placeholder="e.g. 8250"
                    placeholderTextColor="#D1D5DB"
                    value={actualYield}
                    onChangeText={(v) => { setActualYield(v); setSacks(''); }}
                    keyboardType="decimal-pad"
                  />
                  <Text style={s.unit}>kg</Text>
                </View>
              </View>
            </View>

            {/* Moisture + Net yield row */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[s.fieldWrap, { flex: 1 }]}>
                <Text style={[s.label, T && { fontSize: 14 }]}>Moisture</Text>
                <View style={s.inputBox}>
                  <RNTextInput
                    style={[s.input, T && { fontSize: 16 }]}
                    placeholder="14"
                    placeholderTextColor="#D1D5DB"
                    value={moisturePct}
                    onChangeText={setMoisturePct}
                    keyboardType="decimal-pad"
                  />
                  <Text style={s.unit}>%</Text>
                </View>
              </View>
              <View style={[s.fieldWrap, { flex: 1.2 }]}>
                <Text style={[s.label, T && { fontSize: 14 }]}>Net Yield</Text>
                <View style={s.inputBox}>
                  <RNTextInput
                    style={[s.input, T && { fontSize: 16 }]}
                    placeholder="auto"
                    placeholderTextColor="#D1D5DB"
                    value={netYield}
                    onChangeText={setNetYield}
                    keyboardType="decimal-pad"
                  />
                  <Text style={s.unit}>kg</Text>
                </View>
              </View>
            </View>

            {/* Kalidad ng Bigas */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>Rice Quality</Text>
              <Dropdown
                icon="star-outline"
                placeholder="Select quality..."
                value={grainQuality}
                options={QUALITY_OPTIONS}
                open={openQuality}
                onToggle={() => { setOpenQuality(v => !v); setOpenMethod(false); }}
                onSelect={v => { setGrainQuality(v); setOpenQuality(false); }}
                T={T}
              />
            </View>

            {/* Paraan ng Pag-ani */}
            <View style={[s.fieldWrap, { marginBottom: 0 }]}>
              <Text style={[s.label, T && { fontSize: 14 }]}>Harvest Method</Text>
              <Dropdown
                icon="construct-outline"
                placeholder="Select method..."
                value={harvestMethod}
                options={METHOD_OPTIONS}
                open={openMethod}
                onToggle={() => { setOpenMethod(v => !v); setOpenQuality(false); }}
                onSelect={v => { setHarvestMethod(v); setOpenMethod(false); }}
                T={T}
              />
            </View>

          </View>
        </View>

        {/* Save button row — primary/secondary */}
        <View style={[s.section, { flexDirection: 'row', gap: 10, marginTop: 20 }]}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[s.cancelBtnText, T && { fontSize: 15 }]}>{tr.cancel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, loading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Ionicons name={loading ? 'hourglass-outline' : 'checkmark'} size={18} color="#FFFFFF" />
            <Text style={[s.saveBtnText, T && { fontSize: 15 }]}>{loading ? 'Sine-save...' : 'I-save'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#F7F9F8' },
  scroll:{ paddingBottom: 120 },

  successScroll: {
    paddingHorizontal: 20, paddingBottom: 40,
    alignItems: 'center', justifyContent: 'center', flexGrow: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  titleIcon:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  headerBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  bellDot:     { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' },

  /* Section */
  section:    { paddingHorizontal: 20, marginTop: 24 },
  cardTitleNew: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16,
  },

  /* Form */
  fieldWrap: { marginBottom: 20 },
  label:   { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  req:     { color: '#EF4444' },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, height: 52,
  },
  input:   { flex: 1, fontSize: 15, color: '#111827' },
  unit:    { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },

  /* Dropdown */
  dropMenu: {
    marginTop: 4, backgroundColor: '#FFFFFF',
    borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  dropItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
  },
  dropItemBorder:     { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  dropItemText:       { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  dropItemTextActive: { color: '#059669', fontWeight: '700' },

  /* List rows */
  listRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  /* Buttons — primary/secondary pair, equal width */
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 50, borderRadius: 12,
    backgroundColor: '#059669',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText:    { fontSize: 14, color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.2 },
  cancelBtn: {
    flex: 1, height: 50, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  cancelBtnText:  { fontSize: 14, fontWeight: '600', color: '#374151' },

  /* Read-only variety row at top of form */
  readOnlyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
  },
  readOnlyLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
  readOnlyValue: { fontSize: 14, fontWeight: '700', color: '#111827' },

  /* Performance banner */
  perfBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12,
  },
  perfBannerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  perfBannerSub:   { fontSize: 12, color: '#6B7280' },

  /* Success */
  successAvatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    marginTop: 40, marginBottom: 20,
  },
  successTitle: {
    fontSize: 26, fontWeight: '700', color: '#111827',
    letterSpacing: -0.5, textAlign: 'center', marginBottom: 10,
  },
  successSub: {
    fontSize: 14, color: '#6B7280', textAlign: 'center',
    lineHeight: 22, paddingHorizontal: 16,
  },
});
