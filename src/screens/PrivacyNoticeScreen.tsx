import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

// Terms of use and privacy notice shown from the sign-up screen. Keep it in plain
// language and in line with what the app actually collects and sends.
const LAST_UPDATED = 'October 2026';

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: 'What we collect',
    items: [
      'Your name, username or email, and barangay.',
      'Your farm: name, size, and the location you pin on the map.',
      'What you record in the app: soil and weather scans, crop progress, harvests, and messages to the AI assistant.',
    ],
  },
  {
    title: 'Why we collect it',
    items: [
      'To recommend rice varieties that suit your farm.',
      'To make your planting guide and estimate your yield.',
      'To help agriculturists in Panabo City support farmers.',
    ],
  },
  {
    title: 'Who can see it',
    items: [
      'You.',
      'RiceFlow administrators and agriculturists, who can see registered farms on a map.',
      'Your farm\'s map location (without your name) is sent to SoilGrids and Open-Meteo to get soil and weather data.',
      'Messages to the AI assistant are sent to Google Gemini with facts about your selected farm '
        + '(size, barangay, soil, rice variety, crop stage, field logs and weather), so the answer fits '
        + 'your farm. Your name, email and farm name are not sent.',
      'RiceFlow uses the free plan of Google Gemini, so Google may use what is sent to it to improve '
        + 'its services. Do not type personal details (like phone numbers) in the AI chat.',
      'We do not sell your information or use it for ads.',
    ],
  },
  {
    title: 'How we protect it',
    items: [
      'Your password is stored in a scrambled (hashed) form that nobody can read.',
      'Data is sent over an encrypted connection.',
      'Your data is stored on secure cloud servers (Supabase, in Tokyo, Japan).',
    ],
  },
  {
    title: 'Your rights',
    items: [
      'You can ask to see, correct, or delete your data at any time.',
      'Ask your agriculturist or rice technician, or contact the RiceFlow team.',
      'This follows the Philippine Data Privacy Act of 2012 (Republic Act 10173).',
    ],
  },
  {
    title: 'Terms of use',
    items: [
      'Recommendations and yield estimates are guidance, not a guarantee. Check with your agriculturist before big decisions.',
      'Keep your password to yourself and enter true information about your farm.',
      'Do not use the app to harm others or to break the law.',
    ],
  },
];

export const PrivacyNoticeScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms and Privacy</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.lead}>
          RiceFlow helps rice farmers in Panabo City. This page explains, in plain words, what
          information the app collects and how it is used.
        </Text>

        {SECTIONS.map(section => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.items.map(item => (
              <View key={item} style={s.itemRow}>
                <Text style={s.bullet}>•</Text>
                <Text style={s.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={s.updated}>Last updated: {LAST_UPDATED}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  backBtn:     { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  scroll:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  lead:        { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 8 },
  section:     { marginTop: 18 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 6 },
  itemRow:     { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet:      { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  itemText:    { flex: 1, fontSize: 13, color: '#374151', lineHeight: 19 },
  updated:     { fontSize: 11, color: '#9CA3AF', marginTop: 24 },
});
