import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { CircleDeco, MoonDeco, StarDeco } from "@/src/components/final/ScreenDeco";
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
import { colors, gradients } from "@/src/constants/design";
import { ZODIAC_MAP } from "@/src/constants/zodiac";
import { useAllHoroscopes } from "@/src/hooks/useHoroscope";
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
  const { showToast, toastProps } = useToast();
  const { cardRef, share, sharing, saveImage, saving, mediaDeniedSheetVisible, closeMediaDeniedSheet } = useShareHoroscope({
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

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  const { pushSheetVisible, handlePushAccept, handlePushDecline } =
    usePushPermissionPrompt({ loading, zodiacSign });

  const [dateSheetVisible, setDateSheetVisible] = useState(false);

  const rankPillText = isLatest
    ? `오늘의 운세 ${horoscope?.rank}위`
    : `그날의 운세 ${horoscope?.rank}위`;

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      {/* Background decorations */}
      <CircleDeco x={-50} y={50} size={170} color={colors.sky} opacity={0.11} />
      <CircleDeco
        x={230}
        y={-30}
        size={160}
        color={colors.yellow}
        opacity={0.1}
      />
      <CircleDeco
        x={200}
        y={590}
        size={160}
        color={colors.apricot}
        opacity={0.1}
      />
      <StarDeco x={46} y={128} size={5} color={colors.yellow} opacity={0.26} />
      <StarDeco
        x={294}
        y={108}
        size={4}
        color={colors.apricot}
        opacity={0.22}
      />
      <StarDeco x={28} y={440} size={3} color={colors.yellow} opacity={0.18} />
      <MoonDeco
        x={286}
        y={174}
        size={22}
        color={colors.apricot}
        opacity={0.18}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        style={styles.scroll}
      >
        {/* Header */}
        <FinalHeader
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
        onOpenSettings={() => { Linking.openSettings(); closeMediaDeniedSheet(); }}
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
  fill: {
    flex: 1,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
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
