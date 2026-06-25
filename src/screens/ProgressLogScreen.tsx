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
import { apiProgress, apiGuides } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/i18n/useTranslation';

interface ProgressLogScreenProps {
  onSaveLog?: (logData: any) => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const STAGE_OPTIONS = ['Vegetative', 'Tillering', 'Stem Elongation', 'Panicle Initiation', 'Heading', 'Ripening'];
const ISSUE_OPTIONS = ['None', 'Insect', 'Disease', 'Drought', 'Flood', 'Other'];

function Dropdown({
  icon, placeholder, value, options, open, onToggle, onSelect, T,
}: {
  icon: IoniconsName; placeholder: string; value: string;
  options: string[]; open: boolean;
  onToggle: () => void; onSelect: (v: string) => void; T: boolean;
}) {
  return (
    <View>
      <TouchableOpacity style={s.inputBox} onPress={onToggle} activeOpacity={0.75}>
        <Ionicons name={icon} size={16} color="#9CA3AF" />
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
              <Text style={[s.dropItemText, value === opt && s.dropItemActive, T && { fontSize: 15 }]}>
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

export const ProgressLogScreen: React.FC<ProgressLogScreenProps> = ({ onSaveLog }) => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route      = useRoute<any>();
  const { isLargeText } = useAccessibility();
  const tr = useTranslation();
  const T = isLargeText;

  const activeCycle = useAppStore(s => s.activeCycle);
  const cycleId     = route.params?.cycleId ?? activeCycle?.id ?? null;

  const [saved,       setSaved]       = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [logDate,     setLogDate]     = useState('');
  const [growthStage, setGrowthStage] = useState('');
  const [issue,       setIssue]       = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [notes,       setNotes]       = useState('');
  const [openStage,   setOpenStage]   = useState(false);
  const [openIssue,   setOpenIssue]   = useState(false);

  const handleSave = async () => {
    if (!logDate || !growthStage) {
      Alert.alert('Kulang', 'Punan ang petsa at yugto ng paglaki.');
      return;
    }
    setLoading(true);
    try {
      const payload: any = {
        log_date:     logDate,
        growth_stage: growthStage,
        issue_type:   issue === 'None' ? '' : issue,
        action_taken: actionTaken,
        observation:  notes,
      };
      if (cycleId) payload.farm_cycle = cycleId;

      // Save to backend (best-effort); the persisted store below is the source of truth for display
      try { await apiProgress.createLog(payload); } catch {}

      // Persist locally so the log survives app restart even if the backend orphans it
      useAppStore.getState().addProgressLog({
        id:            `local_${Date.now()}`,
        cycleId:       cycleId ? String(cycleId) : null,
        logDate,
        growthStage,
        observedIssue: issue || 'None',
        actionTaken,
        notes,
      });

      onSaveLog?.({ logDate, growthStage, issue, actionTaken, notes });
      setSaved(true);

      // Always notify on log save so the farmer sees confirmation;
      // include a deep-link to the relevant guide category if the issue suggests one.
      const text = `${issue} ${notes}`.toLowerCase();
      let category: string | undefined;
      let label    = '';
      let icon     = 'document-text-outline';
      if (/peste|insekto|pesticide|brown ?spot|blast|sheath|disease|sakit/i.test(text)) {
        category = 'pest_prevention'; label = 'Pag-aalaga sa Peste'; icon = 'shield-checkmark-outline';
      } else if (/dilaw|yellow|nutrient|nitrogen|potassium|pataba|fertilizer/i.test(text)) {
        category = 'fertilizer';      label = 'Pataba';              icon = 'flask-outline';
      } else if (/water|flood|baha|tubig|drain|patubig|tagtuyot|\btuyot\b|drought/i.test(text)) {
        category = 'irrigation';      label = 'Patubig';             icon = 'water-outline';
      } else if (/harvest|anihan|panicle|grain|\bani\b/i.test(text)) {
        category = 'harvesting';      label = 'Pag-aani';            icon = 'basket-outline';
      }
      useAppStore.getState().addNotification({
        title: label ? `Tingnan ang gabay sa ${label}` : 'Naitala ang inyong log',
        body:  label
          ? `Base sa inyong log, tingnan ang gabay sa ${label}.`
          : 'Naitala ang inyong pagsusuri sa bukid.',
        category, icon,
      });

      // Silent background refresh of the planting guide using all recent logs.
      // The store updates when Gemini responds — the user just sees a fresher guide next time.
      const recId = useAppStore.getState().latestRecommendation?.id;
      if (recId) {
        apiGuides.generate(recId, {
          season:   useAppStore.getState().latestGuide?.season ?? 'Wet Season',
          logs:     useAppStore.getState().progressLogs.slice(0, 10),
          language: useLanguageStore.getState().language,
        })
          .then(res => useAppStore.getState().setLatestGuide(res.data))
          .catch(() => {});
      }
    } catch {
      Alert.alert('Error', 'Hindi ma-save ang log. Subukan muli.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (saved) {
    return (
      <SafeAreaView style={s.root}>
        <ScrollView contentContainerStyle={s.successScroll} showsVerticalScrollIndicator={false}>

          <View style={s.successAvatar}>
            <Ionicons name="checkmark" size={40} color="#fff" />
          </View>
          <Text style={[s.successTitle, T && { fontSize: 28 }]}>Logged!</Text>
          <Text style={[s.successSub, T && { fontSize: 16 }]}>
            Your field observation has been saved successfully.
          </Text>

          <View style={[s.section, { width: '100%', marginTop: 20 }]}>
            <View style={s.card}>
              <Text style={s.cardTitleNew}>Log Summary</Text>
              {([
                { icon: 'calendar-outline' as IoniconsName, label: tr.plogDate,    value: logDate      || '—' },
                { icon: 'leaf-outline'     as IoniconsName, label: tr.plogStage,   value: growthStage  || '—' },
                { icon: 'warning-outline'  as IoniconsName, label: tr.plogIssue,   value: issue        || '—' },
                { icon: 'hammer-outline'   as IoniconsName, label: tr.plogAction,  value: actionTaken  || '—' },
                { icon: 'document-text-outline' as IoniconsName, label: tr.plogNotes, value: notes      || '—' },
              ]).map((row, i, arr) => (
                <View key={row.label} style={[s.listRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={row.icon} size={14} color="#9CA3AF" />
                    <Text style={[s.rowLabel, T && { fontSize: 15 }]}>{row.label}</Text>
                  </View>
                  <Text style={[s.rowValue, { maxWidth: '50%', textAlign: 'right' }, T && { fontSize: 15 }]} numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[s.btnGroup, { width: '100%', marginTop: 16 }]}>
            <TouchableOpacity style={s.outlineBtn} onPress={() => setSaved(false)} activeOpacity={0.75}>
              <Text style={[s.outlineBtnText, T && { fontSize: 16 }]}>Log Again</Text>
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
            <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[s.headerTitle, T && { fontSize: 15 }]}>{tr.plogModalTitle}</Text>
            <Text style={s.headerSub}>Santos Family Farm</Text>
          </View>
        </View>
        <NotificationBell color="#059669" size={22} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.section}>
          <View style={s.card}>
            <Text style={s.cardTitleNew}>Log Details</Text>

            {/* Log Date */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.plogDate} <Text style={s.req}>*</Text></Text>
              <View style={s.inputBox}>
                <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                <RNTextInput
                  style={[s.input, T && { fontSize: 16 }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#D1D5DB"
                  value={logDate}
                  onChangeText={setLogDate}
                />
              </View>
            </View>

            {/* Yugto ng Paglaki */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.plogStage} <Text style={s.req}>*</Text></Text>
              <Dropdown
                icon="leaf-outline"
                placeholder="Select stage..."
                value={growthStage}
                options={STAGE_OPTIONS}
                open={openStage}
                onToggle={() => { setOpenStage(v => !v); setOpenIssue(false); }}
                onSelect={v => { setGrowthStage(v); setOpenStage(false); }}
                T={T}
              />
            </View>

            {/* Nakitang Isyu */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.plogIssue} <Text style={s.req}>*</Text></Text>
              <Dropdown
                icon="warning-outline"
                placeholder="Select issue..."
                value={issue}
                options={ISSUE_OPTIONS}
                open={openIssue}
                onToggle={() => { setOpenIssue(v => !v); setOpenStage(false); }}
                onSelect={v => { setIssue(v); setOpenIssue(false); }}
                T={T}
              />
            </View>

            {/* Aksyon na Ginawa */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.plogAction}</Text>
              <View style={s.inputBox}>
                <Ionicons name="hammer-outline" size={16} color="#9CA3AF" />
                <RNTextInput
                  style={[s.input, T && { fontSize: 16 }]}
                  placeholder={tr.plogActionPh}
                  placeholderTextColor="#D1D5DB"
                  value={actionTaken}
                  onChangeText={setActionTaken}
                />
              </View>
            </View>

            {/* Mga Tala */}
            <View style={[s.fieldWrap, { marginBottom: 0 }]}>
              <Text style={[s.label, T && { fontSize: 14 }]}>{tr.plogNotes}</Text>
              <View style={[s.inputBox, { alignItems: 'flex-start', paddingTop: 14, height: 'auto', minHeight: 90 }]}>
                <Ionicons name="document-text-outline" size={16} color="#9CA3AF" style={{ marginTop: 2 }} />
                <RNTextInput
                  style={[s.input, { textAlignVertical: 'top', minHeight: 70 }, T && { fontSize: 16 }]}
                  placeholder={tr.plogNotesPh}
                  placeholderTextColor="#D1D5DB"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            </View>

          </View>
        </View>

        {/* Save button */}
        <View style={[s.section, s.btnGroup]}>
          <TouchableOpacity style={[s.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading} activeOpacity={0.85}>
            <Ionicons name={loading ? 'hourglass-outline' : 'add-circle-outline'} size={20} color="#4A8324" />
            <Text style={[s.saveBtnText, T && { fontSize: 15 }]}>{loading ? 'Saving...' : 'Log Observation'}</Text>
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
  section:      { paddingHorizontal: 20, marginTop: 24 },
  cardTitleNew: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16,
  },

  /* Form */
  fieldWrap: { marginBottom: 20 },
  label:     { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  req:       { color: '#EF4444' },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, height: 52,
  },
  input: { flex: 1, fontSize: 15, color: '#111827' },

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
  dropItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  dropItemText:   { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  dropItemActive: { color: '#059669', fontWeight: '700' },

  /* Buttons */
  btnGroup: { gap: 10, marginTop: 4 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48,
    backgroundColor: '#ECFDF5',
    borderRadius: 12, borderWidth: 1.5, borderColor: '#059669',
    borderStyle: 'dashed',
  },
  saveBtnText: { fontSize: 14, color: '#059669', fontWeight: '600' },
  outlineBtn: {
    height: 52, borderRadius: 16, borderWidth: 1.5, borderColor: '#059669',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600', color: '#059669' },

  /* List rows (success screen) */
  listRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  rowLabel: { fontSize: 14, color: '#6B7280' },
  rowValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

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
