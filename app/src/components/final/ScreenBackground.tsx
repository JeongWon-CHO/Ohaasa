import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients } from '@/src/constants/design';
import { StarfieldDeco } from '@/src/components/final/ScreenDeco';

interface ScreenBackgroundProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * 그라데이션 위에 얹는 장식.
   * - `circles`: 큰 원 두 개(기본)
   * - `starfield`: 오하아사 화면과 같은 원·별·달 한 벌
   */
  deco?: 'circles' | 'starfield';
}

export function ScreenBackground({
  children,
  style,
  contentStyle,
  deco = 'circles',
}: ScreenBackgroundProps) {
  return (
    <LinearGradient colors={gradients.screen} style={[styles.screen, style]}>
      {deco === 'starfield' ? (
        <StarfieldDeco />
      ) : (
        <>
          <View pointerEvents="none" style={[styles.circle, styles.circleTop]} />
          <View pointerEvents="none" style={[styles.circle, styles.circleBottom]} />
        </>
      )}
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
