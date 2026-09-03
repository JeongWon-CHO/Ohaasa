import { useCallback, useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { TodayQuestionSection } from "@/src/components/daily-question/TodayQuestionSection";
import { DailyReviewEntryCard } from "@/src/components/daily-review/DailyReviewEntryCard";
import { useDailyQuestion } from "@/src/hooks/useDailyQuestion";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StarfieldDeco } from "@/src/components/final/ScreenDeco";
import { DatePill } from "@/src/components/final/DatePill";
import { FinalHeader } from "@/src/components/final/FinalHeader";
import { GogoInfoGrid } from "@/src/components/final/GogoInfoGrid";
import { ZodiacHeroCircle } from "@/src/components/final/ZodiacHeroCircle";
import { HoroscopeCard } from "@/src/components/HoroscopeCard";
import { HoroscopeDateSheet } from "@/src/components/HoroscopeDateSheet";
import { MediaDeniedSheet } from "@/src/components/MediaDeniedSheet";
import { PushPermissionSheet } from "@/src/components/PushPermissionSheet";
import { ShareCard } from "@/src/components/share/ShareCard";
import { Toast } from "@/src/components/common/Toast";
import { useHoroscopeDateContext } from "@/src/context/HoroscopeDateContext";
import {
  colors,
  gradients,
  layout,
  radius,
  spacing,
} from "@/src/constants/design";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import { useAllHoroscopes } from "@/src/hooks/useHoroscope";
import { getDailyReview, type DailyReview } from "@/src/lib/dailyReviews";
import { usePushPermissionPrompt } from "@/src/hooks/usePushPermissionPrompt";
import { useShareHoroscope } from "@/src/hooks/useShareHoroscope";
import { useToast } from "@/src/hooks/useToast";
import { useZodiac } from "@/src/hooks/useZodiac";

