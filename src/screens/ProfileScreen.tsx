import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Modal, TextInput,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NotificationBell } from '@/components/NotificationBell';
import { mockUser, mockFarms } from '../data/mockData';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAuthStore } from '@/features/auth/store';
import { useAppStore } from '@/store/appStore';
import { useLanguageStore } from '@/store/languageStore';
import { LANGUAGE_LABELS, type Language } from '@/i18n/translations';
import { useTranslation } from '@/i18n/useTranslation';
import { storage } from '@/services/storage';
import { STORAGE_KEYS } from '@/constants/api';
import { dedupeName } from '@/utils/formatting';

const LogoImage = require('../assets/icons/logo_for_rice-flow.png');

interface ProfileScreenProps {
  onLogout?: () => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface ProfileOverrides {
  name?: string;
  email?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const { isLargeText, toggleLargeText } = useAccessibility();
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

  // Locally-persisted profile overrides (no PATCH endpoint on backend yet — survives restart on device)
  const [overrides, setOverrides] = useState<ProfileOverrides>({});
  useEffect(() => {
    storage.getItem<ProfileOverrides>(STORAGE_KEYS.PROFILE_OVERRIDES).then(v => {
      if (v) setOverrides(v);
    });
  }, []);

  // Resolved values: overrides > authUser > profileUser > mock.
  // Run through dedupeName to undo the legacy "Juan Juan" register-flow bug.
  const profileFirst  = (profileUser as any)?.first_name ?? '';
  const profileLast   = (profileUser as any)?.last_name  ?? '';
  const profileFull   = profileLast && profileLast !== profileFirst
    ? `${profileFirst} ${profileLast}`.trim()
    : profileFirst;
  const resolvedName  = overrides.name
    ?? dedupeName(authUser?.name)
    ?? profileFull
    ?? mockUser.name;
  const displayName   = resolvedName && resolvedName.trim() ? resolvedName : mockUser.name;
  const displayEmail  = overrides.email ?? authUser?.email ?? (profileUser as any)?.email ?? mockUser.email;
  const displayBaran  = overrides.barangay     ?? (profileUser as any)?.barangay     ?? mockUser.barangay;
  const displayMunic  = overrides.municipality ?? (profileUser as any)?.municipality ?? mockUser.municipality;
  const displayProv   = overrides.province     ?? (profileUser as any)?.province     ?? mockUser.province;

  const [activeModal,      setActiveModal]      = useState<string | null>(null);
  const [editName,         setEditName]         = useState('');
  const [editEmail,        setEditEmail]        = useState('');
  const [editBarangay,     setEditBarangay]     = useState('');
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
    setEditEmail(displayEmail);
    setEditBarangay(displayBaran);
    setEditMunicipality(displayMunic);
    setEditProvince(displayProv);
    setActiveModal('editProfile');
  };

  const saveEdit = async () => {
    const next: ProfileOverrides = {
      name:         editName.trim()         || undefined,
      email:        editEmail.trim()        || undefined,
      barangay:     editBarangay.trim()     || undefined,
      municipality: editMunicipality.trim() || undefined,
      province:     editProvince.trim()     || undefined,
    };
    setOverrides(next);
    await storage.setItem(STORAGE_KEYS.PROFILE_OVERRIDES, next);
    setActiveModal(null);
  };

  const handleLogout = async () => {
    await logout();
    onLogout?.();
  };

