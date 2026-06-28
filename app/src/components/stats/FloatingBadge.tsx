import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import type { ZodiacSign } from "@/src/constants/zodiac";

interface FloatingBadgeProps {
  sign?: ZodiacSign;
  size?: number;
}

export function FloatingBadge({ sign, size = 56 }: FloatingBadgeProps) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (offset.value - 0.5) * 12 }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ConstellationBadge sign={sign} size={size} />
    </Animated.View>
  );
}
