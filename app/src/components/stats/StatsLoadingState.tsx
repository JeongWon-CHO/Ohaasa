import { StyleSheet, View, type ViewStyle } from "react-native";

import { radius } from "@/src/constants/design";

function SkeletonBlock({ style }: { style?: ViewStyle }) {
  return <View style={[styles.block, style]} />;
}

export function StatsLoadingState() {
  return (
    <View style={styles.root}>
      <SkeletonBlock style={styles.periodSkeleton} />

      <View style={styles.summarySkeletonRow}>
        <SkeletonBlock style={styles.summaryBadge} />
        <View style={styles.summaryLines}>
          <SkeletonBlock style={styles.lineWide} />
          <SkeletonBlock style={styles.lineNarrow} />
        </View>
        <SkeletonBlock style={styles.summaryNumber} />
      </View>

      <SkeletonBlock style={styles.chartCardSkeleton} />
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
    borderRadius: radius.md,
    backgroundColor: "rgba(237,227,214,0.55)",
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
