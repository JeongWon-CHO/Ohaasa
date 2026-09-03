import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

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
import { ZodiacSelectBottomSheet } from "@/src/components/stats/ZodiacSelectBottomSheet";
import { colors, shadows } from "@/src/constants/design";
import { gradients } from "@/src/constants/design";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import type { ZodiacSign } from "@/src/constants/zodiac";
import { useHoroscopeTrends, type TrendsPeriod } from "@/src/hooks/useHoroscopeTrends";
import { useShareHoroscope } from "@/src/hooks/useShareHoroscope";
import { useToast } from "@/src/hooks/useToast";
import { useZodiac } from "@/src/hooks/useZodiac";

type StatsTab = "trend" | "history";

const TAB_OPTIONS: { value: StatsTab; label: string }[] = [
  { value: "trend", label: "흐름" },
  { value: "history", label: "기록" },
];

export default function StatsScreen() {
  // 탭이 아니라 push된 화면이라 탭바가 없다. useBottomTabBarHeight는 탭 밖에서 throw한다.
  const tabBarHeight = 0;
  const { zodiacSign } = useZodiac();
  const [activeTab, setActiveTab] = useState<StatsTab>("trend");
  const [period, setPeriod] = useState<TrendsPeriod>("7d");
  const [detailMode, setDetailMode] = useState(false);
  const [compareId, setCompareId] = useState<ZodiacSign | null>(null);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);
  const { points, comparePoints, averageRank, minRank, maxRank, signAverages, loading, error, refetch } =
    useHoroscopeTrends(zodiacSign, period, compareId);

  useEffect(() => {
    setCompareId(null);
  }, [zodiacSign]);

  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  });

  const { showToast, toastProps } = useToast();
  const { cardRef, share, sharing, saveImage, saving, mediaDeniedSheetVisible, closeMediaDeniedSheet } =
    useShareHoroscope({ showToast });

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
                  {(["7d", "30d"] as TrendsPeriod[]).map((p) => (
                    <Pressable key={p} onPress={() => setPeriod(p)} style={styles.periodBtn}>
                      <Text style={[styles.periodLabel, period === p && styles.periodLabelActive]}>
                        {p === "7d" ? "7일" : "30일"}
                      </Text>
                      {period === p && <View style={styles.periodDot} />}
                    </Pressable>
                  ))}
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
              contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
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
          <ReviewHistoryTab bottomInset={tabBarHeight} />
        )}
      </ResponsiveContainer>

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
