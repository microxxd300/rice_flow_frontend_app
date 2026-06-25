import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

type Nav = StackNavigationProp<any>;
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface FarmSetupWelcomeScreenProps {
  onSkip?: () => void;
}

const STEPS: { iconName: IoniconsName; title: string; text: string }[] = [
  { iconName: 'create-outline',   title: 'Farm details',     text: "Your farm's name and area"           },
  { iconName: 'navigate-outline', title: 'GPS location',     text: 'Tag your farm on the map'            },
  { iconName: 'leaf-outline',     title: 'Top 3 varieties',  text: 'Rice varieties matched to your land' },
  { iconName: 'book-outline',     title: 'Planting guide',   text: 'Step-by-step plan for the season'    },
];

export const FarmSetupWelcomeScreen: React.FC<FarmSetupWelcomeScreenProps> = () => {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={s.root}>

      {/* Header — back chevron + page title (matches the rest of the auth flow) */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={s.headerTitle}>Set up your farm</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.lead}>
          Four short steps. We'll use this to recommend the right rice variety for your farm.
        </Text>

        {/* Numbered step list — flat rows, no decorative containers per row */}
        <View style={s.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={[s.stepRow, i < STEPS.length - 1 && s.stepRowDivider]}>
              <Text style={s.stepNum}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepText}>{step.text}</Text>
              </View>
              <Ionicons name={step.iconName} size={18} color="#9CA3AF" />
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Primary action — matches the app's button vocabulary */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.saveBtn}
          onPress={() => navigation.navigate('FarmDetailsForm')}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>Get started</Text>
        </TouchableOpacity>
      </View>

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
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  skipBtn:     { width: 44, height: 32, justifyContent: 'center', alignItems: 'center' },
  skipText:    { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },

  lead: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 24 },

  steps: { backgroundColor: '#FFFFFF' },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 16,
  },
  stepRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  stepNum:   { width: 22, fontSize: 14, fontWeight: '700', color: '#9CA3AF', textAlign: 'center' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  stepText:  { fontSize: 12, color: '#6B7280', lineHeight: 17 },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    height: 50, borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
});
