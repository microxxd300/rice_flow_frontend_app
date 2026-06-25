import React from 'react';
import { View } from 'react-native';

interface PalayLogoProps {
  size?: number;
  color?: string;
}

/**
 * Rice plant (palay) brand mark.
 * Stem + two leaves + panicle grain cluster at top.
 */
export const PalayLogo: React.FC<PalayLogoProps> = ({ size = 32, color = '#1F6B3F' }) => {
  const half = size / 2;
  const sw   = Math.max(2, Math.round(size * 0.07));   // stem width
  const lw   = Math.round(size * 0.22);                // leaf width
  const lh   = Math.round(size * 0.40);                // leaf height
  const gw   = Math.round(size * 0.13);                // grain width
  const gh   = Math.round(size * 0.24);                // grain height

  return (
    <View style={{ width: size, height: size }}>
      {/* Stem */}
      <View style={{
        position: 'absolute',
        left: half - sw / 2,
        top: size * 0.20,
        width: sw,
        height: size * 0.72,
        backgroundColor: color,
        borderRadius: sw,
      }} />

      {/* Right leaf — upper, angles out to the right */}
      <View style={{
        position: 'absolute',
        left: half - sw / 2,
        top: size * 0.23,
        width: lw,
        height: lh,
        borderRadius: lw / 2,
        backgroundColor: color,
        opacity: 0.80,
        transform: [{ rotate: '36deg' }],
      }} />

      {/* Left leaf — lower, angles out to the left */}
      <View style={{
        position: 'absolute',
        left: half + sw / 2 - lw,
        top: size * 0.40,
        width: lw,
        height: lh,
        borderRadius: lw / 2,
        backgroundColor: color,
        opacity: 0.65,
        transform: [{ rotate: '-36deg' }],
      }} />

      {/* Panicle grain — right */}
      <View style={{
        position: 'absolute',
        left: half + sw / 2 - gw * 0.2,
        top: size * 0.02,
        width: gw,
        height: gh,
        borderRadius: gw / 2,
        backgroundColor: color,
        transform: [{ rotate: '18deg' }],
      }} />

      {/* Panicle grain — left */}
      <View style={{
        position: 'absolute',
        left: half - sw / 2 - gw * 0.8,
        top: size * 0.03,
        width: gw,
        height: gh,
        borderRadius: gw / 2,
        backgroundColor: color,
        opacity: 0.75,
        transform: [{ rotate: '-18deg' }],
      }} />
    </View>
  );
};

/** @deprecated Use PalayLogo */
export const SeedLogo = PalayLogo;
