import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SetupHeader } from '@/components/SetupHeader';

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

      <SetupHeader title="Set up your farm" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.lead}>
          Four short steps. We'll use this to recommend the right rice variety for your farm.
        </Text>

        {/* Numbered step list — flat rows, no decorative containers per row */}
        <View style={s.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={[s.stepRow, i < STEPS.length - 1 && s.stepRowDivider]}>
              <View style={s.stepNumTile}><Text style={s.stepNum}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepText}>{step.text}</Text>
              </View>
              <Ionicons name={step.iconName} size={20} color="#059669" />
            </View>
          ))}
        </View>

      </ScrollView>

      {/* Primary action — matches the app's button vocabulary */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.saveBtn}
          onPress={() => navigation.navigateDeprecated('FarmDetailsForm')}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>Get started</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F2F1' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  skipBtn:     { width: 44, height: 32, justifyContent: 'center', alignItems: 'center' },
  skipText:    { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  scroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24 },

  lead: { fontSize: 15, color: '#374151', lineHeight: 22, marginBottom: 16, paddingHorizontal: 4, fontFamily: 'Inter_500Medium' },

  steps: { backgroundColor: '#FFFFFF', borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2, paddingHorizontal: 16, paddingVertical: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  stepRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  stepNumTile: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  stepNum: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  stepTitle: { fontSize: 15, color: '#111827', marginBottom: 2, fontFamily: 'Inter_700Bold' },
  stepText: { fontSize: 13, color: '#6B7280', lineHeight: 18, fontFamily: 'Inter_500Medium' },

  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  saveBtn: { height: 56, borderRadius: 20, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
});