const COPY = {
  headerToday: "오늘도 좋은 하루 되세요 ☀️",
  headerPast: "그날의 운세를 다시 보고 있어요 ✨",
  noZodiac: "별자리를 선택해주세요.",
  noData: "방송 데이터가 없습니다.",
  noDateData: "해당 날짜에 저장된 운세가 없어요.\n다른 날짜를 선택해 주세요.",
};

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { showToast, toastProps } = useToast();
  const {
    cardRef,
    share,
    sharing,
    saveImage,
    saving,
    mediaDeniedSheetVisible,
    closeMediaDeniedSheet,
  } = useShareHoroscope({
    showToast,
  });

  const { selectedDate, isLatest, setSelectedDate } = useHoroscopeDateContext();

  const {
    zodiacSign,
    loading: zodiacLoading,
    error: zodiacError,
  } = useZodiac();
  const {
    horoscopes,
    broadcastDate,
    loading: horoscopeLoading,
    error: horoscopeError,
  } = useAllHoroscopes({ date: selectedDate });

  const loading = zodiacLoading || horoscopeLoading;
  const error = zodiacError ?? horoscopeError;
  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const horoscope = zodiacSign
    ? (horoscopes.find((h) => h.zodiac_sign === zodiacSign) ?? null)
    : null;

  // 빈 상태 문구: 별자리 없음 / 특정 날짜에 데이터 없음 / 최신 데이터 없음
  const emptyText =
    zodiacSign === null
      ? COPY.noZodiac
      : selectedDate !== null && horoscopes.length === 0
        ? COPY.noDateData
        : COPY.noData;

  const scrollRef = useRef<ScrollView>(null);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const [currentReview, setCurrentReview] = useState<DailyReview | null>(null);

  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (!horoscope?.date || !zodiacSign) {
        setCurrentReview(null);
        return;
      }
      getDailyReview(horoscope.date, zodiacSign).then(setCurrentReview);
    }, [horoscope?.date, zodiacSign]),
  );

  const { pushSheetVisible, handlePushAccept, handlePushDecline } =
    usePushPermissionPrompt({ loading, zodiacSign });

  const { hasAnswered } = useDailyQuestion(horoscope?.date ?? null);

  const rankPillText = isLatest
    ? `오늘의 운세 ${horoscope?.rank}위`
    : `그날의 운세 ${horoscope?.rank}위`;

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      {/* Background decorations — 홈도 같은 세트를 쓴다 */}
      <StarfieldDeco />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={styles.scroll}
      >
        {/* Header */}
        <FinalHeader
          onBackPress={() => router.back()}
          title="ohaasa"
          subtitle={isLatest ? COPY.headerToday : COPY.headerPast}
          onSharePress={horoscope ? share : undefined}
          sharing={sharing}
          onSavePress={horoscope ? saveImage : undefined}
          saving={saving}
        />

        {/* DatePill */}
        <View style={styles.pillWrap}>
          <DatePill
            dateText={broadcastDate ?? ""}
            onPress={() => setDateSheetVisible(true)}
          />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.apricotDark} size="large" />
          </View>
        ) : error ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : zodiac && horoscope ? (
          <>
            <ZodiacHeroCircle zodiac={zodiac} rankPillText={rankPillText} />

            {/* Fortune card */}
            <HoroscopeCard
              advice={horoscope.advice_ko ?? horoscope.advice}
              style={styles.fortuneCard}
            />

            <GogoInfoGrid horoscope={horoscope} style={styles.infoGrid} />

            <TodayQuestionSection
              hasAnswered={hasAnswered}
              onPress={() => {
                if (!horoscope?.date) return;
                // 최신 방송일이면 커뮤니티 탭으로 보낸다. 과거 날짜를 골라 본 상태에서는
                // 그 날짜의 질문을 열어야 하므로 파라미터 진입(스택 라우트)을 유지한다.
                if (isLatest) router.push("/(tabs)/community");
                else
                  router.push({
                    pathname: "/daily-question",
                    params: { date: horoscope.date },
                  });
              }}
              style={styles.cardSection}
            />

            <DailyReviewEntryCard
              hasReview={currentReview !== null}
              rating={currentReview?.rating}
              onPress={() => router.push("/daily-review")}
              style={styles.reviewEntryCard}
            />

            {/* 순위·통계는 탭에서 빠져 이 화면 안에서만 들어간다 */}
            <View style={styles.moreGrid}>
              <Pressable
                onPress={() => router.push("/rankings")}
                style={({ pressed }) => [
                  styles.moreTile,
                  pressed && styles.moreTilePressed,
                ]}
              >
                <View style={styles.moreIconWrap}>
                  <Feather name="award" size={18} color={colors.apricotDark} />
                </View>
                <Text style={styles.moreTileTitle}>전체 순위</Text>
                <Text style={styles.moreTileSubtitle}>
                  12개의 별자리를 한눈에
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/stats")}
                style={({ pressed }) => [
                  styles.moreTile,
                  pressed && styles.moreTilePressed,
                ]}
              >
                <View style={styles.moreIconWrap}>
                  <Feather
                    name="bar-chart-2"
                    size={18}
                    color={colors.apricotDark}
                  />
                </View>
                <Text style={styles.moreTileTitle}>운세 통계</Text>
                <Text style={styles.moreTileSubtitle}>
                  최근 운세 추이와 기록
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        )}
      </ScrollView>

      {/* 오프스크린 캡처용 ShareCard */}
      {zodiac && horoscope && (
        <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
          <ShareCard ref={cardRef} horoscope={horoscope} zodiac={zodiac} />
        </View>
      )}

      <Toast {...toastProps} />

      <PushPermissionSheet
        visible={pushSheetVisible}
        onAccept={handlePushAccept}
        onDecline={handlePushDecline}
      />

      <MediaDeniedSheet
        visible={mediaDeniedSheetVisible}
        onClose={closeMediaDeniedSheet}
        onOpenSettings={() => {
          Linking.openSettings();
          closeMediaDeniedSheet();
        }}
      />

      <HoroscopeDateSheet
        visible={dateSheetVisible}
        onClose={() => setDateSheetVisible(false)}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  // 카드 두 장을 나란히 둔다. 배경은 비우고 테두리만 남겨 위 카드들과 무게를 나눈다.
  moreGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    marginHorizontal: 24,
  },
  moreTile: {
    flex: 1,
    borderWidth: 1.5,
    // colors.border는 흰 카드 위에서만 보이는 값이라, 배경이 그대로 비치는
    // 이 타일에서는 거의 사라진다. 안쪽 아이콘 원과 같은 살구 톤을 쓴다.
    borderColor: "rgba(240,184,154,0.5)",
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  moreTilePressed: {
    opacity: 0.72,
  },
  moreIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(240,184,154,0.5)",
    backgroundColor: "rgba(240,184,154,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  moreTileTitle: {
    fontSize: 13,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.text,
    lineHeight: 19,
  },
  moreTileSubtitle: {
    fontSize: 11,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
    lineHeight: 17,
  },
  fill: {
    flex: 1,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  content: {},

  pillWrap: {
    marginTop: 12,
    marginHorizontal: 28,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
    marginTop: 28,
  },

  fortuneCard: {
    marginHorizontal: 24,
    marginTop: 24,
  },

  infoGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginHorizontal: 24,
  },
  cardSection: {
    marginBottom: 8,
  },
  reviewEntryCard: {
    marginBottom: 8,
  },

  emptyWrap: {
    marginTop: 40,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMid,
    textAlign: "center",
    lineHeight: 22,
  },
  errorText: {
    color: colors.apricotDark,
    fontSize: 13,
    textAlign: "center",
  },
  offscreen: {
    position: "absolute",
    left: -9999,
    top: 0,
  },
});
