import { useCallback, useEffect, useRef, useState } from "react";
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
import Svg, {
  Circle,
  Defs,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from "react-native-svg";

import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { DatePill } from "@/src/components/final/DatePill";
import { FinalHeader } from "@/src/components/final/FinalHeader";
import { GogoInfoGrid } from "@/src/components/final/GogoInfoGrid";
import { HoroscopeCard } from "@/src/components/HoroscopeCard";
import { HoroscopeDateSheet } from "@/src/components/HoroscopeDateSheet";
import { MediaDeniedSheet } from "@/src/components/MediaDeniedSheet";
import { PushPermissionSheet } from "@/src/components/PushPermissionSheet";
import { ShareCard } from "@/src/components/share/ShareCard";
import { Toast } from "@/src/components/common/Toast";
import { useHoroscopeDateContext } from "@/src/context/HoroscopeDateContext";
import { requestPushToken } from "@/src/lib/notifications";
import {
  getHasAskedPushPermission,
  setHasAskedPushPermission,
  getPushToken,
  setPushToken,
  setPlatform,
  setNotificationsEnabled,
  getOrCreateDeviceId,
} from "@/src/lib/storage";
import { upsertDevice } from "@/src/lib/supabase";
import { colors, gradients } from "@/src/constants/design";
import { ZODIAC_MAP, type ZodiacSign } from "@/src/constants/zodiac";
import { useAllHoroscopes } from "@/src/hooks/useHoroscope";
import { useScreenSize } from "@/src/hooks/useScreenSize";
import { useShareHoroscope } from "@/src/hooks/useShareHoroscope";
import { useToast } from "@/src/hooks/useToast";
import { useZodiac } from "@/src/hooks/useZodiac";

const SCREEN_CONFIG = {
  android: {
    circleSize: 100,
    badgeSize: 76,
    glowSize: 128,
    glowCenter: 64,
    dashRadius: 56,
    heroMarginTop: 24,
    zodiacFontSize: 20,
    cardMarginTop: 24,
  },
  ios: {
    circleSize: 136,
    badgeSize: 106,
    glowSize: 168,
    glowCenter: 84,
    dashRadius: 76,
    heroMarginTop: 28,
    zodiacFontSize: 20,
    cardMarginTop: 22,
  },
} as const;

const COPY = {
  headerToday: "오늘도 좋은 하루 되세요 ☀️",
  headerPast: "그날의 운세를 다시 보고 있어요 ✨",
  noZodiac: "별자리를 선택해주세요.",
  noData: "방송 데이터가 없습니다.",
  noDateData: "해당 날짜에 저장된 운세가 없어요.\n다른 날짜를 선택해 주세요.",
};

const EN_NAMES: Record<ZodiacSign, string> = {
  aries: "Aries",
  taurus: "Taurus",
  gemini: "Gemini",
  cancer: "Cancer",
  leo: "Leo",
  virgo: "Virgo",
  libra: "Libra",
  scorpio: "Scorpio",
  sagittarius: "Sagittarius",
  capricorn: "Capricorn",
  aquarius: "Aquarius",
  pisces: "Pisces",
};

// ─── Background decoration helpers ───────────────────────────

type DecoProps = {
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
};

function CircleDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
      }}
    />
  );
}

function StarDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y, opacity }}
    >
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Polygon
          points="5,0 6.2,3.8 10,3.8 7,6.2 8.2,10 5,7.8 1.8,10 3,6.2 0,3.8 3.8,3.8"
          fill={color}
        />
      </Svg>
    </View>
  );
}

function MoonDeco({ x, y, size, color, opacity }: DecoProps) {
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: x, top: y, opacity }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          fill={color}
        />
      </Svg>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────

