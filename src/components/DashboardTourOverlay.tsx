import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, Image, TouchableOpacity, Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';

const { width: W, height: H } = Dimensions.get('window');
const MascotImage = require('../assets/images/mascot.png');

const NAV_H   = 72;
const NAV_TOP = H - NAV_H;
const TAB_W   = W / 4;
const PAD     = 16;

interface TourStep {
  speech: string;
  spotTop?: number;    // fraction of H
  spotH?: number;      // fraction of H
  navIdx?: number;     // 0=Home 1=Guide 2=MyCrops 3=MyInfo
  cardPos: 'top' | 'bottom';
}

const STEPS: TourStep[] = [
  {
    cardPos: 'bottom',
    speech: "Hello! I am Kuya Rico, your farm guide. I will show you how to use this app step by step. Tap Next to start!",
  },
  {
    spotTop: 0.07,
    spotH: 0.33,
    cardPos: 'bottom',
    speech: "This green card shows your Crop Status — the growing stage of your rice and how many days are left until harvest. Check it every morning!",
  },
  {
    spotTop: 0.42,
    spotH: 0.105,
    cardPos: 'bottom',
    speech: "I will give you one farming tip here every day. Read it to know what you need to do in your field today.",
  },
  {
    navIdx: 1,
    cardPos: 'top',
    speech: "Tap the Guide button here at the bottom. It shows you step-by-step instructions — when to plant, when to add fertilizer, and how to stop pests.",
  },
  {
    navIdx: 2,
    cardPos: 'top',
    speech: "Tap My Crops here to write down what you see in your field. Record problems, what you did, and your harvest so you never forget.",
  },
  {
    navIdx: 3,
    cardPos: 'top',
    speech: "Tap My Info here to see and update your farm details — your name, farm location, and settings — anytime.",
  },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

export const DashboardTourOverlay: React.FC<Props> = ({ visible, onDone }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isIntro = step === 0;

  const handleNext = () => {
    if (isLast) { setStep(0); onDone(); return; }
    setStep(s => s + 1);
  };
  const handleSkip = () => { setStep(0); onDone(); };

  if (!visible) return null;

  const sTop  = current.spotTop !== undefined ? H * current.spotTop : 0;
  const sH    = current.spotH   !== undefined ? H * current.spotH   : 0;
  const nLeft  = current.navIdx !== undefined ? TAB_W * current.navIdx : 0;
  const nRight = current.navIdx !== undefined ? TAB_W * (3 - current.navIdx) : 0;

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={s.root}>

        {/* ── Full dark (intro step) ── */}
        {isIntro && <View style={s.fullDark} />}

        {/* ── Spotlight around screen section ── */}
        {!isIntro && current.spotTop !== undefined && (
          <>
            <View style={[s.dark, { top: 0, left: 0, right: 0, height: sTop }]} />
            <View style={[s.dark, { top: sTop, left: 0, width: PAD, height: sH }]} />
            <View style={[s.dark, { top: sTop, right: 0, width: PAD, height: sH }]} />
            <View style={[s.dark, { top: sTop + sH, left: 0, right: 0, bottom: 0 }]} />
            <View style={[s.spotBorder, { top: sTop, left: PAD, width: W - PAD * 2, height: sH }]} />
          </>
        )}

        {/* ── Spotlight around nav tab ── */}
        {!isIntro && current.navIdx !== undefined && (
          <>
            <View style={[s.dark, { top: 0, left: 0, right: 0, height: NAV_TOP }]} />
            <View style={[s.dark, { top: NAV_TOP, bottom: 0, left: 0, width: nLeft }]} />
            <View style={[s.dark, { top: NAV_TOP, bottom: 0, right: 0, width: nRight }]} />
            <View style={[s.navBorder, { top: NAV_TOP, left: nLeft, width: TAB_W }]} />
          </>
        )}

        {/* ── Kuya Rico card ── */}
        <View style={[s.card, current.cardPos === 'top' ? s.cardTop : s.cardBottom]}>
          <Image source={MascotImage} style={s.mascot} resizeMode="contain" />
          <View style={s.bubble}>
            <Text style={s.bubbleName}>Kuya Rico</Text>
            <Text style={s.bubbleText}>{current.speech}</Text>
          </View>
        </View>

        {/* ── Controls ── */}
        <View style={[s.controls, current.cardPos === 'top' ? s.ctrlTop : s.ctrlBottom]}>
          <TouchableOpacity style={s.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={s.skipText}>Skip Tour</Text>
          </TouchableOpacity>

          <View style={s.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[s.dot, i === step && s.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={s.nextText}>{isLast ? 'Done!' : 'Next'}</Text>
            <Ionicons
              name={isLast ? 'checkmark' : 'arrow-forward'}
              size={15}
              color={theme.colors.white}
            />
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },

  fullDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  dark: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  spotBorder: {
    position: 'absolute',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: theme.colors.white,
  },
  navBorder: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 2.5,
    borderColor: theme.colors.white,
    borderBottomWidth: 0,
  },

  /* Kuya Rico card */
  card: {
    position: 'absolute',
    left: 16, right: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    backgroundColor: theme.colors.white,
    borderRadius: 22,
    padding: 16,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  cardBottom: { bottom: 108 },
  cardTop:    { top: 80 },

  mascot: { width: 64, height: 64, flexShrink: 0 },
  bubble: { flex: 1 },
  bubbleName: {
    fontSize: 11, fontWeight: '800', color: theme.colors.primary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5,
  },
  bubbleText: { fontSize: 15, color: theme.colors.text, lineHeight: 22 },

  /* Controls row */
  controls: {
    position: 'absolute',
    left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  ctrlBottom: { bottom: 52 },
  ctrlTop:    { top: 250 },

  skipBtn: {
    paddingVertical: 9, paddingHorizontal: 16,
    borderRadius: theme.radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  skipText: { fontSize: 13, fontWeight: '600', color: theme.colors.white },

  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 20, borderRadius: 4, backgroundColor: theme.colors.white },

  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
    paddingVertical: 9, paddingHorizontal: 18,
  },
  nextText: { fontSize: 14, fontWeight: '800', color: theme.colors.white },
});
