import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients } from '@/src/constants/design';

interface ScreenBackgroundProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function ScreenBackground({ children, style, contentStyle }: ScreenBackgroundProps) {
  return (
    <LinearGradient colors={gradients.screen} style={[styles.screen, style]}>
      <View pointerEvents="none" style={[styles.circle, styles.circleTop]} />
      <View pointerEvents="none" style={[styles.circle, styles.circleBottom]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.45,
  },
  circleTop: {
    width: 180,
    height: 180,
    right: -70,
    top: 38,
    backgroundColor: colors.sky,
  },
  circleBottom: {
    width: 240,
    height: 240,
    left: -110,
    bottom: -80,
    backgroundColor: colors.lavender,
  },
});
