import { useEffect } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { radius } from "@/src/constants/design";

function ShimmerBlock({ style }: { style?: ViewStyle }) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
  }, [sweep]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${-40 + sweep.value * 180}%` }],
  }));

  return (
    <View style={[styles.block, style]}>
      <Animated.View style={[styles.stripWrap, animatedStyle]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.6)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

export function StatsLoadingState() {
  return (
    <View style={styles.root}>
      <ShimmerBlock style={styles.periodSkeleton} />

      <View style={styles.summarySkeletonRow}>
        <ShimmerBlock style={styles.summaryBadge} />
        <View style={styles.summaryLines}>
          <ShimmerBlock style={styles.lineWide} />
          <ShimmerBlock style={styles.lineNarrow} />
        </View>
        <ShimmerBlock style={styles.summaryNumber} />
      </View>

      <ShimmerBlock style={styles.chartCardSkeleton} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 20,
  },
  block: {
    overflow: "hidden",
    borderRadius: radius.md,
    backgroundColor: "rgba(237,227,214,0.55)",
  },
  stripWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "40%",
  },
  periodSkeleton: {
    height: 44,
    borderRadius: 14,
  },
  summarySkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  summaryBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  summaryLines: {
    flex: 1,
    gap: 8,
  },
  lineWide: {
    height: 14,
    width: "70%",
    borderRadius: 7,
  },
  lineNarrow: {
    height: 11,
    width: "50%",
    borderRadius: 6,
  },
  summaryNumber: {
    width: 48,
    height: 34,
    borderRadius: 8,
  },
  chartCardSkeleton: {
    height: 240,
    borderRadius: 20,
  },
});
