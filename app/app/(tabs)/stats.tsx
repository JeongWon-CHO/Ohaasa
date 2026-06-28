import { useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { AverageRankRow } from "@/src/components/final/AverageRankRow";
import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { PeriodSelector } from "@/src/components/stats/PeriodSelector";
import { RankTrendChart } from "@/src/components/stats/RankTrendChart";
import { StatisticsHeader } from "@/src/components/stats/StatisticsHeader";
import { colors, gradients } from "@/src/constants/design";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import { getSummaryComment, useHoroscopeTrends, type TrendsPeriod } from "@/src/hooks/useHoroscopeTrends";
import { useZodiac } from "@/src/hooks/useZodiac";

const PERIOD_DAYS: Record<TrendsPeriod, number> = { "7d": 7, "30d": 30 };

export default function StatsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { zodiacSign } = useZodiac();
  const [period, setPeriod] = useState<TrendsPeriod>("7d");
  const { points, averageRank, minRank, maxRank, signAverages, loading, error, refetch } =
    useHoroscopeTrends(zodiacSign, period);

  const [chartWidth, setChartWidth] = useState(0);
  const onChartLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const periodDays = PERIOD_DAYS[period];

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <StatisticsHeader />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.apricotDark} size="large" />
          <Text style={styles.loadingText}>운세 흐름을 불러오는 중이에요…</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.errorTitle}>운세 흐름을 불러오지 못했어요</Text>
          <Text style={styles.errorSubtitle}>잠시 후 다시 시도해 주세요</Text>
          <Pressable style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {/* 기간 선택 */}
          <PeriodSelector value={period} onChange={setPeriod} />

          {/* 내 별자리 요약 (오픈 레이아웃) */}
          <View style={styles.summary}>
            {zodiac ? (
              <>
                <View style={styles.summaryTopRow}>
                  <ConstellationBadge sign={zodiacSign ?? undefined} size={44} />
                  <View style={styles.summaryNameBlock}>
                    <View style={styles.summaryNameRow}>
                      <Text style={styles.zodiacName}>{zodiac.ko}</Text>
                      <View style={styles.mineBadge}>
                        <Text style={styles.mineBadgeText}>내 별자리</Text>
                      </View>
                    </View>
                    <Text style={styles.summarySubtitle}>최근 {periodDays}일 운세 흐름</Text>
                  </View>
                  <View style={styles.averageBlock}>
                    <Text style={styles.averageLabel}>평균</Text>
                    <View style={styles.averageValueRow}>
                      <Text style={styles.averageValue}>{averageRank?.toFixed(1) ?? "–"}</Text>
                      <Text style={styles.averageUnit}>위</Text>
                    </View>
                  </View>
                </View>
                {minRank !== null && maxRank !== null && (
                  <Text style={styles.bestWorst}>
                    최고 {minRank}위 · 최저 {maxRank}위
                  </Text>
                )}
                <Text style={styles.comment}>"{getSummaryComment(averageRank)}"</Text>
              </>
            ) : (
              <Text style={styles.noZodiacText}>별자리를 먼저 선택해주세요.</Text>
            )}
          </View>

          {/* 그래프 카드 */}
          <View style={styles.chartCard}>
            <View style={styles.chartTitleRow}>
              <Text style={styles.chartTitle}>순위 흐름</Text>
              <Pressable onPress={() => {}}>
                <Feather name="upload" size={16} color={colors.apricotDark} />
              </Pressable>
            </View>

            {zodiac && (
              <View style={styles.compareRow}>
                <View style={styles.compareChip}>
                  <View style={[styles.compareSwatch, { backgroundColor: colors.apricotDark }]} />
                  <Text style={styles.compareChipText}>{zodiac.ko}</Text>
                </View>
                <View style={styles.addCompareChip}>
                  <Text style={styles.addCompareChipText}>+ 다른 별자리와 비교</Text>
                </View>
              </View>
            )}

            <View style={styles.chartBody} onLayout={onChartLayout}>
              {points.length === 0 ? (
                <View style={styles.chartPlaceholder}>
                  <Text style={styles.placeholderText}>데이터가 아직 없어요</Text>
                </View>
              ) : points.length < 7 ? (
                <View style={styles.chartPlaceholder}>
                  <Text style={styles.placeholderTitle}>아직 흐름을 보여드리기엔 일러요</Text>
                  <Text style={styles.placeholderText}>며칠만 더 운세를 모으면 예쁜 흐름을 보여드릴게요</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${(points.length / 7) * 100}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>{points.length}일째 기록 중 · 7일부터 그래프 등장 ✦</Text>
                </View>
              ) : (
                chartWidth > 0 && <RankTrendChart points={points} width={chartWidth} />
              )}
            </View>

            {points.length >= 1 && (
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>🌤️ 순위가 위로 올라갈수록 좋은 흐름이에요</Text>
              </View>
            )}
          </View>

          {/* 별자리별 평균 순위 */}
          <View style={styles.rankingCard}>
            <View style={styles.rankingTitleRow}>
              <Text style={styles.sectionTitle}>별자리별 평균 순위</Text>
              <Text style={styles.rankingPeriodLabel}>최근 {periodDays}일</Text>
            </View>
            <View style={styles.rankingList}>
              {signAverages.map((item, index) => (
                <AverageRankRow
                  key={item.sign}
                  sign={item.sign}
                  averageRank={item.averageRank}
                  rank={index + 1}
                  trend={item.trend}
                  isMine={item.sign === zodiacSign}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSoft,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 6,
  },
  errorTitle: {
    fontSize: 15,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.textSoft,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: colors.text,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.cardSolid,
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 20,
  },
  summary: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    marginTop: 2,
  },
  averageBlock: {
    alignItems: "flex-end",
  },
  averageLabel: {
    fontSize: 11,
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
    fontFamily: "NotoSansKR_700Bold",
    color: colors.apricotDark,
  },
  averageUnit: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMid,
    marginBottom: 4,
  },
  bestWorst: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    marginTop: 12,
  },
  comment: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "NotoSansKR_300Light",
    color: colors.text,
    marginTop: 6,
  },
  noZodiacText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
    textAlign: "center",
  },
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
  chartTitle: {
    fontSize: 14,
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
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
  },
  addCompareChip: {
    borderRadius: 14,
    backgroundColor: "rgba(184,216,232,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addCompareChipText: {
    fontSize: 11.5,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.skyDark,
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
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
    textAlign: "center",
  },
  placeholderText: {
    fontSize: 12,
    color: colors.textSoft,
    textAlign: "center",
    lineHeight: 18,
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
    color: colors.textSoft,
    marginTop: 2,
  },
  noteBox: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "rgba(245,217,139,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noteText: {
    fontSize: 12,
    color: colors.textMid,
  },
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
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
  },
  rankingPeriodLabel: {
    fontSize: 11,
    color: colors.textSoft,
  },
  rankingList: {
    gap: 2,
  },
});
