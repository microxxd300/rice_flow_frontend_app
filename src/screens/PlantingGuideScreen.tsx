import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { mockPlantingGuides, mockFarms, mockEnvironmentalScans, mockClimateCalendar } from '../data/mockData';
import { useAccessibility } from '../context/AccessibilityContext';
import { apiGuides, apiRecommendations } from '@/services/apiService';
import { useAppStore } from '@/store/appStore';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/i18n/useTranslation';
import { NotificationBell } from '@/components/NotificationBell';
import { Skeleton } from '@/components/Skeleton';

/**
 * Build the "Angkop na Buwan sa Pagtatanim" calendar from the chosen variety's
 * preferred season and the Davao Region (Type IV) rainfall climatology.
 * Returns the same shape the screen already renders.
 */
function buildClimateCalendar(variety: any, tr: any) {
  const labels      = [
    tr.monShortJan2, tr.monShortFeb2, tr.monShortMar2, tr.monShortApr2,
    tr.monShortMay2, tr.monShortJun2, tr.monShortJul2, tr.monShortAug2,
    tr.monShortSep2, tr.monShortOct2, tr.monShortNov2, tr.monShortDec2,
  ];
  const fullMonths  = [
    tr.monFullJan, tr.monFullFeb, tr.monFullMar, tr.monFullApr,
    tr.monFullMay, tr.monFullJun, tr.monFullJul, tr.monFullAug,
    tr.monFullSep, tr.monFullOct, tr.monFullNov, tr.monFullDec,
  ];
  // Climatological monthly rainfall (mm) for Davao del Norte / Panabo (PAGASA Type IV)
  const rainfall    = [110, 85, 95, 105, 145, 195, 215, 200, 175, 165, 135, 125];

  const seasonRaw = (variety?.season || '').toLowerCase();
  const allSeason = seasonRaw.includes('/') || (seasonRaw.includes('wet') && seasonRaw.includes('dry'));
  const isWet     = !allSeason && seasonRaw.includes('wet');
  const isDry     = !allSeason && seasonRaw.includes('dry');

  const now = new Date();
  const currentIdx = now.getMonth();

  const months = labels.map((label, i) => {
    const rain = rainfall[i];
    let suit = 80;
    if (rain >= 200)      suit -= 35;   // very heavy rain — flood risk
    else if (rain >= 160) suit -= 18;
    else if (rain >= 130) suit -= 8;

    // Variety season preference bonus
    if (isWet && i >= 4 && i <= 9)              suit += 12;
    if (isDry && (i <= 3 || i >= 10))           suit += 12;
    if (allSeason)                              suit += 4;

    suit = Math.max(15, Math.min(100, suit));
    const status: 'safe' | 'caution' | 'danger' =
      suit >= 75 ? 'safe' : suit >= 50 ? 'caution' : 'danger';
    return { label, rainfall: rain, status, suitability: suit };
  });

  const currentMonth  = fullMonths[currentIdx];
  const currentStatus = months[currentIdx].status;
  const bestMonths    = months
    .map((m, i) => (m.status === 'safe' ? fullMonths[i] : null))
    .filter((x): x is string => !!x);

  const varName = variety?.common_name || 'rice';
  const alert =
    currentStatus === 'danger'
      ? { level: 'danger',  title: tr.climateAlertDanger,
          message: tr.climateMsgDanger.replace('{month}', currentMonth) }
      : currentStatus === 'caution'
      ? { level: 'caution', title: tr.climateAlertCaution,
          message: tr.climateMsgCaution.replace('{month}', currentMonth) }
      : { level: 'safe',    title: tr.climateAlertSafe,
          message: tr.climateMsgSafe.replace('{month}', currentMonth).replace('{variety}', varName) };

  return { location: 'Panabo City, Davao del Norte', currentMonth, alert, bestMonths, months };
}

