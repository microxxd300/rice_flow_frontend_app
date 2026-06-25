import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';

/**
 * Reusable skeleton block — gray base with a moving white-ish gradient sweep.
 * Use as a placeholder while real data is loading. Sized via `w` / `h`.
 *
 * Example: <Skeleton w={180} h={20} />
 * Use multiple stacked Skeletons to fake a card layout while data fetches.
 */
interface SkeletonProps {
  w: number | `${number}%`;
  h: number;
  br?: number;           // border radius (default 6)
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({ w, h, br = 6, style }) => {
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Use a generous offscreen range so the sweep crosses both narrow and wide skeletons.
  const offscreen = typeof w === 'number' ? w : 280;

  return (
    <View
      style={[
        { width: w, height: h, borderRadius: br, backgroundColor: '#EDEFF1', overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute', top: 0, bottom: 0,
          width: offscreen * 0.55,
          transform: [{
            translateX: sweep.interpolate({
              inputRange: [0, 1],
              outputRange: [-offscreen * 0.6, offscreen],
            }),
          }],
        }}
      >
        <ExpoGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};
