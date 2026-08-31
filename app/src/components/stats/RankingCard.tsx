import { StyleSheet, Text, View } from "react-native";

import { AverageRankRow } from "@/src/components/final/AverageRankRow";
import { colors } from "@/src/constants/design";
import type { ZodiacSign } from "@/src/constants/zodiac";
import { periodLabel, type SignAverage, type TrendsPeriod } from "@/src/hooks/useHoroscopeTrends";

interface RankingCardProps {
  period: TrendsPeriod;
  signAverages: SignAverage[];
  detailMode: boolean;
  zodiacSign: ZodiacSign | null;
  compareId: ZodiacSign | null;
}

export function RankingCard({ period, signAverages, detailMode, zodiacSign, compareId }: RankingCardProps) {
  return (
    <View style={styles.rankingCard}>
      <View style={styles.rankingTitleRow}>
        <Text style={styles.sectionTitle}>별자리별 평균 순위</Text>
        <Text style={styles.rankingPeriodLabel}>{periodLabel(period)}</Text>
      </View>
      <Text style={styles.rankingCaption}>화살표는 전날 대비 등수 변화예요</Text>
      {signAverages.length === 0 ? (
        // '이번 달'은 매달 1일 크론(KST 05:59) 전이면 기간 안에 row가 하나도 없다
        <Text style={styles.rankingEmptyText}>{periodLabel(period)} 데이터가 아직 없어요</Text>
      ) : (
        <View style={styles.rankingList}>
          {signAverages.map((item) => (
            <AverageRankRow
              key={item.sign}
              sign={item.sign}
              averageRank={item.averageRank}
              rank={detailMode ? item.exactRank : item.roundedRank}
              trend={item.trend}
              rankDiff={item.rankDiff}
              isMine={item.sign === zodiacSign}
              isComparing={item.sign === compareId}
              detailMode={detailMode}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rankingCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  rankingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
  },
  rankingPeriodLabel: {
    fontSize: 11,
    lineHeight: 15,
    includeFontPadding: false,
    color: colors.textSoft,
  },
  rankingCaption: {
    fontSize: 10.5,
    lineHeight: 14,
    includeFontPadding: false,
    color: colors.textSoft,
    marginBottom: 8,
  },
  rankingList: {
    gap: 2,
  },
  rankingEmptyText: {
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: false,
    color: colors.textMid,
    textAlign: "center",
    paddingVertical: 20,
  },
});
