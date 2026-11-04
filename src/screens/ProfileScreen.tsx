import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Modal, TextInput,
  KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAuthStore } from '@/features/auth/store';
import { useAppStore } from '@/store/appStore';
import { useLanguageStore } from '@/store/languageStore';
import { LANGUAGE_LABELS, type Language } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/constants/api';
import { dedupeName } from '@/utils/formatting';
import { apiFarms, apiRecommendations, authUpdateProfile } from '@/services/apiService';
import { fetchActiveCycleLogs, mergeLogs } from '@/utils/progressLogs';
import { loadGuide, guideNeedsTranslation } from '@/services/guideLoader';

const LogoImage = require('../assets/icons/logo_for_rice-flow.png');

interface ProfileScreenProps {
  onLogout?: () => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// Menu entries that open a readable content sheet rather than a form.
const CONTENT_MODALS = ['privacy', 'dataManagement', 'help', 'userGuide', 'about', 'terms'];

/** One heading + paragraph block, the shared shape of every content sheet. */
/** "MY FARMS" -> "My farms": card titles read like the rest of the app */
const sentence = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

const InfoBlock: React.FC<{ heading: string; body: string; large?: boolean }> = ({ heading, body, large }) => (
  <View style={s.infoBlock}>
    <Text style={[s.infoHeading, large && { fontSize: 16 }]}>{heading}</Text>
    <Text style={[s.infoBody, large && { fontSize: 15, lineHeight: 22 }]}>{body}</Text>
  </View>
);

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const { isLargeText, toggleLargeText } = useAccessibility();
  const T = isLargeText;   // easy-reading text scale, matches the other screens
  const { user: authUser, logout } = useAuthStore();
  const {
    user: profileUser,
    farms: realFarms,
    notificationsEnabled,
    weatherAlertsEnabled,
    setNotificationsEnabled,
    setWeatherAlertsEnabled,
  } = useAppStore();
  const { language, setLanguage } = useLanguageStore();
  const tr = useTranslation();

  // Profile edits used to be kept only on this phone; drop any left over so the
  // server profile is what shows
  useEffect(() => { storage.removeItem(STORAGE_KEYS.PROFILE_OVERRIDES).catch(() => {}); }, []);

  // Resolved values: authUser > profileUser.
  // Run through dedupeName to undo the legacy "Juan Juan" register-flow bug.
  const profileFirst  = (profileUser as any)?.first_name ?? '';
  const profileLast   = (profileUser as any)?.last_name  ?? '';
  const profileFull   = profileLast && profileLast !== profileFirst
    ? `${profileFirst} ${profileLast}`.trim()
    : profileFirst;
  const resolvedName  = dedupeName(authUser?.name)
    ?? profileFull
    ?? '';
  const displayName   = resolvedName && resolvedName.trim() ? resolvedName : 'Farmer';
  const displayEmail  = authUser?.email ?? (profileUser as any)?.email ?? '';
  const displayBaran  = (profileUser as any)?.barangay     ?? '';
  const displayMunic  = (profileUser as any)?.municipality ?? '';
  const displayProv   = (profileUser as any)?.province     ?? '';

  const [activeModal,      setActiveModal]      = useState<string | null>(null);
  // Language change in progress: a veil covers the app until the planting guide is
  // translated, so the Planting tab opens ready instead of loading
  const [switchingLang,    setSwitchingLang]    = useState(false);

  const changeLanguage = async (lang: Language) => {
    if (lang === language || switchingLang) return;
    const recId = (useAppStore.getState().latestRecommendation as any)?.id;
    const translateGuide = !!recId && guideNeedsTranslation(lang);
    setSwitchingLang(translateGuide);
    try {
      await setLanguage(lang);
      // A failure is fine here: the Planting tab retries when it opens
      if (translateGuide) await loadGuide(recId, lang).catch(() => {});
    } finally {
      setSwitchingLang(false);
    }
  };
  const [editName,         setEditName]         = useState('');
  const [editMunicipality, setEditMunicipality] = useState('');
  const [editProvince,     setEditProvince]     = useState('');

