import { useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";

import { AverageRankRow } from "@/src/components/final/AverageRankRow";
import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { FinalHeader } from "@/src/components/final/FinalHeader";
import { PeriodSelector } from "@/src/components/stats/PeriodSelector";
import { RankTrendChart } from "@/src/components/stats/RankTrendChart";
import { colors, gradients } from "@/src/constants/design";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import { getTrendSentence, useHoroscopeTrends, type TrendsPeriod } from "@/src/hooks/useHoroscopeTrends";
import { useZodiac } from "@/src/hooks/useZodiac";

export default function StatsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { zodiacSign } = useZodiac();
  const [period, setPeriod] = useState<TrendsPeriod>("7d");
  const { points, averageRank, minRank, maxRank, signAverages, loading, error } =
    useHoroscopeTrends(zodiacSign, period);

  const [chartWidth, setChartWidth] = useState(0);
  const onChartLayout = (e: LayoutChangeEvent) => {
    // chartCard의 padding(16*2)을 제외한 실제 그릴 수 있는 너비
    setChartWidth(e.nativeEvent.layout.width - 32);
  };

  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <FinalHeader subtitle="운세 흐름" />

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.apricotDark} size="large" />
        </View>
      ) : error ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          {/* 내 별자리 요약 카드 */}
          <View style={styles.card}>
            {zodiac ? (
              <>
                <View style={styles.cardHeader}>
                  <ConstellationBadge sign={zodiacSign ?? undefined} size={44} />
                  <View style={styles.cardHeaderCopy}>
                    <Text style={styles.zodiacName}>{zodiac.ko}</Text>
                    <Text style={styles.averageText}>
                      {averageRank !== null
                        ? `최근 ${points.length}일 평균 ${averageRank.toFixed(1)}위`
                        : "데이터가 쌓이는 중이에요"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.trendSentence}>{getTrendSentence(points)}</Text>
                {minRank !== null && maxRank !== null && (
                  <Text style={styles.bestWorst}>
                    최고 {minRank}위 · 최저 {maxRank}위
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.noZodiacText}>별자리를 먼저 선택해주세요.</Text>
            )}
          </View>

          {/* 그래프 */}
          <View style={styles.chartCard} onLayout={onChartLayout}>
            {points.length >= 2 && chartWidth > 0 ? (
              <RankTrendChart points={points} width={chartWidth} />
            ) : (
              <View style={styles.chartPlaceholder}>
                <Text style={styles.placeholderText}>데이터가 쌓이는 중이에요</Text>
              </View>
            )}
          </View>

          {/* 기간 선택 */}
          <PeriodSelector value={period} onChange={setPeriod} />

          {/* 전체 평균 순위 */}
          <View style={styles.rankingSection}>
            <Text style={styles.sectionTitle}>전체 평균 순위</Text>
            <View style={styles.rankingList}>
              {signAverages.map((item, index) => (
                <AverageRankRow
                  key={item.sign}
                  sign={item.sign}
                  averageRank={item.averageRank}
                  rank={index + 1}
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
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 13,
    color: colors.apricotDark,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 28,
    paddingTop: 16,
    gap: 20,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardHeaderCopy: {
    flex: 1,
  },
  zodiacName: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
  },
  averageText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
    marginTop: 2,
  },
  trendSentence: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
    marginTop: 12,
  },
  bestWorst: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    marginTop: 4,
  },
  noZodiacText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
    textAlign: "center",
  },
  chartCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
    minHeight: 192,
  },
  chartPlaceholder: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 13,
    color: colors.textSoft,
  },
  rankingSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
  },
  rankingList: {
    gap: 7,
  },
});
