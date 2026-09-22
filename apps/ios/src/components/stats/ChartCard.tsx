import { useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { FloatingBadge } from "@/src/components/stats/FloatingBadge";
import { RankTrendChart } from "@/src/components/stats/RankTrendChart";
import { colors } from "@/src/constants/design";
import type { ZodiacInfo } from "@/src/constants/zodiac";
import type { RankPoint } from "@/src/hooks/useHoroscopeTrends";

interface ChartCardProps {
  zodiac: ZodiacInfo | null;
  compareSign: ZodiacInfo | null;
  points: RankPoint[];
  comparePoints: RankPoint[];
  canShare: boolean;
  saving: boolean;
  sharing: boolean;
  onSave: () => void;
  onShare: () => void;
  onOpenCompareSheet: () => void;
  onRemoveCompare: () => void;
}

export function ChartCard({
  zodiac,
  compareSign,
  points,
  comparePoints,
  canShare,
  saving,
  sharing,
  onSave,
  onShare,
  onOpenCompareSheet,
  onRemoveCompare,
}: ChartCardProps) {
  const [chartWidth, setChartWidth] = useState(0);
  const onChartLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartTitleRow}>
        <Text style={styles.chartTitle}>순위 흐름</Text>
        {canShare && (
          <View style={styles.chartActions}>
            <Pressable onPress={onSave} disabled={saving || sharing} hitSlop={8}>
              <View style={styles.chartActionIcon}>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.apricotDark} />
                ) : (
                  <Feather name="download" size={16} color={colors.apricotDark} />
                )}
              </View>
            </Pressable>
            <Pressable onPress={onShare} disabled={saving || sharing} hitSlop={8}>
              <View style={styles.chartActionIcon}>
                {sharing ? (
                  <ActivityIndicator size="small" color={colors.apricotDark} />
                ) : (
                  <Feather name="share-2" size={16} color={colors.apricotDark} />
                )}
              </View>
            </Pressable>
          </View>
        )}
      </View>

      {zodiac && (
        <View style={styles.compareRow}>
          <View style={styles.compareChip}>
            <View style={[styles.compareSwatch, { backgroundColor: colors.apricotDark }]} />
            <Text style={styles.compareChipText}>{zodiac.ko}</Text>
          </View>

          {compareSign ? (
            <>
              <View style={[styles.compareChip, styles.compareChipSky]}>
                <View style={[styles.compareSwatch, { backgroundColor: colors.skyDark }]} />
                <Text style={styles.compareChipText}>{compareSign.ko}</Text>
                <Pressable onPress={onRemoveCompare} hitSlop={8}>
                  <Feather name="x" size={12} color={colors.skyDark} />
                </Pressable>
              </View>
              <Pressable style={styles.changeCompareChip} onPress={onOpenCompareSheet}>
                <Text style={styles.changeCompareChipText}>변경</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.addCompareChip} onPress={onOpenCompareSheet}>
              <Text style={styles.addCompareChipText}>+ 다른 별자리와 비교</Text>
            </Pressable>
          )}
        </View>
      )}
      {compareSign && comparePoints.length < 2 && (
        <Text style={styles.compareInsufficientText}>이 별자리는 아직 데이터가 부족해요</Text>
      )}

      <View style={styles.chartBody} onLayout={onChartLayout}>
        {points.length < 7 ? (
          <View style={styles.chartPlaceholder}>
            <FloatingBadge sign={zodiac?.sign} size={56} />
            <Text style={styles.placeholderTitle}>아직 흐름을 보여드리기엔 일러요</Text>
            <Text style={styles.placeholderText}>며칠만 더 운세를 모으면 예쁜 흐름을 보여드릴게요</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(points.length / 7) * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{points.length}일째 기록 중 · 7일부터 그래프 등장 ✦</Text>
          </View>
        ) : (
          chartWidth > 0 && <RankTrendChart points={points} comparePoints={comparePoints} width={chartWidth} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  chartTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chartActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  chartActionIcon: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chartTitle: {
    fontSize: 14,
    lineHeight: 19,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
  },
  compareRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  compareChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 14,
    backgroundColor: "rgba(217,138,104,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compareSwatch: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
  compareChipText: {
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
  },
  compareChipSky: {
    backgroundColor: "rgba(123,174,199,0.16)",
  },
  changeCompareChip: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  changeCompareChipText: {
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.textSoft,
  },
  addCompareChip: {
    borderRadius: 14,
    backgroundColor: "rgba(184,216,232,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addCompareChipText: {
    fontSize: 11.5,
    lineHeight: 15,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.skyDark,
  },
  compareInsufficientText: {
    fontSize: 11,
    lineHeight: 15,
    includeFontPadding: false,
    color: colors.textSoft,
    marginTop: 6,
  },
  chartBody: {
    marginTop: 16,
    minHeight: 160,
  },
  chartPlaceholder: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  placeholderTitle: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
    textAlign: "center",
  },
  placeholderText: {
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: false,
    color: colors.textSoft,
    textAlign: "center",
  },
  progressTrack: {
    width: "80%",
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginTop: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.apricotDark,
  },
  progressLabel: {
    fontSize: 11,
    lineHeight: 15,
    includeFontPadding: false,
    color: colors.textSoft,
    marginTop: 2,
  },
});