interface PlantingGuideScreenProps {
  onMarkComplete?: (stepId: string) => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type CatConfig = {
  label: string; icon: IoniconsName;
  color: string; bg: string; border: string;
};

const CATEGORY_ORDER = ['planting', 'fertilizer', 'pest_prevention', 'irrigation', 'harvesting'];

export const PlantingGuideScreen: React.FC<PlantingGuideScreenProps> = ({ onMarkComplete }) => {
  const { isLargeText } = useAccessibility();
  const T = isLargeText;
  const language = useLanguageStore(s => s.language);
  const tr = useTranslation();

  const CAT_CONFIG: Record<string, CatConfig> = {
    planting:        { label: tr.guidePlanting,   icon: 'leaf-outline',             color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    fertilizer:      { label: tr.guideFertilizer, icon: 'flask-outline',            color: '#D97706', bg: '#FFF7ED', border: '#FDE68A' },
    pest_prevention: { label: tr.guidePest,       icon: 'shield-checkmark-outline', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    irrigation:      { label: tr.guideIrrigation, icon: 'water-outline',            color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    harvesting:      { label: tr.guideHarvest,    icon: 'basket-outline',           color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  };

  // Source of truth = persisted store. The Set derivation lets the existing
  // O(1) `has`/`size` reads keep working without changing the rest of the file.
  const completedIds  = useAppStore(s => s.completedGuideSteps);
  const completed     = useMemo(() => new Set(completedIds), [completedIds]);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  // Use the Gemini-generated guide if available, else the default content
  const latestGuide = useAppStore(s => s.latestGuide);
  const guide = (latestGuide && Array.isArray(latestGuide.steps) && latestGuide.steps.length > 0)
    ? latestGuide
    : mockPlantingGuides[0];
  const farm  = mockFarms[0];
  const scan  = mockEnvironmentalScans[0];
  // Map backend → frontend shape and infer category from keywords when missing.
  const inferCategory = (title: string, desc: string): string => {
    const t = `${title} ${desc}`.toLowerCase();
    if (/pataba|fertilizer|urea|nitrogen|nutrient|potash/.test(t))           return 'fertilizer';
    if (/peste|insekto|pest|brown ?spot|blast|sheath|disease|sakit/.test(t)) return 'pest_prevention';
    if (/tubig|patubig|irrigation|water|baha|flood|drain/.test(t))           return 'irrigation';
    if (/ani|harvest|panicle|grain/.test(t))                                  return 'harvesting';
    return 'planting';
  };

  const guideStart = (guide as any)?.start_date ? new Date((guide as any).start_date) : null;

  const steps: {
    id: string; stepNumber: number; title: string;
    instruction: string; daysAfterPlanting: number; category: string;
  }[] = (guide.steps ?? []).map((raw: any, idx: number) => {
    const title       = String(raw.title ?? '').trim();
    const instruction = String(raw.instruction ?? raw.description ?? '').trim();
    const category    = raw.category && CATEGORY_ORDER.includes(raw.category)
      ? raw.category
      : inferCategory(title, instruction);

    let dap = Number(raw.daysAfterPlanting ?? NaN);
    if (isNaN(dap) && raw.scheduled_date && guideStart) {
      const sd = new Date(raw.scheduled_date);
      if (!isNaN(sd.getTime())) {
        dap = Math.round((sd.getTime() - guideStart.getTime()) / 86400000);
      }
    }
    if (isNaN(dap)) dap = 0;

    return {
      id:                String(raw.id ?? `step_${idx + 1}`),
      stepNumber:        Number(raw.stepNumber ?? raw.step_no ?? idx + 1),
      title,
      instruction,
      daysAfterPlanting: dap,
      category,
    };
  });

  // Group steps into the 5 category buckets.
  // PENDING steps are shown grouped per category. COMPLETED steps disappear
  // from the visible list (the farmer can review them in the "Done · N" archive
  // at the bottom). When a category's step is checked, a fresh follow-up step
  // is generated by Gemini and appended to that category's bucket.
  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    cfg: CAT_CONFIG[cat],
    items: steps
      .filter(s => s.category === cat && !completed.has(s.id))
      .sort((a, b) => a.daysAfterPlanting - b.daysAfterPlanting),
  })).filter(g => g.items.length > 0);

  // Completed steps for the "Done · N" archive — most recent first
  const doneSteps = steps
    .filter(s => completed.has(s.id))
    .sort((a, b) => b.daysAfterPlanting - a.daysAfterPlanting);

  const done  = completed.size;
  const total = steps.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const CYCLE_CAP = 20;
  const cycleCapReached = total >= CYCLE_CAP;
  const [doneOpen,   setDoneOpen]   = useState(false);
  const [appending,  setAppending]  = useState(false);

  const cycleDays = steps.reduce((m, s) => Math.max(m, s.daysAfterPlanting), 0);
  // Data-driven "Angkop na Buwan sa Pagtatanim" — built from the chosen variety's
  // preferred season, Davao Type IV climate pattern, and today's date.
  const topVariety = (useAppStore.getState().latestRecommendation as any)?.results?.[0]?.variety;
  const climate = useMemo(() => buildClimateCalendar(topVariety, tr), [
    topVariety?.season, topVariety?.common_name, tr,
  ]);

  const toggle = async (id: string) => {
    const numericId = parseInt(id, 10);
    const wasDone = completed.has(id);
    useAppStore.getState().toggleGuideStepDone(id);
    onMarkComplete?.(id);
    // Sync to backend only when marking complete (not un-complete)
    if (!wasDone && !isNaN(numericId)) {
      try { await apiGuides.complete(numericId); } catch {}
    }

    // Marking complete (and not bumping into the per-cycle cap) → ask Gemini for
    // ONE fresh follow-up step in the same category. The new step appears at the
    // bottom of that category's list — keeps the farmer's "things to do" alive.
    if (!wasDone && !cycleCapReached && recId) {
      const justFinished = steps.find(s => s.id === id);
      if (justFinished) {
        setAppending(true);
        try {
          const res = await apiGuides.appendStep(recId, {
            category:       justFinished.category,
            last_day:       justFinished.daysAfterPlanting,
            existing_count: steps.length,
            season:         (latestGuide as any)?.season ?? 'Wet Season',
            language,
            logs:           storeLogs.slice(0, 10),
          });
          const newStep = res.data?.step;
          if (newStep) useAppStore.getState().addGuideStep(newStep);
        } catch (err: any) {
          console.log('[GUIDE/append] failed:', err?.message || err);
        } finally {
          setAppending(false);
        }
      }
    }
  };

  const dayLabel = (d: number) =>
    d < 0    ? tr.guideDayBeforePlant.replace('{n}', String(Math.abs(d)))
    : d === 0 ? tr.guideDayPlanting
    :           tr.guideDayAfter.replace('{n}', String(d));

  // No category grouping — backend gives one step per growth stage, each step
  // IS its own section. We just render the flat list in stepNumber order.

  // When a notification is tapped, expand the first matching step.
  const pendingGuideCategory    = useAppStore(s => s.pendingGuideCategory);
  const setPendingGuideCategory = useAppStore(s => s.setPendingGuideCategory);
  useEffect(() => {
    if (!pendingGuideCategory) return;
    const target = grouped.find(g => g.cat === pendingGuideCategory);
    if (target?.items[0]) setExpanded(target.items[0].id);
    setPendingGuideCategory(null);
  }, [pendingGuideCategory, grouped, setPendingGuideCategory]);

  // Self-heal: if there's no recommendation in the store (e.g. fresh app reload
  // after an old session), fetch the latest one for the user's farm.
  const setLatestRecommendation = useAppStore(s => s.setLatestRecommendation);
  const farmsList               = useAppStore(s => s.farms);
  const latestRec               = useAppStore(s => s.latestRecommendation);
  useEffect(() => {
    if (latestRec) return;
    const farmId = farmsList[0]?.id;
    if (!farmId) {
      console.log('[GUIDE] No farmId — cannot fetch recommendation history');
      return;
    }
    console.log('[GUIDE] Fetching recommendation history for farm', farmId);
    apiRecommendations.history(farmId)
      .then(res => {
        const recs = res.data;
        console.log('[GUIDE] Got', recs?.length ?? 0, 'recommendations');
        if (recs && recs.length > 0) {
          const latest = recs.reduce((max, r) => ((r.id ?? 0) > (max.id ?? 0) ? r : max), recs[0]);
          setLatestRecommendation(latest);
        }
      })
      .catch(err => console.error('[GUIDE] recommendation fetch failed:', err?.message || err));
  }, [latestRec, farmsList, setLatestRecommendation]);

  // Auto-generate the guide ONCE per mount when we have a recommendation.
  // Critical: we DO NOT depend on `latestGuide` here — otherwise calling
  // setLatestGuide(res.data) below would trigger another effect run, creating
  // an infinite Gemini-call loop that blows past the free-tier 20 req/min limit
  // and gives us a 429 → fallback to template.
  const recId          = latestRec?.id;
  const setLatestGuide = useAppStore(s => s.setLatestGuide);
  const storeLogs      = useAppStore(s => s.progressLogs);
  const hasFetchedRef  = useRef(false);
  useEffect(() => {
    if (!recId) {
      console.log('[GUIDE] No recId — cannot generate guide.');
      return;
    }
    if (hasFetchedRef.current) {
      // Already fetched in this mount — don't hammer the endpoint
      return;
    }
    hasFetchedRef.current = true;
    console.log('[GUIDE] Calling apiGuides.generate(recId=' + recId + ', logs=' + storeLogs.length + ')...');
    apiGuides.generate(recId, {
      season:   (latestGuide as any)?.season ?? 'Wet Season',
      logs:     storeLogs.slice(0, 10),
      language,
    })
      .then(res => {
        console.log('[GUIDE] Generate response — source:', (res.data as any)?.source, 'steps:', res.data?.steps?.length ?? 0);
        setLatestGuide(res.data);
      })
      .catch(err => {
        console.error('[GUIDE] Generate failed:', err?.message || err, err?.response?.data);
        // Allow a retry on next mount if it failed
        hasFetchedRef.current = false;
      });
  }, [recId]);


  return (
    <SafeAreaView style={s.root}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={s.titleIcon}>
            <Ionicons name="leaf-outline" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[s.headerTitle, T && { fontSize: 17 }]}>{tr.guideScreenTitle}</Text>
            <Text style={s.headerSub}>{(guide as any).season ?? 'Wet Season'} · {(guide as any).varietyName ?? 'NSIC Rc160'}</Text>
          </View>
        </View>
        <NotificationBell color="#059669" size={22} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Climate Advisory Card */}
        <View style={[s.climateCard, { marginTop: 24 }]}>

          <Text style={[s.climateSubLabel, { marginBottom: 12 }]}>{tr.climateBestMonths}</Text>

          {/* Calendar grid — 4 columns × 3 rows */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
            {climate.months.map((m, i) => {
              const isSafe    = m.status === 'safe';
              const isCaution = m.status === 'caution';
              const isCurrent = m.label === climate.currentMonth.slice(0, 3);
              const bg     = isSafe ? '#ECFDF5' : isCaution ? '#FFF7ED' : '#FEF2F2';
              const border = isSafe ? '#A7F3D0' : isCaution ? '#FDE68A' : '#FECACA';
              const color  = isSafe ? '#059669' : isCaution ? '#D97706' : '#DC2626';
              return (
                <View key={i} style={{ width: '25%', padding: 3 }}>
                  <View style={[
                    s.monthCell,
                    { backgroundColor: bg, borderColor: isCurrent ? color : border },
                    isCurrent && { borderWidth: 2 },
                  ]}>
                    <Text style={[s.monthCellText, { color }, isCurrent && { fontWeight: '800' }]}>
                      {m.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={s.calLegendRow}>
            {[
              { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: tr.floodSafe },
              { color: '#D97706', bg: '#FFF7ED', border: '#FDE68A', label: tr.floodCaution },
              { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: tr.floodWarning },
            ].map(l => (
              <View key={l.label} style={s.calLegendItem}>
                <View style={[s.calLegendSwatch, { backgroundColor: l.bg, borderColor: l.color }]} />
                <Text style={s.calLegendLabel}>{l.label}</Text>
              </View>
            ))}
          </View>

          {/* Alert warning strip */}
          {climate.alert.level && (
            <View style={[s.alertStrip, {
              backgroundColor: climate.alert.level === 'danger' ? '#FEF2F2' : '#FFF7ED',
              borderColor:     climate.alert.level === 'danger' ? '#FECACA' : '#FDE68A',
            }]}>
              <Ionicons
                name={climate.alert.level === 'danger' ? 'warning' : 'information-circle'}
                size={14}
                color={climate.alert.level === 'danger' ? '#DC2626' : '#D97706'}
                style={{ marginTop: 1, flexShrink: 0 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.alertStripTitle, {
                  color: climate.alert.level === 'danger' ? '#DC2626' : '#D97706',
                }, T && { fontSize: 13 }]}>
                  {climate.alert.title}
                </Text>
                <Text style={[s.alertStripMsg, T && { fontSize: 12 }]}>
                  {climate.alert.message}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Progress stats — 3 cards (Natapos / Natitira / Kabuuan) */}
        <View style={s.statsRow}>
          {[
            { val: done,         label: 'Completed', accent: '#059669' },
            { val: total - done, label: 'Remaining', accent: '#6B7280' },
            { val: total,        label: 'Total',     accent: '#059669' },
          ].map(p => (
            <View key={p.label} style={s.statCard}>
              <Text style={[s.statVal, { color: p.accent }, T && { fontSize: 26 }]}>{p.val}</Text>
              <Text style={[s.statLabel, T && { fontSize: 12 }]}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* Skeleton only while there are genuinely no steps yet (Gemini in flight + no mock). */}
        {steps.length === 0 && (
          <View style={{ marginTop: 20 }}>
            <Skeleton w={140} h={14} br={5} style={{ marginBottom: 10 }} />
            {[0, 1, 2].map(i => (
              <View key={i} style={[s.todoItem, i === 0 && s.todoItemFirst, i === 2 && s.todoItemLast]}>
                <View style={s.todoRow}>
                  <Skeleton w={24} h={24} br={7} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Skeleton w={'70%' as any} h={14} br={4} style={{ marginBottom: 6 }} />
                    <Skeleton w={'45%' as any} h={11} br={4} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Appending indicator — shown briefly while Gemini fetches the next step */}
        {appending && (
          <View style={[s.note, { marginTop: 16, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <Ionicons name="time-outline" size={14} color="#059669" />
            <Text style={[s.noteText, T && { fontSize: 12 }, { color: '#065F46' }]}>
              {tr.guideAppending}
            </Text>
          </View>
        )}

        {/* Grouped sections — icon + label header, then PENDING steps under (completed are hidden) */}
        {grouped.map(({ cat, cfg, items }) => (
          <View key={cat} style={s.group}>
            <View style={s.groupHeader}>
              <Ionicons name={cfg.icon} size={18} color={cfg.color} />
              <Text style={[s.groupLabel, T && { fontSize: 16 }]}>{cfg.label}</Text>
            </View>

            {items.map((step, idx) => {
              const isDone  = completed.has(step.id);
              const isFirst = idx === 0;
              const isLast  = idx === items.length - 1;
              const isOpen  = expanded === step.id;

              return (
                <View key={step.id} style={[s.todoItem, isFirst && s.todoItemFirst, isLast && s.todoItemLast]}>

                <TouchableOpacity
                  style={s.todoRow}
                  onPress={() => setExpanded(isOpen ? null : step.id)}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    style={[s.checkbox, isDone && s.checkboxDone]}
                    onPress={() => toggle(step.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.8}
                  >
                    {isDone && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <Text style={[
                      s.todoTitle,
                      isDone && s.todoTitleDone,
                      T && { fontSize: 15 },
                    ]}>
                      {step.title}
                    </Text>
                    <Text style={[s.todoDay, T && { fontSize: 12 }]}>
                      {dayLabel(step.daysAfterPlanting)}
                    </Text>
                  </View>

                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#D1D5DB"
                  />
                </TouchableOpacity>

                {isOpen && (
                  <View style={s.todoExpand}>
                    <Text style={[s.expandBody, T && { fontSize: 13 }]}>
                      {step.instruction}
                    </Text>
                    <TouchableOpacity
                      style={[s.markBtn, isDone && s.markBtnDone]}
                      onPress={() => toggle(step.id)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={isDone ? 'checkmark-circle' : 'radio-button-off-outline'}
                        size={16}
                        color={isDone ? '#fff' : '#059669'}
                      />
                      <Text style={[s.markBtnText, isDone && s.markBtnTextDone]}>
                        {isDone ? tr.guideComplete : tr.guideMarkDone}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              );
            })}
          </View>
        ))}

        {/* Done · N archive — collapsible. Lets the farmer review what's been completed
            without crowding the active checklist. Hidden when there are no completed steps. */}
        {doneSteps.length > 0 && (
          <View style={[s.group, { marginTop: 8 }]}>
            <TouchableOpacity
              style={s.groupHeader}
              onPress={() => setDoneOpen(v => !v)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#059669" />
              <Text style={[s.groupLabel, T && { fontSize: 16 }, { flex: 1 }]}>
                {tr.guideDoneCount.replace('{n}', String(doneSteps.length))}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>
                {doneOpen ? tr.guideHideDone : tr.guideShowDone}
              </Text>
              <Ionicons
                name={doneOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#9CA3AF"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            {doneOpen && doneSteps.map((step, idx) => {
              const isFirst = idx === 0;
              const isLast  = idx === doneSteps.length - 1;
              return (
                <View key={step.id} style={[s.todoItem, isFirst && s.todoItemFirst, isLast && s.todoItemLast]}>
                  <TouchableOpacity
                    style={s.todoRow}
                    onPress={() => toggle(step.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[s.checkbox, s.checkboxDone]}>
                      <Ionicons name="checkmark" size={13} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.todoTitle, s.todoTitleDone, T && { fontSize: 15 }]}>{step.title}</Text>
                      <Text style={[s.todoDay, T && { fontSize: 12 }]}>{dayLabel(step.daysAfterPlanting)}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Cycle cap notice */}
        {cycleCapReached && (
          <View style={[s.note, { backgroundColor: '#FFF7ED', borderColor: '#FDE68A' }]}>
            <Ionicons name="trophy-outline" size={14} color="#D97706" />
            <Text style={[s.noteText, T && { fontSize: 12 }, { color: '#92400E' }]}>
              {tr.guideCycleCap}
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={s.note}>
          <Ionicons name="information-circle-outline" size={14} color="#D1D5DB" />
          <Text style={[s.noteText, T && { fontSize: 12 }]}>
            {tr.guideDisclaimer}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F9F8' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  titleIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  headerBtn:   { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' },

  scroll: { paddingHorizontal: 24, paddingBottom: 110 },

  /* Summary card */
  summaryCard: {
    marginTop: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  summaryTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  summarySub:   { fontSize: 12, color: '#6B7280', marginTop: 2 },
  pctBadge: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, borderColor: '#D1FAE5',
    backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center',
  },
  pctText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E7EB', marginBottom: 14 },
  summaryStats: { flexDirection: 'row' },
  summaryStat:  { flex: 1, alignItems: 'center', gap: 4 },
  summaryStatDiv: { width: 1, height: 32, backgroundColor: '#E5E7EB' },
  summaryStatLabel: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  summaryStatVal:   { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'center' },

  /* Climate card */
  climateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
  },
  alertPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 9999,
    paddingVertical: 4, paddingHorizontal: 8,
  },
  alertPillText: { fontSize: 11, fontWeight: '600' },
  alertStrip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12,
  },
  alertStripTitle: { fontSize: 12, fontWeight: '700', marginBottom: 3 },
  alertStripMsg:   { fontSize: 11, color: '#6B7280', lineHeight: 17 },
  climateSubLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 0.8 },
  monthCell: {
    borderWidth: 1, borderRadius: 8, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  monthCellText: { fontSize: 11, fontWeight: '600' },
  calLegendRow: {
    flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
  },
  calLegendItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  calLegendSwatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1 },
  calLegendLabel:  { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  /* Category filter chips */
  filterRow: { gap: 8, paddingRight: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 9999, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive:     { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  filterChipText:       { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  filterChipTextActive: { color: '#059669', fontWeight: '700' },

  /* Progress stats */
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1, borderRadius: 10, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF',
  },
  statVal:   { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 3, fontWeight: '500' },

  /* Group — icon + label section heading above the steps */
  group:       { marginTop: 20 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 10, paddingHorizontal: 2,
  },
  groupLabel:  { fontSize: 15, fontWeight: '700', color: '#111827' },

  /* Todo items */
  todoItem: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
  },
  todoItemFirst: { borderTopWidth: 1, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  todoItemLast:  { borderBottomWidth: 1, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  todoRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 16, paddingVertical: 14,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 7,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    backgroundColor: '#FFFFFF',
  },
  checkboxDone: { backgroundColor: '#059669', borderColor: '#059669' },
  todoTitle:     { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  todoTitleDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  todoDay:       { fontSize: 12, color: '#9CA3AF' },

  /* Expanded */
  todoExpand: { paddingHorizontal: 16, paddingBottom: 16 },
  expandLabel: {
    fontSize: 11, fontWeight: '600', color: '#9CA3AF',
    letterSpacing: 0.8, marginBottom: 8,
  },
  expandBody: {
    fontSize: 13, color: '#111827', lineHeight: 20,
    backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 12, marginBottom: 12,
  },
  markBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  markBtnDone: { backgroundColor: '#059669', borderColor: '#059669' },
  markBtnText: { fontSize: 13, fontWeight: '600', color: '#059669' },
  markBtnTextDone: { color: '#FFFFFF' },

  /* Disclaimer */
  note: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 24, padding: 14,
    backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8,
  },
  noteText: { fontSize: 11, color: '#6B7280', lineHeight: 17, flex: 1 },
});
