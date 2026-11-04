import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Image, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { welcomePhotoHeight, PHOTO_RATIO } from '@/utils/welcomeLayout';

const LeafS     = require('../assets/logo/logo_leaf_s.png');
const LeafCurve = require('../assets/logo/logo_leaf_curve.png');
const Word      = require('../assets/logo/logo_word.png');
const LogoWhite = require('../assets/logo/logo_white.png');
const Field     = require('../assets/bg/rice_field.jpg');

// The logo pieces share one 720 × 515 frame, so they line up when stacked
const LOGO_RATIO = 515 / 720;
// Where each leaf starts and ends across the frame (0..1): the "drawing" reveals that span
const S_SPAN     = [0.15, 0.74];
const CURVE_SPAN = [0.33, 0.85];

interface SplashScreenProps {
  onDone: () => void;
}

/**
 * The opening animation, in code (no video, no internet): the S leaf draws in, the curved
 * leaf follows, "RiceFlow" rises, then the rice field photo drops in exactly where the
 * landing page shows it, so the hand-off to the landing page is seamless. About 2.6 s.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onDone }) => {
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const logoW  = Math.min(width * 0.62, 280);
  const logoH  = logoW * LOGO_RATIO;
  const photoH = welcomePhotoHeight(height);

  const [leafS]     = useState(() => new Animated.Value(0));
  const [leafCurve] = useState(() => new Animated.Value(0));
  const [word]      = useState(() => new Animated.Value(0));
  const [exit]      = useState(() => new Animated.Value(0));
  const done      = useRef(false);
  // The parent passes a new function on each render; the animation must still run once
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const draw = Easing.inOut(Easing.cubic);
    const anim = Animated.sequence([
      Animated.delay(150),
      Animated.parallel([
        Animated.timing(leafS,     { toValue: 1, duration: 750, easing: draw, useNativeDriver: false }),
        Animated.timing(leafCurve, { toValue: 1, duration: 650, delay: 300, easing: draw, useNativeDriver: false }),
        Animated.timing(word,      { toValue: 1, duration: 500, delay: 750, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
      Animated.delay(450),
      Animated.timing(exit, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]);
    const finish = () => { if (!done.current) { done.current = true; onDoneRef.current(); } };
    anim.start(finish);
    // Never stuck here: leave even if an animation callback is lost
    const failSafe = setTimeout(finish, 4000);
    return () => { anim.stop(); clearTimeout(failSafe); };
  }, [leafS, leafCurve, word, exit]);

  const reveal = (v: Animated.Value, [a, b]: number[]) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [a * logoW, b * logoW] });

  return (
    <View style={s.root}>
      {/* The logo, centred; it lifts and fades as the photo comes in */}
      <Animated.View
        style={[s.center, {
          opacity: exit.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }),
          transform: [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) }],
        }]}
      >
        <View style={{ width: logoW, height: logoH }}>
          {/* Each leaf "draws" left to right: its clip widens over the leaf's span */}
          <Animated.View style={[s.clip, { width: reveal(leafS, S_SPAN), height: logoH, opacity: leafS.interpolate({ inputRange: [0, 0.15], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
            <Image source={LeafS} style={{ width: logoW, height: logoH }} />
          </Animated.View>
          <Animated.View style={[s.clip, { width: reveal(leafCurve, CURVE_SPAN), height: logoH, opacity: leafCurve.interpolate({ inputRange: [0, 0.15], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
            <Image source={LeafCurve} style={{ width: logoW, height: logoH }} />
          </Animated.View>
          <Animated.Image
            source={Word}
            style={[s.layer, { width: logoW, height: logoH, opacity: word,
              transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
          />
        </View>
      </Animated.View>

      {/* The landing page's photo drops into its place */}
      <Animated.View
        style={[s.hero, { height: photoH,
          transform: [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [-photoH - 40, 0] }) }] }]}
      >
        <Image source={Field} style={[s.photo, { width, height: Math.max(width * PHOTO_RATIO, photoH) }]} resizeMode="cover" />
        <Image source={LogoWhite} style={[s.brand, { top: top + 14 }]} resizeMode="contain" />
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F1F2F1' },
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  clip:   { position: 'absolute', left: 0, top: 0, overflow: 'hidden' },
  layer:  { position: 'absolute', left: 0, top: 0 },
  hero:   {
    position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden',
    borderBottomLeftRadius: 36, borderBottomRightRadius: 36, backgroundColor: '#1F2937',
  },
  photo:  { position: 'absolute', left: 0, bottom: 0 },
  brand:  { position: 'absolute', left: 18, width: 116, height: 116 * (515 / 720) },
});
