import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { colors } from "@/src/constants/design";
import type { ZodiacInfo } from "@/src/constants/zodiac";
import {
  getSummaryComment,
  periodLabel,
  type TrendsPeriod,
} from "@/src/hooks/useHoroscopeTrends";

interface SummaryCardProps {
  zodiac: ZodiacInfo | null;
  period: TrendsPeriod;
  averageRank: number | null;
  minRank: number | null;
  maxRank: number | null;
  detailMode: boolean;
  onToggleDetailMode: () => void;
}

export function SummaryCard({
  zodiac,
  period,
  averageRank,
  minRank,
  maxRank,
  detailMode,
  onToggleDetailMode,
}: SummaryCardProps) {
  return (
    <View style={styles.summary}>
      {zodiac ? (
        <>
          <View style={styles.summaryTopRow}>
            <ConstellationBadge sign={zodiac.sign} size={44} />
            <View style={styles.summaryNameBlock}>
              <View style={styles.summaryNameRow}>
                <Text style={styles.zodiacName}>{zodiac.ko}</Text>
                <View style={styles.mineBadge}>
                  <Text style={styles.mineBadgeText}>내 별자리</Text>
                </View>
              </View>
              <Text style={styles.summarySubtitle}>
                {periodLabel(period)} 운세 흐름
              </Text>
            </View>
            <View style={styles.averageBlock}>
              <Text style={styles.averageLabel}>평균</Text>
              <View style={styles.averageValueRow}>
                <Text style={styles.averageValue}>
                  {averageRank === null
                    ? "-"
                    : detailMode
                      ? averageRank.toFixed(1)
                      : Math.round(averageRank)}
                </Text>
                <Text style={styles.averageUnit}>위</Text>
              </View>
            </View>
          </View>
          {minRank !== null && maxRank !== null && (
            <View style={styles.bestWorstRow}>
              <Text style={styles.bestWorst}>
                최고 {minRank}위 · 최저 {maxRank}위
              </Text>
              <Pressable onPress={onToggleDetailMode} hitSlop={6}>
                <Text style={styles.detailLink}>
                  {detailMode ? "간단히 보기" : "자세히 보기"}
                </Text>
              </Pressable>
            </View>
          )}
          <View style={styles.commentBox}>
            <Feather name="sun" size={14} color={colors.apricotDark} />
            <Text style={styles.commentText}>
              {getSummaryComment(averageRank)}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.noZodiacText}>별자리를 먼저 선택해주세요.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryNameBlock: {
    flex: 1,
  },
  summaryNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  zodiacName: {
    fontSize: 16,
    lineHeight: 22,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
  },
  mineBadge: {
    borderRadius: 6,
    backgroundColor: "rgba(255,253,249,0.80)",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mineBadgeText: {
    color: colors.apricotDark,
    fontSize: 9,
    lineHeight: 12,
    fontFamily: "NotoSansKR_700Bold",
    includeFontPadding: false,
    letterSpacing: 0.54,
  },
  summarySubtitle: {
    fontSize: 12,
    lineHeight: 17,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    marginTop: 2,
  },
  averageBlock: {
    alignItems: "flex-end",
  },
  averageLabel: {
    fontSize: 11,
    lineHeight: 15,
    includeFontPadding: false,
    color: colors.textSoft,
  },
  averageValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  averageValue: {
    fontSize: 34,
    lineHeight: 38,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_700Bold",
    color: colors.apricotDark,
  },
  averageUnit: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    color: colors.textMid,
    marginBottom: 4,
  },
  bestWorstRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  bestWorst: {
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
  },
  detailLink: {
    fontSize: 12,
    lineHeight: 16,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    textDecorationLine: "underline",
  },
  commentBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "rgba(245,217,139,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_300Light",
    color: colors.text,
  },
  noZodiacText: {
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
    textAlign: "center",
  },
});
