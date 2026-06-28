import { useEffect, useRef, useState } from "react";
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
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";

import { AverageRankRow } from "@/src/components/final/AverageRankRow";
import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { FinalHeader } from "@/src/components/final/FinalHeader";
import { FloatingBadge } from "@/src/components/stats/FloatingBadge";
import { PeriodSelector } from "@/src/components/stats/PeriodSelector";
import { RankTrendChart } from "@/src/components/stats/RankTrendChart";
import { StatsLoadingState } from "@/src/components/stats/StatsLoadingState";
import { ZodiacSelectBottomSheet } from "@/src/components/stats/ZodiacSelectBottomSheet";
import { colors, gradients } from "@/src/constants/design";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import type { ZodiacSign } from "@/src/constants/zodiac";
import { getSummaryComment, useHoroscopeTrends, type TrendsPeriod } from "@/src/hooks/useHoroscopeTrends";
import { useZodiac } from "@/src/hooks/useZodiac";

function periodLabel(period: TrendsPeriod): string {
  return period === "7d" ? "최근 7일" : "최근 30일";
}

export default function StatsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { zodiacSign } = useZodiac();
  const [period, setPeriod] = useState<TrendsPeriod>("7d");
  const [compareId, setCompareId] = useState<ZodiacSign | null>(null);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);
  const { points, comparePoints, averageRank, minRank, maxRank, signAverages, loading, error, refetch } =
    useHoroscopeTrends(zodiacSign, period, compareId);

  useEffect(() => {
    setCompareId(null);
  }, [zodiacSign]);

  const [chartWidth, setChartWidth] = useState(0);
  const onChartLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const chartCardRef = useRef<View>(null);
  const [sharingChart, setSharingChart] = useState(false);

  async function shareView(ref: React.RefObject<View | null>, setSharing: (v: boolean) => void) {
    if (!ref.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(ref, { format: "png", quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch (e) {
      console.warn("[stats share] failed", e);
    } finally {
      setSharing(false);
    }
  }

  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const compareSign = compareId ? ZODIAC_MAP[compareId] : null;

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <View style={styles.headerSpacer}>
        <FinalHeader subtitle="운세 흐름" />
      </View>

      {loading ? (
        <StatsLoadingState />
      ) : error ? (
        <View style={styles.emptyWrap}>
          <View style={styles.errorIllustration}>
            <ConstellationBadge sign={zodiacSign ?? undefined} size={64} />
            <View style={styles.errorCloud}>
              <Feather name="cloud" size={20} color={colors.textSoft} />
            </View>
          </View>
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
                    <Text style={styles.summarySubtitle}>{periodLabel(period)} 운세 흐름</Text>
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
                <View style={styles.commentBox}>
                  <Feather name="sun" size={14} color={colors.apricotDark} />
                  <Text style={styles.commentText}>{getSummaryComment(averageRank)}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.noZodiacText}>별자리를 먼저 선택해주세요.</Text>
            )}
          </View>

          {/* 그래프 카드 */}
          <View style={styles.chartCard} ref={chartCardRef} collapsable={false}>
            <View style={styles.chartTitleRow}>
              <Text style={styles.chartTitle}>순위 흐름</Text>
              <Pressable onPress={() => shareView(chartCardRef, setSharingChart)} disabled={sharingChart}>
                {sharingChart ? (
                  <ActivityIndicator size="small" color={colors.apricotDark} />
                ) : (
                  <Feather name="upload" size={16} color={colors.apricotDark} />
                )}
              </Pressable>
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
                      <Pressable onPress={() => setCompareId(null)} hitSlop={8}>
                        <Feather name="x" size={12} color={colors.skyDark} />
                      </Pressable>
                    </View>
                    <Pressable style={styles.changeCompareChip} onPress={() => setCompareSheetOpen(true)}>
                      <Text style={styles.changeCompareChipText}>변경</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable style={styles.addCompareChip} onPress={() => setCompareSheetOpen(true)}>
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
                  <FloatingBadge sign={zodiacSign ?? undefined} size={56} />
                  <Text style={styles.placeholderTitle}>아직 흐름을 보여드리기엔 일러요</Text>
                  <Text style={styles.placeholderText}>며칠만 더 운세를 모으면 예쁜 흐름을 보여드릴게요</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${(points.length / 7) * 100}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>{points.length}일째 기록 중 · 7일부터 그래프 등장 ✦</Text>
                </View>
              ) : (
                chartWidth > 0 && (
                  <RankTrendChart points={points} comparePoints={comparePoints} width={chartWidth} />
                )
              )}
            </View>
          </View>

          {/* 별자리별 평균 순위 */}
          <View style={styles.rankingCard}>
            <View style={styles.rankingTitleRow}>
              <Text style={styles.sectionTitle}>별자리별 평균 순위</Text>
              <Text style={styles.rankingPeriodLabel}>{periodLabel(period)}</Text>
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
                  isComparing={item.sign === compareId}
                  onPress={(sign) => setCompareId((current) => (current === sign ? null : sign))}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <ZodiacSelectBottomSheet
        visible={compareSheetOpen}
        mySign={zodiacSign}
        selectedId={compareId}
        onClose={() => setCompareSheetOpen(false)}
        onSelect={(sign) => {
          setCompareId(sign);
          setCompareSheetOpen(false);
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  headerSpacer: {
    paddingBottom: 18,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 6,
  },
  errorIllustration: {
    marginBottom: 8,
    opacity: 0.55,
  },
  errorCloud: {
    position: "absolute",
    right: -8,
    bottom: -4,
    borderRadius: 12,
    backgroundColor: colors.cardSolid,
    padding: 4,
  },
  errorTitle: {
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
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
    lineHeight: 18,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.cardSolid,
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 24,
    gap: 20,
  },
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
  bestWorst: {
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    marginTop: 12,
  },
  commentBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
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
  rankingList: {
    gap: 2,
  },
});
