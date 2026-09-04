import { useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FinalHeader } from "@/src/components/final/FinalHeader";
import { ResponsiveContainer } from "@/src/components/common/ResponsiveContainer";
import { MediaDeniedSheet } from "@/src/components/MediaDeniedSheet";
import { Toast } from "@/src/components/common/Toast";
import { StatsShareCard } from "@/src/components/share/StatsShareCard";
import { ChartCard } from "@/src/components/stats/ChartCard";
import { ErrorState } from "@/src/components/stats/ErrorState";
import { RankingCard } from "@/src/components/stats/RankingCard";
import { ReviewHistoryTab } from "@/src/components/stats/ReviewHistoryTab";
import { StatsLoadingState } from "@/src/components/stats/StatsLoadingState";
import { SummaryCard } from "@/src/components/stats/SummaryCard";
import { MonthSelectSheet } from "@/src/components/stats/MonthSelectSheet";
import { ZodiacSelectBottomSheet } from "@/src/components/stats/ZodiacSelectBottomSheet";
import { colors, shadows , gradients } from "@/src/constants/design";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import type { ZodiacSign } from "@/src/constants/zodiac";
import {
  getPeriodMonth,
  monthPeriod,
  useHoroscopeTrends,
  type MonthKey,
  type TrendsPeriod,
} from "@/src/hooks/useHoroscopeTrends";
import { useShareHoroscope } from "@/src/hooks/useShareHoroscope";
import { useToast } from "@/src/hooks/useToast";
import { useZodiac } from "@/src/hooks/useZodiac";

type StatsTab = "trend" | "history";

const TAB_OPTIONS: { value: StatsTab; label: string }[] = [
  { value: "trend", label: "흐름" },
  { value: "history", label: "기록" },
];

const DAY_PERIODS: { value: TrendsPeriod; label: string }[] = [
  { value: "7d", label: "7일" },
  { value: "14d", label: "14일" },
];

// 헤더는 자리가 좁아 "8월"만 쓰지만, 해가 넘어간 달은 연도까지 붙여야 구분된다.
function formatMonthToggleLabel(month: MonthKey): string {
  const [year, monthNum] = month.split("-").map(Number);
  return year === new Date().getFullYear() ? `${monthNum}월` : `${year}.${monthNum}`;
}