export default function TodayScreen() {
  const screenSize = useScreenSize();
  const cfg = SCREEN_CONFIG[screenSize];
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

  const [pushSheetVisible, setPushSheetVisible] = useState(false);
  const [dateSheetVisible, setDateSheetVisible] = useState(false);
  const hasCheckedPermission = useRef(false);

  useEffect(() => {
    if (loading || !zodiacSign || hasCheckedPermission.current) return;
    hasCheckedPermission.current = true;

    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      const [asked, existingToken] = await Promise.all([
        getHasAskedPushPermission(),
        getPushToken(),
      ]);

      if (asked) return;

      if (existingToken) {
        await setHasAskedPushPermission();
        return;
      }

      timer = setTimeout(() => setPushSheetVisible(true), 1000);
    })();

    return () => clearTimeout(timer);
  }, [loading, zodiacSign]);

  async function handlePushAccept() {
    setPushSheetVisible(false);
    await setHasAskedPushPermission();

    const { token, platform } = await requestPushToken();
    await setPushToken(token);
    await setPlatform(platform);
    const notificationsEnabled = token !== null;
    await setNotificationsEnabled(notificationsEnabled);

    if (zodiacSign) {
      const deviceId = await getOrCreateDeviceId();
      await upsertDevice({
        deviceId,
        zodiacSign,
        pushToken: token,
        platform,
        notificationsEnabled,
      });
    }
  }

  async function handlePushDecline() {
    setPushSheetVisible(false);
    await setHasAskedPushPermission();
  }

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
            {/* Hero */}
            <View style={[styles.hero, { marginTop: cfg.heroMarginTop }]}>
              <LinearGradient
                colors={[colors.yellow, colors.apricot]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rankPill}
              >
                <Text style={styles.rankPillText}>{rankPillText}</Text>
              </LinearGradient>

              <View
                style={[
                  styles.circleOuter,
                  { width: cfg.circleSize, height: cfg.circleSize },
                ]}
              >
                <Svg
                  width={cfg.glowSize}
                  height={cfg.glowSize}
                  style={{ position: "absolute", top: -16, left: -16 }}
                >
                  <Defs>
                    <RadialGradient
                      id="todayCircleGlowGradient"
                      cx="50%"
                      cy="50%"
                      r="50%"
                    >
                      <Stop
                        offset="0%"
                        stopColor="#F0B89A"
                        stopOpacity={0.58}
                      />
                      <Stop
                        offset="45%"
                        stopColor="#F5D98B"
                        stopOpacity={0.3}
                      />
                      <Stop
                        offset="80%"
                        stopColor="#FAF6F0"
                        stopOpacity={0.12}
                      />
                      <Stop offset="100%" stopColor="#FAF6F0" stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Circle
                    cx={cfg.glowCenter}
                    cy={cfg.glowCenter}
                    r={cfg.glowCenter}
                    fill="url(#todayCircleGlowGradient)"
                  />
                </Svg>
                <View
                  style={[styles.circleDash, { borderRadius: cfg.dashRadius }]}
                />
                <View style={styles.circleBadge}>
                  <ConstellationBadge sign={zodiac.sign} size={cfg.badgeSize} />
                </View>
              </View>

              <View style={styles.zodiacText}>
                <Text
                  style={[styles.zodiacName, { fontSize: cfg.zodiacFontSize }]}
                >
                  {zodiac.ko}
                </Text>
                <Text style={styles.zodiacSub}>
                  {EN_NAMES[zodiac.sign]} · {zodiac.dateRange}
                </Text>
              </View>
            </View>

            {/* Fortune card */}
            <HoroscopeCard
              advice={horoscope.advice_ko ?? horoscope.advice}
              style={[styles.fortuneCard, { marginTop: cfg.cardMarginTop }]}
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

  hero: {
    alignItems: "center",
  },
  rankPill: {
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 18,
    marginBottom: 18,
    shadowColor: colors.apricot,
    shadowOpacity: 0.5,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },
  rankPillText: {
    fontSize: 11,
    lineHeight: 14,
    paddingVertical: 1,
    fontFamily: "NotoSansKR_600SemiBold",
    color: "#FFFDF9",
  },
  circleOuter: {
    marginVertical: 10,
  },
  circleDash: {
    position: "absolute",
    top: -8,
    bottom: -8,
    left: -8,
    right: -8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(217,138,104,0.32)",
  },
  circleBadge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  zodiacText: {
    alignItems: "center",
    marginTop: 10,
  },
  zodiacName: {
    fontFamily: "NotoSansKR_400Regular",
    lineHeight: 28,
    color: colors.text,
  },
  zodiacSub: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSoft,
    marginTop: 4,
  },

  fortuneCard: {
    marginHorizontal: 24,
  },

  infoGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginHorizontal: 24,
  },
  gridCard: {
    flex: 1,
    padding: 16,
  },
  gridHeader: {
    fontSize: 9,
    color: colors.textSoft,
    letterSpacing: 1.08,
    marginBottom: 12,
  },
  luckyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 11,
    color: colors.textSoft,
  },
  starLabel: {
    width: 26,
  },
  rowValue: {
    fontSize: 12,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
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
