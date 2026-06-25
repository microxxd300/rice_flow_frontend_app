import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const LogoImage = require('../assets/icons/welcome_screen_logo.png');

type Nav = StackNavigationProp<any>;

const clamp = (val: number, min: number, max: number) =>
  Math.min(Math.max(val, min), max);

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { width, height } = useWindowDimensions();

  // Logo scales with the smaller dimension so it looks right in both
  // orientations. Clamped so tiny phones stay readable and tablets don't blow it up.
  const logoSize = clamp(Math.min(width, height) * 0.26, 100, 160);

  // Top padding above the logo — pushes the whole brand block down from the header.
  const topPad   = clamp(height * 0.16, 100, 200);

  // Vertical space below the logo scales with screen height — taller screens
  // push "Get started" lower without crowding small phones.
  const brandGap = clamp(height * 0.18, 100, 200);

  return (
    <SafeAreaView style={s.root}>

      {/* Header — minimal: page title only, matches Login / Register */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={s.headerTitle}>Welcome</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Brand mark */}
        <View style={[s.brand, { marginBottom: brandGap }]}>
          <Image
            source={LogoImage}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
          />
        </View>

        {/* Headline */}
        <Text style={s.title}>Get started</Text>
        <Text style={s.sub}>
          Free for Filipino rice farmers — built to help you decide,
          plan, and harvest with confidence.
        </Text>

        <View style={{ height: 28 }} />

        {/* Primary action */}
        <TouchableOpacity
          style={s.saveBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={s.saveBtnText}>Log in</Text>
        </TouchableOpacity>

        <View style={{ height: 10 }} />

        {/* Secondary action */}
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.7}
        >
          <Text style={s.cancelBtnText}>Create an account</Text>
        </TouchableOpacity>

        <Text style={s.noteText}>
          Your information stays private and secure.
        </Text>

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
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  brand: { alignItems: 'center' },

  title: {
    fontSize: 22, fontWeight: '700',
    color: '#111827', letterSpacing: -0.4,
    marginBottom: 8,
  },
  sub: {
    fontSize: 13, color: '#6B7280',
    lineHeight: 20,
  },

  saveBtn: {
    height: 52, borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#059669', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  cancelBtn: {
    height: 52, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },

  noteText: {
    fontSize: 11, color: '#9CA3AF',
    textAlign: 'center', marginTop: 22,
  },
});