export default function StatsScreen() {
  // 탭이 아니라 push된 화면이라 탭바가 없다(useBottomTabBarHeight는 탭 밖에서 throw한다).
  // 바닥 안전영역을 대신 먹어줄 게 없으므로 화면이 직접 인셋을 더한다.
  const insets = useSafeAreaInsets();
  const { zodiacSign } = useZodiac();
  const [activeTab, setActiveTab] = useState<StatsTab>("trend");
  const [period, setPeriod] = useState<TrendsPeriod>("7d");
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  // 월간을 벗어나도 마지막으로 고른 달을 기억해, 시트를 다시 열면 그 달이 체크돼 있게 한다.
  const [lastMonth, setLastMonth] = useState<MonthKey | null>(null);
  const [detailMode, setDetailMode] = useState(false);
  const [compareId, setCompareId] = useState<ZodiacSign | null>(null);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);
  const { points, comparePoints, averageRank, minRank, maxRank, signAverages, loading, error, refetch } =
    useHoroscopeTrends(zodiacSign, period, compareId);

  // 내 별자리가 바뀌면 비교 대상을 푼다. 렌더 중에 조정하면 낡은 compareId로
  // 조회가 한 번 도는 일이 없다.
  const [lastZodiacSign, setLastZodiacSign] = useState(zodiacSign);
  if (lastZodiacSign !== zodiacSign) {
    setLastZodiacSign(zodiacSign);
    setCompareId(null);
  }

  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  });

  const { showToast, toastProps } = useToast();
  const { cardRef, share, sharing, saveImage, saving, mediaDeniedSheetVisible, closeMediaDeniedSheet } =
    useShareHoroscope({ showToast });

  const activeMonth = getPeriodMonth(period);

  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const compareSign = compareId ? ZODIAC_MAP[compareId] : null;
  const canShare = !!zodiac && points.length >= 7 && averageRank !== null;

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <ResponsiveContainer>
        <View style={styles.headerSpacer}>
          <FinalHeader
            onBackPress={() => router.back()}
            title={activeTab === "trend" ? "Trends" : "History"}
            subtitle={activeTab === "trend" ? "운세 흐름" : "운세 기록"}
            rightSlot={
              activeTab === "trend" ? (
                <View style={styles.periodToggle}>
                  {DAY_PERIODS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setPeriod(option.value)}
                      style={styles.periodBtn}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.periodLabel,
                          period === option.value && styles.periodLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {period === option.value && <View style={styles.periodDot} />}
                    </Pressable>
                  ))}
                  {/* 월간은 기간 선택이 아니라 "어느 달?"을 물어야 해서 누르면 바로 시트를 연다 */}
                  <Pressable onPress={() => setMonthSheetOpen(true)} style={styles.periodBtn}>
                    <Text
                      numberOfLines={1}
                      style={[styles.periodLabel, activeMonth !== null && styles.periodLabelActive]}
                    >
                      {activeMonth ? formatMonthToggleLabel(activeMonth) : "월간"}
                    </Text>
                    {activeMonth !== null && <View style={styles.periodDot} />}
                  </Pressable>
                </View>
              ) : undefined
            }
          />
        </View>

        {/* 흐름 / 기록 세그먼트 컨트롤 */}
        <View style={styles.segmentWrap}>
          <View style={styles.segmentTrack}>
            {TAB_OPTIONS.map((opt) => {
              const active = opt.value === activeTab;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setActiveTab(opt.value)}
                  style={[styles.segment, active && styles.segmentActive]}
                >
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeTab === "trend" ? (
          loading ? (
            <StatsLoadingState />
          ) : error ? (
            <ErrorState zodiacSign={zodiacSign} onRetry={refetch} />
          ) : (
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 48 }]}
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
            >
              <View style={styles.contentBlock}>
                <SummaryCard
                  zodiac={zodiac}
                  period={period}
                  averageRank={averageRank}
                  minRank={minRank}
                  maxRank={maxRank}
                  detailMode={detailMode}
                  onToggleDetailMode={() => setDetailMode((v) => !v)}
                />

                <ChartCard
                  zodiac={zodiac}
                  compareSign={compareSign}
                  points={points}
                  comparePoints={comparePoints}
                  canShare={canShare}
                  saving={saving}
                  sharing={sharing}
                  onSave={saveImage}
                  onShare={share}
                  onOpenCompareSheet={() => setCompareSheetOpen(true)}
                  onRemoveCompare={() => setCompareId(null)}
                />

                <RankingCard
                  period={period}
                  signAverages={signAverages}
                  detailMode={detailMode}
                  zodiacSign={zodiacSign}
                  compareId={compareId}
                />
              </View>
            </ScrollView>
          )
        ) : (
          <ReviewHistoryTab bottomInset={insets.bottom} />
        )}
      </ResponsiveContainer>

      <MonthSelectSheet
        visible={monthSheetOpen}
        selectedMonth={activeMonth ?? lastMonth}
        onClose={() => setMonthSheetOpen(false)}
        onSelect={(month) => {
          setLastMonth(month);
          setPeriod(monthPeriod(month));
        }}
      />

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

      {canShare && zodiac && (
        <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
          <StatsShareCard ref={cardRef} zodiac={zodiac} period={period} points={points} averageRank={averageRank!} />
        </View>
      )}

      <MediaDeniedSheet
        visible={mediaDeniedSheetVisible}
        onClose={closeMediaDeniedSheet}
        onOpenSettings={() => {
          Linking.openSettings();
          closeMediaDeniedSheet();
        }}
      />
      <Toast {...toastProps} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  headerSpacer: {
    paddingBottom: 12,
  },
  segmentWrap: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  segmentTrack: {
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: colors.segmentTrack,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: colors.cardSolid,
    ...shadows.card,
  },
  segmentLabel: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.textMid,
  },
  segmentLabelActive: {
    fontFamily: "NotoSansKR_700Bold",
    color: colors.apricotDark,
  },
  scroll: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 24,
    gap: 12,
  },
  contentBlock: {
    gap: 20,
  },
  offscreen: {
    position: "absolute",
    left: -9999,
    top: 0,
  },
  periodToggle: {
    flexDirection: "row",
    gap: 4,
  },
  periodBtn: {
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  periodLabel: {
    fontSize: 12,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    lineHeight: 18,
    includeFontPadding: false,
  },
  periodLabelActive: {
    fontFamily: "NotoSansKR_600SemiBold",
    color: colors.apricotDark,
  },
  periodDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.apricotDark,
  },
});
