import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ui } from '@/constants/ui';

type Props = {
  compact?: boolean;
};

export default function AuroraBackdrop({ compact = false }: Props) {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={[styles.orb, styles.orbTop, compact && styles.orbTopCompact]} />
      <View style={[styles.orb, styles.orbMiddle, compact && styles.orbMiddleCompact]} />
      <View style={[styles.orb, styles.orbBottom, compact && styles.orbBottomCompact]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTop: {
    width: 320,
    height: 320,
    right: -70,
    top: -40,
    backgroundColor: 'rgba(168, 104, 255, 0.24)',
    shadowColor: ui.colors.glow,
    shadowOpacity: 0.35,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
  orbMiddle: {
    width: 240,
    height: 240,
    left: -70,
    top: 180,
    backgroundColor: 'rgba(114, 85, 255, 0.16)',
    shadowColor: ui.colors.glow,
    shadowOpacity: 0.25,
    shadowRadius: 52,
    shadowOffset: { width: 0, height: 0 },
  },
  orbBottom: {
    width: 260,
    height: 260,
    right: -30,
    bottom: 40,
    backgroundColor: 'rgba(229, 163, 255, 0.14)',
    shadowColor: ui.colors.glowSoft,
    shadowOpacity: 0.3,
    shadowRadius: 74,
    shadowOffset: { width: 0, height: 0 },
  },
  orbTopCompact: {
    width: 240,
    height: 240,
    top: -60,
  },
  orbMiddleCompact: {
    width: 180,
    height: 180,
    top: 120,
  },
  orbBottomCompact: {
    width: 180,
    height: 180,
    bottom: 10,
  },
});
