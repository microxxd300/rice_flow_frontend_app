import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface OnboardingScreenProps {
  onDone: () => void;
}

const STEPS: {
  icon: IoniconsName;
  tabLabel: string;
  title: string;
  desc: string;
  speech: string;
}[] = [
  {
    icon: 'sunny-outline',
    tabLabel: '',
    title: 'Welcome to RiceFlow!',
    desc: 'Your personal rice farming guide. I will help you grow better rice and get a good harvest.',
    speech: "Hello! I'm Kuya Rico, your farm guide. Let me show you how to use this app in just a few steps!",
  },
  {
    icon: 'home-outline',
    tabLabel: 'Home',
    title: 'Your Daily Farm Summary',
    desc: 'Every time you open the app, you will see your farm status, any warnings, and what to check today.',
    speech: 'This is your Home. Open it every morning to see what is happening on your farm today.',
  },
  {
    icon: 'leaf-outline',
    tabLabel: 'Planting',
    title: 'Your Planting Guide',
    desc: 'Step-by-step instructions — when to plant, when to add fertilizer, how to stop pests. All written in simple words.',
    speech: 'Tap Planting to see your guide. It tells you exactly what to do and when to do it.',
  },
  {
    icon: 'bar-chart-outline',
    tabLabel: 'My Crops',
    title: 'Track Your Rice',
    desc: 'Write down what you see in your field. Record problems, note what you did, and track your harvest.',
    speech: 'Tap My Crops to record how your rice is growing. Write it down so you never forget.',
  },
  {
    icon: 'person-outline',
    tabLabel: 'My Info',
    title: 'Your Farm Details',
    desc: 'Your name, your farm location, and your settings are all saved here. You can update them anytime.',
    speech: 'Tap My Info if you need to change your farm details or update your settings.',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onDone }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = currentStep === STEPS.length - 1;
  const step = STEPS[currentStep];

  const goNext = () => {
    if (isLast) { onDone(); return; }
    const next = currentStep + 1;
    setCurrentStep(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  };

  const goTo = (index: number) => {
    setCurrentStep(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  return (
    <SafeAreaView style={s.root}>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {STEPS.map((st, i) => (
          <View key={i} style={s.slide}>

            {/* Top green area — mascot + speech bubble */}
            <View style={s.topArea}>
              <View style={s.mascotWrapper}>
                <Image
                  source={require('../assets/images/mascot.png')}
                  style={s.mascotImage}
                  resizeMode="contain"
                />
              </View>
              <View style={s.speechBubble}>
                <Text style={s.speechName}>Kuya Rico</Text>
                <Text style={s.speechText}>{st.speech}</Text>
                <View style={s.bubbleTail} />
              </View>
            </View>

            {/* Bottom white area — step content */}
            <View style={s.bottomArea}>
              <View style={s.stepIconBox}>
                <Ionicons name={st.icon} size={32} color={theme.colors.primary} />
              </View>

              {st.tabLabel !== '' && (
                <View style={s.tabPill}>
                  <Ionicons name={st.icon} size={13} color={theme.colors.primary} />
                  <Text style={s.tabPillText}>{st.tabLabel}</Text>
                </View>
              )}

              <Text style={s.stepTitle}>{st.title}</Text>
              <Text style={s.stepDesc}>{st.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom nav */}
      <View style={s.bottomNav}>
        {/* Dots */}
        <View style={s.dots}>
          {STEPS.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
              <View style={[s.dot, i === currentStep && s.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Next / Done button */}
        <TouchableOpacity style={s.nextBtn} onPress={goNext} activeOpacity={0.88}>
          <Text style={s.nextBtnText}>
            {isLast ? "Let's Start!" : 'Next'}
          </Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'arrow-forward'}
            size={18}
            color={theme.colors.white}
          />
        </TouchableOpacity>

        {/* Step counter */}
        <Text style={s.stepCounter}>{currentStep + 1} of {STEPS.length}</Text>
      </View>

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },

  skipBtn: {
    position: 'absolute', top: 52, right: theme.spacing.lg,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: theme.radius.full,
    paddingVertical: 6, paddingHorizontal: 14,
    borderWidth: 1, borderColor: theme.colors.borderLight,
  },
  skipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },

  slide: { width, flex: 1 },

  /* Top green section */
  topArea: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60, paddingBottom: 32,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center', gap: 20,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  mascotWrapper: {
    width: 160, height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  mascotImage: { width: 140, height: 140 },
  speechBubble: {
    width: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: 16, padding: theme.spacing.md,
    position: 'relative',
  },
  speechName: {
    fontSize: 12, fontWeight: '800',
    color: theme.colors.primary, marginBottom: 4,
  },
  speechText: {
    fontSize: 14, color: theme.colors.text,
    lineHeight: 20,
  },
  bubbleTail: {
    position: 'absolute', top: -10, left: 32,
    width: 0, height: 0,
    borderLeftWidth: 10, borderLeftColor: 'transparent',
    borderRightWidth: 10, borderRightColor: 'transparent',
    borderBottomWidth: 10, borderBottomColor: theme.colors.white,
  },

  /* Bottom white section */
  bottomArea: {
    flex: 1, paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    alignItems: 'center',
  },
  stepIconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: theme.colors.primaryLighter,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.colors.primaryLighter,
    borderRadius: theme.radius.full,
    paddingVertical: 5, paddingHorizontal: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.primary + '30',
  },
  tabPillText: {
    fontSize: 12, fontWeight: '700', color: theme.colors.primary,
  },
  stepTitle: {
    fontSize: 22, fontWeight: '900', color: theme.colors.text,
    textAlign: 'center', letterSpacing: -0.4, marginBottom: theme.spacing.md,
  },
  stepDesc: {
    fontSize: 15, color: theme.colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },

  /* Bottom nav */
  bottomNav: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    alignItems: 'center', gap: 16,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: theme.colors.borderLight,
  },
  dotActive: {
    width: 24, backgroundColor: theme.colors.primary,
  },
  nextBtn: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 16, paddingVertical: 16,
    ...theme.shadows.md,
  },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: theme.colors.white },
  stepCounter: {
    fontSize: 12, color: theme.colors.textTertiary, fontWeight: '500',
  },
});
