import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useLanguageStore } from '@/store/languageStore';
import { useTranslation } from '@/i18n/useTranslation';
import { LANGUAGE_LABELS, type Language } from '@/i18n/translations';

const FieldPhoto = require('../assets/bg/rice_field.jpg');

type Nav = StackNavigationProp<any>;

const LANGS: Language[] = ['fil', 'ceb', 'en'];

/**
 * The first screen: a rice field photo, one line about the app, the language (picked
 * before anything else is read; a new account keeps it), then log in or sign up.
 */
export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const tr = useTranslation();
  const { height } = useWindowDimensions();
  const { top, bottom } = useSafeAreaInsets();
  const language    = useLanguageStore(st => st.language);
  const setLanguage = useLanguageStore(st => st.setLanguage);

  // The photo takes a little over half the screen; less on short phones
  const photoH = Math.round(Math.min(Math.max(height * 0.52, 300), 520));

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottom + 24 }} bounces={false} showsVerticalScrollIndicator={false}>

        {/* Photo with the name on it */}
        <View style={[s.hero, { height: photoH }]}>
          <Image source={FieldPhoto} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[s.brand, { top: top + 18 }]}>
            <Ionicons name="leaf" size={26} color="#FFFFFF" />
            <Text style={s.brandText}>RiceFlow</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.headline}>{tr.welHeadline}</Text>
          <Text style={s.sub}>{tr.welSub}</Text>

          {/* Language first: everything after this reads in it */}
          <View style={s.langs}>
            {LANGS.map(l => {
              const on = language === l;
              return (
                <TouchableOpacity
                  key={l}
                  style={[s.lang, on && s.langOn]}
                  onPress={() => { setLanguage(l).catch(() => {}); }}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[s.langText, on && s.langTextOn]}>{LANGUAGE_LABELS[l]}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={s.darkBtn} onPress={() => navigation.navigateDeprecated('Login')} activeOpacity={0.85}>
            <Text style={s.darkBtnText}>{tr.welLogin}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.whiteBtn} onPress={() => navigation.navigateDeprecated('Register')} activeOpacity={0.85}>
            <Text style={s.whiteBtnText}>{tr.welCreate}</Text>
          </TouchableOpacity>

          <View style={s.noteRow}>
            <Ionicons name="lock-closed-outline" size={13} color="#6B7280" />
            <Text style={s.noteText}>{tr.welPrivate}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const INK  = '#111827';
const PAGE = '#F1F2F1';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE },

  hero: {
    width: '100%', overflow: 'hidden',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36,
    backgroundColor: '#1F2937',
  },
  brand:     { position: 'absolute', left: 22, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: {
    fontSize: 24, color: '#FFFFFF', fontFamily: 'Inter_700Bold', letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 },
  },

  body:     { paddingHorizontal: 24, paddingTop: 28 },
  headline: { fontSize: 36, lineHeight: 42, color: INK, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  sub:      { fontSize: 15, color: '#6B7280', fontFamily: 'Inter_500Medium', marginTop: 10, lineHeight: 22 },

  langs:      { flexDirection: 'row', gap: 10, marginTop: 24, marginBottom: 24 },
  lang:       { flex: 1, height: 46, borderRadius: 23, backgroundColor: '#E4E6E4', justifyContent: 'center', alignItems: 'center' },
  langOn:     { backgroundColor: INK },
  langText:   { fontSize: 14, color: INK, fontFamily: 'Inter_600SemiBold' },
  langTextOn: { color: '#FFFFFF' },

  darkBtn:      { height: 56, borderRadius: 20, backgroundColor: INK, justifyContent: 'center', alignItems: 'center' },
  darkBtnText:  { fontSize: 16, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  whiteBtn:     {
    height: 56, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginTop: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  whiteBtnText: { fontSize: 16, color: INK, fontFamily: 'Inter_700Bold' },

  noteRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
  noteText: { fontSize: 12, color: '#6B7280', fontFamily: 'Inter_500Medium' },
});