  // Use real farms if loaded, else fall back to mock (so the card isn't empty in demos)
  const farmList: any[] = realFarms.length > 0 ? realFarms : mockFarms;

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={s.titleIcon}>
            <Ionicons name="person-outline" size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={s.headerTitle}>{tr.profileTitle}</Text>
            <Text style={s.headerSub} numberOfLines={1}>{displayName}</Text>
          </View>
        </View>
        <NotificationBell color="#059669" size={22} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile card — clean, no role chip, no decorative tinted boxes */}
        <View style={s.profileCard}>
          <View style={s.profileRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={s.profileInfo}>
              <Text style={s.profileName} numberOfLines={1}>{displayName}</Text>
              <Text style={s.profileEmail} numberOfLines={1}>{displayEmail}</Text>
            </View>
            <TouchableOpacity style={s.editIconBtn} onPress={openEdit} activeOpacity={0.7}>
              <Ionicons name="pencil-outline" size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location — internal title, hairline rows, no tinted icons */}
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.cardTitle}>{tr.profileLocation}</Text>
          {[
            { label: tr.profileEditBarangay,     value: displayBaran  || '—' },
            { label: tr.profileEditMunicipality, value: displayMunic  || '—' },
            { label: tr.profileEditProvince,     value: displayProv   || '—' },
          ].map((row, i, arr) => (
            <View key={row.label} style={[s.simpleRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.rowLabel}>{row.label}</Text>
              <Text style={s.rowValue} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Farms — real farms with mock fallback, clean rows */}
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.cardTitle}>{tr.profileFarms}</Text>
          {farmList.map((farm: any, i: number, arr: any[]) => {
            const area = farm.area_hectares ?? farm.areaHectares ?? null;
            const location = [farm.barangay, farm.municipality].filter(Boolean).join(', ') || '—';
            return (
              <View key={farm.id ?? i} style={[s.simpleRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.farmName} numberOfLines={1}>{farm.name}</Text>
                  <Text style={s.farmMeta} numberOfLines={1}>
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
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.cardTitle}>{tr.profileSettings}</Text>

          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>{tr.profilePushNotif}</Text>
              <Text style={s.toggleDesc}>{tr.profilePushNotifDesc}</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E5E7EB', true: '#059669' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>{tr.profileWeather}</Text>
              <Text style={s.toggleDesc}>{tr.profileWeatherDesc}</Text>
            </View>
            <Switch
              value={weatherAlertsEnabled}
              onValueChange={setWeatherAlertsEnabled}
              trackColor={{ false: '#E5E7EB', true: '#059669' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[s.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>{tr.profileLargeText}</Text>
              <Text style={s.toggleDesc}>{tr.profileLargeTextDesc}</Text>
            </View>
            <Switch
              value={isLargeText}
              onValueChange={toggleLargeText}
              trackColor={{ false: '#E5E7EB', true: '#059669' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.cardTitle}>{tr.profilePrefs}</Text>
          {PREFERENCES.map((item, i, arr) => (
            <TouchableOpacity
              key={item.id}
              style={[s.menuRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setActiveModal(item.id)}
              activeOpacity={0.65}
            >
              <Ionicons name={item.iconName} size={17} color="#6B7280" />
              <Text style={s.menuLabel}>{item.label}</Text>
              {item.id === 'language' && (
                <Text style={s.menuValue}>{LANGUAGE_LABELS[language]}</Text>
              )}
              <Ionicons name="chevron-forward" size={15} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Support */}
        <View style={[s.card, { marginTop: 16 }]}>
          <Text style={s.cardTitle}>{tr.profileSupport}</Text>
          {SUPPORT.map((item, i, arr) => (
            <TouchableOpacity
              key={item.id}
              style={[s.menuRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setActiveModal(item.id)}
              activeOpacity={0.65}
            >
              <Ionicons name={item.iconName} size={17} color="#6B7280" />
              <Text style={s.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={15} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <View style={s.versionCard}>
          <Image source={LogoImage} style={{ width: 32, height: 32 }} resizeMode="contain" />
          <Text style={s.versionName}>Rice-flow · GeoRice Advisor</Text>
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
                {([
                  { label: tr.profileEditName,         value: editName,         set: setEditName },
                  { label: tr.profileEditEmail,        value: editEmail,        set: setEditEmail },
                  { label: tr.profileEditBarangay,     value: editBarangay,     set: setEditBarangay },
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
                  <TouchableOpacity style={s.mSaveBtn} onPress={saveEdit} activeOpacity={0.85}>
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
                      onPress={() => setLanguage(lang)}
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

            {/* Generic placeholder modals */}
            {(activeModal === 'privacy' || activeModal === 'dataManagement' || activeModal === 'help' || activeModal === 'userGuide' || activeModal === 'about' || activeModal === 'terms') && (
              <View>
                <View style={s.mHeader}>
                  <Text style={s.mTitle}>
                    {[...PREFERENCES, ...SUPPORT].find(m => m.id === activeModal)?.label ?? ''}
                  </Text>
                  <TouchableOpacity onPress={() => setActiveModal(null)} style={s.mClose} activeOpacity={0.7}>
                    <Ionicons name="close" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={s.mPlaceholder}>
                  <Ionicons name="construct-outline" size={28} color="#9CA3AF" />
                  <Text style={s.mPlaceholderTitle}>{tr.comingSoon}</Text>
                  <Text style={[s.mBodyText, { textAlign: 'center' }]}>{tr.comingSoonBody}</Text>
                </View>
                <TouchableOpacity style={[s.mSaveBtn, { flex: 0 }]} onPress={() => setActiveModal(null)} activeOpacity={0.85}>
                  <Text style={s.mSaveBtnText}>{tr.ok}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  scroll:    { paddingHorizontal: 20, paddingBottom: 48 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  titleIcon:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  /* Profile card */
  profileCard: {
    marginTop: 20, backgroundColor: '#FFFFFF',
    borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16,
  },
  profileRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar:      { width: 56, height: 56, borderRadius: 28, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' },
  avatarText:  { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  profileEmail:{ fontSize: 12, color: '#6B7280' },
  editIconBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB', padding: 16,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },

  /* Simple data rows */
  simpleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  rowLabel:  { fontSize: 13, color: '#6B7280', flex: 1 },
  rowValue:  { fontSize: 13, fontWeight: '600', color: '#111827', flexShrink: 1 },
  farmName:  { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  farmMeta:  { fontSize: 12, color: '#9CA3AF' },
  emptyHint: { fontSize: 12, color: '#9CA3AF', paddingVertical: 16, textAlign: 'center' },

  /* Toggle rows */
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  toggleTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  toggleDesc:  { fontSize: 12, color: '#9CA3AF', lineHeight: 16 },

  /* Menu rows */
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' },
  menuValue: { fontSize: 13, color: '#9CA3AF', marginRight: 2 },

  /* Version */
  versionCard: {
    alignItems: 'center', paddingVertical: 22, marginTop: 24, gap: 4,
  },
  versionName: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginTop: 6 },
  versionNum:  { fontSize: 11, color: '#9CA3AF' },

  /* Logout — ghost style */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50, marginTop: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  logoutBtnText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },

  /* Modal */
  mOverlay:  { flex: 1, justifyContent: 'flex-end' },
  mBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  mSheet:    { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10, maxHeight: '85%' },
  mHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 18 },

  mHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  mTitle:     { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  mClose:     { width: 30, height: 30, borderRadius: 9999, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },

  mFieldWrap:  { marginBottom: 14 },
  mFieldLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  mInput:      { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, backgroundColor: '#FFFFFF' },
  mInputText:  { flex: 1, fontSize: 14, color: '#111827' },

  mBodyText:   { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 16 },
  mChipGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  mSelChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  mSelChipActive:     { borderColor: '#059669', backgroundColor: '#ECFDF5' },
  mSelChipText:       { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  mSelChipTextActive: { color: '#059669', fontWeight: '700' },

  mNote: { fontSize: 11, color: '#9CA3AF', marginBottom: 14, marginTop: -4, fontStyle: 'italic' },

  mActionsRow: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 },
  mCancelBtn: {
    flex: 1, height: 50, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  mCancelBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  mSaveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 50, borderRadius: 12, backgroundColor: '#059669',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  mSaveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  mPlaceholder:      { alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 20, marginBottom: 16, gap: 8 },
  mPlaceholderTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
});
