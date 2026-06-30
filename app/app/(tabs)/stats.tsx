import { useEffect, useRef, useState } from "react";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { FinalHeader } from "@/src/components/final/FinalHeader";
import { MediaDeniedSheet } from "@/src/components/MediaDeniedSheet";
import { Toast } from "@/src/components/common/Toast";
import { StatsShareCard } from "@/src/components/share/StatsShareCard";
import { ChartCard } from "@/src/components/stats/ChartCard";
import { ErrorState } from "@/src/components/stats/ErrorState";
import { PeriodSelector } from "@/src/components/stats/PeriodSelector";
import { RankingCard } from "@/src/components/stats/RankingCard";
import { StatsLoadingState } from "@/src/components/stats/StatsLoadingState";
import { SummaryCard } from "@/src/components/stats/SummaryCard";
import { ZodiacSelectBottomSheet } from "@/src/components/stats/ZodiacSelectBottomSheet";
import { gradients } from "@/src/constants/design";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import type { ZodiacSign } from "@/src/constants/zodiac";
import { useHoroscopeTrends, type TrendsPeriod } from "@/src/hooks/useHoroscopeTrends";
import { useShareHoroscope } from "@/src/hooks/useShareHoroscope";
import { useToast } from "@/src/hooks/useToast";
import { useZodiac } from "@/src/hooks/useZodiac";

export default function StatsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { zodiacSign } = useZodiac();
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
      <View style={styles.headerSpacer}>
        <FinalHeader subtitle="운세 흐름" />
      </View>

      {loading ? (
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
          {/* 기간 선택 */}
          <PeriodSelector value={period} onChange={setPeriod} />

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
    paddingBottom: 18,
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
});