  const PREFERENCES: { id: string; iconName: IoniconsName; label: string }[] = [
    { id: 'language',       iconName: 'language-outline',    label: tr.profileLanguage },
    { id: 'privacy',        iconName: 'lock-closed-outline', label: tr.profilePrivacy },
    { id: 'dataManagement', iconName: 'server-outline',      label: tr.profileData },
  ];
  const SUPPORT: { id: string; iconName: IoniconsName; label: string }[] = [
    { id: 'help',      iconName: 'help-circle-outline',        label: tr.profileHelp },
    { id: 'userGuide', iconName: 'book-outline',               label: tr.profileUserGuide },
    { id: 'about',     iconName: 'information-circle-outline', label: tr.profileAbout },
    { id: 'terms',     iconName: 'document-text-outline',      label: tr.profileTerms },
  ];

  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const openEdit = () => {
    setEditName(displayName);
    setEditMunicipality(displayMunic);
    setEditProvince(displayProv);
    setActiveModal('editProfile');
  };

  const [savingProfile, setSavingProfile] = useState(false);
  const saveEdit = async () => {
    if (savingProfile) return;
    const name = editName.trim();
    if (!name) {
      Alert.alert(tr.profileEditName, tr.profileNameRequired);
      return;
    }
    setSavingProfile(true);
    try {
      // Saved on the account so it shows on every phone. The whole name goes in
      // first_name: splitting "Juan Dela Cruz" into first/last would guess wrong.
      const res = await authUpdateProfile({
        first_name:   name,
        last_name:    '',
        municipality: editMunicipality.trim(),
        province:     editProvince.trim(),
      });
      useAppStore.getState().setUser(res.data);
      if (authUser) {
        const nextUser = { ...authUser, name };
        useAuthStore.getState().setUser(nextUser);
        await storage.setItem(STORAGE_KEYS.USER, nextUser);
      }
      setActiveModal(null);
    } catch {
      Alert.alert(tr.profileSaveFailedTitle, tr.profileSaveFailed);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  /* ── Data management actions ───────────────────────────────────────────── */
  // Both act only on this device's cached copy / a plain re-read. Neither
  // deletes anything server-side, so there's no destructive path here.
  const [dataBusy,   setDataBusy]   = useState(false);
  const [dataStatus, setDataStatus] = useState<string | null>(null);

  // The selected farm's farms list, season logs and latest recommendation from the server
  const reloadFromServer = async () => {
    const st = useAppStore.getState();
    const farmsRes = await apiFarms.list();
    st.setFarms(farmsRes.data);
    const farmId = st.selectedFarmId;
    if (!farmId) return;
    // Same loading as the Progress screen: the season's logs in the app's shape
    try {
      const { logs } = await fetchActiveCycleLogs(farmId);
      st.setProgressLogs(mergeLogs(logs, useAppStore.getState().progressLogs));
    } catch {}
    try {
      const recs = (await apiRecommendations.history(farmId)).data ?? [];
      if (recs.length) st.setLatestRecommendation(recs.reduce((x, y) => ((y.id ?? 0) > (x.id ?? 0) ? y : x)));
    } catch {}
  };

  const refreshFromServer = async () => {
    if (dataBusy) return;
    setDataBusy(true);
    setDataStatus(tr.dataRefreshing);
    try {
      await reloadFromServer();
      setDataStatus(tr.dataRefreshed);
    } catch {
      setDataStatus(tr.dataRefreshFailed);
    } finally {
      setDataBusy(false);
    }
  };

  const clearLocalCache = async () => {
    if (dataBusy) return;
    setDataBusy(true);
    try {
      // Cached farm data only — tokens and the signed-in user are left alone so
      // clearing the cache never logs the farmer out.
      await Promise.all([
        storage.removeItem(STORAGE_KEYS.LATEST_REC),
        storage.removeItem(STORAGE_KEYS.LATEST_GUIDE),
        storage.removeItem(STORAGE_KEYS.PROGRESS_LOGS),
        storage.removeItem(STORAGE_KEYS.COMPLETED_GUIDE_STEPS),
        storage.removeItem(STORAGE_KEYS.NOTIFICATIONS),
      ].map(p => p.catch(() => {})));
      const st = useAppStore.getState();
      st.setLatestRecommendation(null);
      st.setLatestGuide(null);
      st.setProgressLogs([]);
      st.hydrateGuideSteps([]);
      st.hydrateNotifications([]);
      // Fill the screens again from the server, which still has everything; offline
      // they stay empty until the next refresh
      await reloadFromServer().catch(() => {});
      setDataStatus(tr.dataCleared);
    } finally {
      setDataBusy(false);
    }
  };

  // Real farms only; the card shows its empty state when there are none
  const farmList: any[] = realFarms;

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { flex: 1 }, T && { fontSize: 24 }]}>{tr.profileTitle}</Text>
        <View style={s.headerBtn}><NotificationBell color="#111827" size={20} /></View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Who, where, and the farms in three tiles */}
        <View style={s.profileCard}>
          <View style={s.profileRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={[s.profileName, T && { fontSize: 21 }]} numberOfLines={1}>{displayName}</Text>
              <Text style={[s.profileEmail, T && { fontSize: 14 }]} numberOfLines={1}>{displayEmail}</Text>
            </View>
            <TouchableOpacity style={s.editIconBtn} onPress={openEdit} activeOpacity={0.7}>
              <Ionicons name="pencil" size={16} color="#111827" />
            </TouchableOpacity>
          </View>
          <View style={s.placeRow}>
            <Ionicons name="location-sharp" size={15} color="#111827" />
            <Text style={[s.placeText, T && { fontSize: 15 }]} numberOfLines={2}>
              {[displayBaran, displayMunic, displayProv].filter(Boolean).join(', ') || tr.profileLocation}
            </Text>
          </View>
          <View style={s.tiles}>
            {[
              { lbl: sentence(tr.profileFarms), val: String(farmList.length) },
              { lbl: tr.profileTotalArea, val: `${farmList.reduce((a: number, f: any) => a + (Number(f.area_hectares ?? f.areaHectares) || 0), 0).toFixed(1)} ha` },
              { lbl: tr.profileEditBarangay, val: displayBaran || '—' },
            ].map(t => (
              <View key={t.lbl} style={s.tile}>
                <Text style={s.tileLbl} numberOfLines={1}>{t.lbl}</Text>
                <Text style={[s.tileVal, T && { fontSize: 19 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t.val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Farms — real farms with mock fallback, clean rows */}
        <View style={[s.card, { marginTop: 12 }]}>
          <Text style={[s.cardTitle, T && { fontSize: 17 }]}>{sentence(tr.profileFarms)}</Text>
          {farmList.map((farm: any, i: number, arr: any[]) => {
            const area = farm.area_hectares ?? farm.areaHectares ?? null;
            const location = [farm.barangay, farm.municipality].filter(Boolean).join(', ') || '—';
            return (
              <View key={farm.id ?? i} style={[s.simpleRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[s.iconTile, { backgroundColor: '#E8F5EF' }]}>
                  <Ionicons name="leaf" size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.farmName, T && { fontSize: 16 }]} numberOfLines={1}>{farm.name}</Text>
                  <Text style={[s.farmMeta, T && { fontSize: 14 }]} numberOfLines={1}>
                    {location}{area != null ? ` · ${area} ha` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
          {farmList.length === 0 && (
            <Text style={s.emptyHint}>{tr.homeNoFarms}</Text>
          )}
        </View>

        {/* Notifications + Accessibility — combined card with toggle rows */}
        <View style={[s.card, { marginTop: 12 }]}>
          <Text style={[s.cardTitle, T && { fontSize: 17 }]}>{sentence(tr.profileSettings)}</Text>

          <View style={s.toggleRow}>
            <View style={s.iconTile}><Ionicons name="notifications-outline" size={18} color="#111827" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.toggleTitle, T && { fontSize: 16 }]}>{tr.profilePushNotif}</Text>
              <Text style={[s.toggleDesc, T && { fontSize: 14, lineHeight: 19 }]}>{tr.profilePushNotifDesc}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#059669' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={s.toggleRow}>
            <View style={s.iconTile}><Ionicons name="rainy-outline" size={18} color="#111827" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.toggleTitle, T && { fontSize: 16 }]}>{tr.profileWeather}</Text>
              <Text style={[s.toggleDesc, T && { fontSize: 14, lineHeight: 19 }]}>{tr.profileWeatherDesc}</Text>
            </View>
            <Switch
              value={weatherAlertsEnabled}
              onValueChange={setWeatherAlertsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#059669' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[s.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={s.iconTile}><Ionicons name="text-outline" size={18} color="#111827" /></View>
            <View style={{ flex: 1 }}>
              <Text style={[s.toggleTitle, T && { fontSize: 16 }]}>{tr.profileLargeText}</Text>
              <Text style={[s.toggleDesc, T && { fontSize: 14, lineHeight: 19 }]}>{tr.profileLargeTextDesc}</Text>
            </View>
            <Switch
              value={isLargeText}
              onValueChange={toggleLargeText}
              trackColor={{ false: '#D1D5DB', true: '#059669' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={[s.card, { marginTop: 12 }]}>
          <Text style={[s.cardTitle, T && { fontSize: 17 }]}>{sentence(tr.profilePrefs)}</Text>
          {PREFERENCES.map((item, i, arr) => (
            <TouchableOpacity
              key={item.id}
              style={[s.menuRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => { setDataStatus(null); setActiveModal(item.id); }}
              activeOpacity={0.65}
            >
              <View style={s.iconTile}><Ionicons name={item.iconName} size={18} color="#111827" /></View>
              <Text style={[s.menuLabel, T && { fontSize: 16 }]}>{item.label}</Text>
              {item.id === 'language' && (
                <Text style={s.menuValue}>{LANGUAGE_LABELS[language]}</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Support */}
        <View style={[s.card, { marginTop: 12 }]}>
          <Text style={[s.cardTitle, T && { fontSize: 17 }]}>{sentence(tr.profileSupport)}</Text>
          {SUPPORT.map((item, i, arr) => (
            <TouchableOpacity
              key={item.id}
              style={[s.menuRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => { setDataStatus(null); setActiveModal(item.id); }}
              activeOpacity={0.65}
            >
              <View style={s.iconTile}><Ionicons name={item.iconName} size={18} color="#111827" /></View>
              <Text style={[s.menuLabel, T && { fontSize: 16 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <View style={s.versionCard}>
          {/* The wordmark sits in the middle of a wide transparent canvas; trim its empty margins */}
          <Image source={LogoImage} style={{ width: 192, height: 128, marginVertical: -36 }} resizeMode="contain" />
          <Text style={s.versionNum}>{tr.profileVersion.replace('{v}', '1.0.0')}</Text>
        </View>

        {/* Logout — ghost-style, less aggressive than red-tinted card */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={16} color="#DC2626" />
          <Text style={s.logoutBtnText}>{tr.profileLogout}</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={activeModal !== null} transparent animationType="slide" onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView style={s.mOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.mBackdrop} activeOpacity={1} onPress={() => setActiveModal(null)} />
          <View style={s.mSheet}>
            <View style={s.mHandle} />

            {/* Edit Profile */}
            {activeModal === 'editProfile' && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={s.mHeader}>
                  <Text style={s.mTitle}>{tr.profileEditTitle}</Text>
                  <TouchableOpacity onPress={() => setActiveModal(null)} style={s.mClose} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={s.mFieldWrap}>
                  <Text style={s.mFieldLabel}>{tr.profileEditEmail}</Text>
                  <View style={[s.mInput, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[s.mInputText, { color: '#6B7280' }]}>{displayEmail || '—'}</Text>
                  </View>
                  <Text style={s.mFieldHint}>{tr.profileEmailHint}</Text>
                </View>
                {([
                  { label: tr.profileEditName,         value: editName,         set: setEditName },
                  { label: tr.profileEditMunicipality, value: editMunicipality, set: setEditMunicipality },
                  { label: tr.profileEditProvince,     value: editProvince,     set: setEditProvince },
                ] as { label: string; value: string; set: (v: string) => void }[]).map(f => (
                  <View key={f.label} style={s.mFieldWrap}>
                    <Text style={s.mFieldLabel}>{f.label}</Text>
                    <View style={s.mInput}>
                      <TextInput
                        style={s.mInputText}
                        value={f.value}
                        onChangeText={f.set}
                        placeholder={f.label}
                        placeholderTextColor="#D1D5DB"
                      />
                    </View>
                  </View>
                ))}
                <View style={s.mActionsRow}>
                  <TouchableOpacity style={s.mCancelBtn} onPress={() => setActiveModal(null)} activeOpacity={0.7}>
                    <Text style={s.mCancelBtnText}>{tr.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.mSaveBtn, savingProfile && { opacity: 0.6 }]}
                    onPress={saveEdit}
                    disabled={savingProfile}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    <Text style={s.mSaveBtnText}>{tr.save}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {/* Language */}
            {activeModal === 'language' && (
              <View>
                <View style={s.mHeader}>
                  <Text style={s.mTitle}>{tr.langModalTitle}</Text>
                  <TouchableOpacity onPress={() => setActiveModal(null)} style={s.mClose} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <Text style={s.mBodyText}>{tr.langModalBody}</Text>
                <View style={s.mChipGrid}>
                  {(['fil', 'en', 'ceb'] as Language[]).map(lang => (
                    <TouchableOpacity
                      key={lang}
                      style={[s.mSelChip, language === lang && s.mSelChipActive]}
                      onPress={() => changeLanguage(lang)}
                      activeOpacity={0.7}
                    >
                      {language === lang && <Ionicons name="checkmark" size={13} color="#059669" />}
                      <Text style={[s.mSelChipText, language === lang && s.mSelChipTextActive]}>
                        {LANGUAGE_LABELS[lang]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[s.mSaveBtn, { flex: 0 }]} onPress={() => setActiveModal(null)} activeOpacity={0.85}>
                  <Text style={s.mSaveBtnText}>{tr.done}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Content sheets — Privacy / Data / Help / User Guide / About / Terms */}
            {CONTENT_MODALS.includes(activeModal ?? '') && (
              <View style={{ flexShrink: 1 }}>
                <View style={s.mHeader}>
                  <Text style={[s.mTitle, T && { fontSize: 19 }]}>
                    {[...PREFERENCES, ...SUPPORT].find(m => m.id === activeModal)?.label ?? ''}
                  </Text>
                  <TouchableOpacity onPress={() => setActiveModal(null)} style={s.mClose} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={s.mScroll} showsVerticalScrollIndicator={false}>

                  {activeModal === 'privacy' && (
                    <>
                      <Text style={[s.mLead, T && { fontSize: 15, lineHeight: 22 }]}>{tr.privIntro}</Text>
                      {[
                        { h: tr.privH1, b: tr.privB1 }, { h: tr.privH2, b: tr.privB2 },
                        { h: tr.privH3, b: tr.privB3 }, { h: tr.privH4, b: tr.privB4 },
                        { h: tr.privH5, b: tr.privB5 },
                      ].map(sec => <InfoBlock key={sec.h} heading={sec.h} body={sec.b} large={T} />)}
                    </>
                  )}

                  {activeModal === 'dataManagement' && (
                    <>
                      <Text style={[s.mLead, T && { fontSize: 15, lineHeight: 22 }]}>{tr.dataIntro}</Text>
                      <InfoBlock heading={tr.dataH1} body={tr.dataB1} large={T} />
                      <InfoBlock heading={tr.dataH2} body={tr.dataB2} large={T} />

                      {/* Real, working actions — both are local/read-only */}
                      <TouchableOpacity
                        style={[s.dataAction, dataBusy && { opacity: 0.5 }]}
                        onPress={refreshFromServer}
                        disabled={dataBusy}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="cloud-download-outline" size={19} color="#059669" />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.dataActionTitle, T && { fontSize: 16 }]}>{tr.dataRefresh}</Text>
                          <Text style={[s.dataActionDesc, T && { fontSize: 14 }]}>{tr.dataRefreshDesc}</Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.dataAction, dataBusy && { opacity: 0.5 }]}
                        onPress={clearLocalCache}
                        disabled={dataBusy}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={19} color="#B45309" />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.dataActionTitle, T && { fontSize: 16 }]}>{tr.dataClear}</Text>
                          <Text style={[s.dataActionDesc, T && { fontSize: 14 }]}>{tr.dataClearDesc}</Text>
                        </View>
                      </TouchableOpacity>

                      {dataStatus && (
                        <Text style={[s.dataStatus, T && { fontSize: 14 }]}>{dataStatus}</Text>
                      )}
                    </>
                  )}

                  {activeModal === 'help' && (
                    <>
                      <Text style={[s.mLead, T && { fontSize: 15, lineHeight: 22 }]}>{tr.helpIntro}</Text>
                      {[
                        { q: tr.helpQ1, a: tr.helpA1 }, { q: tr.helpQ2, a: tr.helpA2 },
                        { q: tr.helpQ3, a: tr.helpA3 }, { q: tr.helpQ4, a: tr.helpA4 },
                        { q: tr.helpQ5, a: tr.helpA5 },
                      ].map(item => (
                        <View key={item.q} style={s.faqItem}>
                          <View style={s.faqQRow}>
                            <Ionicons name="help-circle-outline" size={17} color="#059669" />
                            <Text style={[s.faqQ, T && { fontSize: 16 }]}>{item.q}</Text>
                          </View>
                          <Text style={[s.faqA, T && { fontSize: 15, lineHeight: 22 }]}>{item.a}</Text>
                        </View>
                      ))}
                      <InfoBlock heading={tr.helpContact} body={tr.helpContactBody} large={T} />
                    </>
                  )}

                  {activeModal === 'userGuide' && (
                    <>
                      <Text style={[s.mLead, T && { fontSize: 15, lineHeight: 22 }]}>{tr.ugIntro}</Text>
                      {[
                        { t: tr.ugS1, d: tr.ugD1, icon: 'location-outline' },
                        { t: tr.ugS2, d: tr.ugD2, icon: 'scan-outline' },
                        { t: tr.ugS3, d: tr.ugD3, icon: 'leaf-outline' },
                        { t: tr.ugS4, d: tr.ugD4, icon: 'list-outline' },
                        { t: tr.ugS5, d: tr.ugD5, icon: 'stats-chart-outline' },
                      ].map(step => (
                        <View key={step.t} style={s.ugStep}>
                          <View style={s.ugIcon}>
                            <Ionicons name={step.icon as IoniconsName} size={17} color="#059669" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[s.ugTitle, T && { fontSize: 16 }]}>{step.t}</Text>
                            <Text style={[s.ugDesc, T && { fontSize: 15, lineHeight: 22 }]}>{step.d}</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}

                  {activeModal === 'about' && (
                    <>
                      <View style={s.aboutHead}>
                        <Image source={LogoImage} style={{ width: 168, height: 112, marginVertical: -30 }} resizeMode="contain" />
                        <Text style={[s.aboutName, T && { fontSize: 18 }]}>RiceFlow</Text>
                        <Text style={[s.aboutVer, T && { fontSize: 14 }]}>
                          {tr.profileVersion.replace('{v}', '1.0.0')}
                        </Text>
                        <Text style={[s.aboutTag, T && { fontSize: 15 }]}>{tr.aboutTagline}</Text>
                      </View>
                      <Text style={[s.mLead, T && { fontSize: 15, lineHeight: 22 }]}>{tr.aboutWhat}</Text>
                      <InfoBlock heading={tr.aboutSources} body={tr.aboutSourcesBody} large={T} />
                      <InfoBlock heading={tr.aboutTeam}    body={tr.aboutTeamBody}    large={T} />
                      <View style={s.noteBox}>
                        <Ionicons name="information-circle-outline" size={16} color="#1E40AF" />
                        <Text style={[s.noteBoxText, T && { fontSize: 14, lineHeight: 20 }]}>
                          {tr.aboutDisclaimer}
                        </Text>
                      </View>
                    </>
                  )}

                  {activeModal === 'terms' && (
                    <>
                      <Text style={[s.mLead, T && { fontSize: 15, lineHeight: 22 }]}>{tr.termsIntro}</Text>
                      {[
                        { h: tr.termsH1, b: tr.termsB1 }, { h: tr.termsH2, b: tr.termsB2 },
                        { h: tr.termsH3, b: tr.termsB3 }, { h: tr.termsH4, b: tr.termsB4 },
                        { h: tr.termsH5, b: tr.termsB5 },
                      ].map(sec => <InfoBlock key={sec.h} heading={sec.h} body={sec.b} large={T} />)}
                      <Text style={[s.termsUpdated, T && { fontSize: 13 }]}>{tr.termsUpdated}</Text>
                    </>
                  )}

                  <View style={{ height: 8 }} />
                </ScrollView>

                <TouchableOpacity style={[s.mSaveBtn, { flex: 0 }]} onPress={() => setActiveModal(null)} activeOpacity={0.85}>
                  <Text style={s.mSaveBtnText}>{tr.ok}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Language change veil: stays up while the planting guide is translated */}
      <Modal visible={switchingLang} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={s.veil}>
          <View style={s.veilCard}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={s.veilTitle}>{tr.langSwitchingTitle}</Text>
            <Text style={s.veilBody}>{tr.langSwitchingBody}</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F2F1' },
  veil:      { flex: 1, backgroundColor: 'rgba(17,24,39,0.55)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  veilCard:  { width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  veilTitle: { fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  veilBody:  { fontSize: 14, color: '#6B7280', lineHeight: 20, textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48 },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  headerTitle: { fontSize: 21, color: '#111827', letterSpacing: -0.4, fontFamily: 'Inter_700Bold' },

  /* Profile card */
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 19, color: '#111827', marginBottom: 2, letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  profileEmail: { fontSize: 13, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  editIconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F2F1', justifyContent: 'center', alignItems: 'center' },

  /* Card */
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardTitle: { fontSize: 14, color: '#111827', marginBottom: 4, fontFamily: 'Inter_600SemiBold' },

  /* Simple data rows */
  simpleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  rowLabel:  { fontSize: 13, color: '#6B7280', flex: 1 },
  rowValue:  { fontSize: 13, fontWeight: '600', color: '#111827', flexShrink: 1 },
  farmName: { fontSize: 15, color: '#111827', marginBottom: 2, fontFamily: 'Inter_600SemiBold' },
  farmMeta: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },
  emptyHint: { fontSize: 12, color: '#9CA3AF', paddingVertical: 16, textAlign: 'center' },

  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  iconTile:  { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F1F2F1', justifyContent: 'center', alignItems: 'center' },
  placeRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  placeText: { flex: 1, fontSize: 13, color: '#111827', fontFamily: 'Inter_500Medium' },
  tiles:     { flexDirection: 'row', gap: 8, marginTop: 14 },
  tile:      { flex: 1, backgroundColor: '#F1F2F1', borderRadius: 18, padding: 12 },
  tileLbl:   { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_600SemiBold' },
  tileVal:   { fontSize: 17, color: '#111827', marginTop: 6, fontFamily: 'Inter_700Bold' },

  /* Toggle rows */
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  toggleTitle: { fontSize: 15, color: '#111827', marginBottom: 2, fontFamily: 'Inter_600SemiBold' },
  toggleDesc: { fontSize: 12, color: '#6B7280', lineHeight: 17 },

  /* Menu rows */
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  menuValue: { fontSize: 13, color: '#6B7280', marginRight: 2, fontFamily: 'Inter_500Medium' },

  /* Version */
  versionCard: {
    alignItems: 'center', paddingVertical: 22, marginTop: 24, gap: 4,
  },
  versionNum: { fontSize: 12, color: '#6B7280' },

  /* Logout — ghost style */
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, marginTop: 4, borderRadius: 18, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  logoutBtnText: { fontSize: 15, color: '#DC2626', fontFamily: 'Inter_600SemiBold' },

  /* Modal */
  mOverlay:  { flex: 1, justifyContent: 'flex-end' },
  mBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  mSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10, maxHeight: '85%' },
  mHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18 },

  mHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  mTitle: { flex: 1, fontSize: 20, color: '#111827', letterSpacing: -0.3, fontFamily: 'Inter_700Bold' },
  mClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F2F1', justifyContent: 'center', alignItems: 'center' },

  mFieldWrap: { marginBottom: 16 },
  mFieldLabel: { fontSize: 14, color: '#111827', marginBottom: 8, fontFamily: 'Inter_700Bold' },
  mFieldHint: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  mInput: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 16, paddingHorizontal: 16, backgroundColor: '#F1F2F1' },
  mInputText: { flex: 1, fontSize: 15, color: '#111827', fontFamily: 'Inter_500Medium' },

  mBodyText:   { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 16 },
  mChipGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  mSelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#F1F2F1' },
  mSelChipActive: { backgroundColor: '#111827' },
  mSelChipText: { fontSize: 14, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  mSelChipTextActive: { color: '#FFFFFF' },

  mNote: { fontSize: 11, color: '#9CA3AF', marginBottom: 14, marginTop: -4, fontStyle: 'italic' },

  mActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 },
  mCancelBtn: { flex: 1, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F2F1' },
  mCancelBtnText: { fontSize: 15, color: '#111827', fontFamily: 'Inter_600SemiBold' },
  mSaveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 18, backgroundColor: '#111827' },
  mSaveBtnText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },

  /* ── Content sheets (Privacy / Data / Help / Guide / About / Terms) ────── */
  mScroll: { marginBottom: 14 },
  mLead:   { fontSize: 13.5, color: '#374151', lineHeight: 20, marginBottom: 18 },

  infoBlock:   { marginBottom: 18 },
  infoHeading: { fontSize: 13.5, fontWeight: '700', color: '#111827', marginBottom: 5 },
  infoBody:    { fontSize: 13, color: '#6B7280', lineHeight: 20 },

  /* Data management actions */
  dataAction: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F1F2F1', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, marginBottom: 10, minHeight: 60 },
  dataActionTitle: { fontSize: 13.5, fontWeight: '700', color: '#111827', marginBottom: 2 },
  dataActionDesc:  { fontSize: 12, color: '#9CA3AF', lineHeight: 17 },
  dataStatus:      { fontSize: 12.5, color: '#059669', fontWeight: '600', marginTop: 4, marginBottom: 6 },

  /* FAQ */
  faqItem: { marginBottom: 18 },
  faqQRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 },
  faqQ:    { flex: 1, fontSize: 13.5, fontWeight: '700', color: '#111827', lineHeight: 19 },
  faqA:    { fontSize: 13, color: '#6B7280', lineHeight: 20, marginLeft: 25 },

  /* User guide steps */
  ugStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  ugIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#E8F5EF', justifyContent: 'center', alignItems: 'center' },
  ugTitle: { fontSize: 13.5, fontWeight: '700', color: '#111827', marginBottom: 3 },
  ugDesc:  { fontSize: 13, color: '#6B7280', lineHeight: 20 },

  /* About */
  aboutHead: { alignItems: 'center', gap: 5, marginBottom: 18 },
  aboutName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  aboutVer:  { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  aboutTag:  { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 2 },

  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#EAF1FD', borderRadius: 16, padding: 14, marginBottom: 6 },
  noteBoxText: { flex: 1, fontSize: 12.5, color: '#1E40AF', lineHeight: 18, fontWeight: '500' },

  termsUpdated: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
});
