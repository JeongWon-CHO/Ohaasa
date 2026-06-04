import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import { ShareCard } from "@/src/components/share/ShareCard";
import { Toast } from "@/src/components/common/Toast";
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
  headerSubtitle: "오늘도 좋은 하루 되세요 ☀️",
  noZodiac: "별자리를 선택해주세요.",
  noData: "방송 데이터가 없습니다.",
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
  const { cardRef, share, sharing, saveImage, saving } = useShareHoroscope({
    showToast,
  });

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
  } = useAllHoroscopes();

  const loading = zodiacLoading || horoscopeLoading;
  const error = zodiacError ?? horoscopeError;
  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;
  const horoscope = zodiacSign
    ? (horoscopes.find((h) => h.zodiac_sign === zodiacSign) ?? null)
    : null;

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      {/* FinalMainRevised background decorations */}
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {/* Header */}
        <FinalHeader
          subtitle={COPY.headerSubtitle}
          onSharePress={horoscope ? share : undefined}
          sharing={sharing}
          onSavePress={horoscope ? saveImage : undefined}
          saving={saving}
        />

        {/* DatePill — 오하아사 방송 기준일 표시 */}
        <View style={styles.pillWrap}>
          <DatePill dateText={broadcastDate ?? ""} />
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
            {/* Hero — no FinalCard, floats on background */}
            <View style={[styles.hero, { marginTop: cfg.heroMarginTop }]}>
              {/* Gradient rank pill */}
              <LinearGradient
                colors={[colors.yellow, colors.apricot]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rankPill}
              >
                <Text style={styles.rankPillText}>
                  오늘의 운세 {horoscope.rank}위
                </Text>
              </LinearGradient>

              {/* Constellation circle: glow + dashed ring + badge */}
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

              {/* Zodiac name + English sub */}
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
            <Text style={styles.emptyText}>
              {zodiacSign === null ? COPY.noZodiac : COPY.noData}
            </Text>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>

      {/* 오프스크린 캡처용 ShareCard */}
      {zodiac && horoscope && (
        <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
          <ShareCard ref={cardRef} horoscope={horoscope} zodiac={zodiac} />
        </View>
      )}

      <Toast {...toastProps} />
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
  content: {
    paddingBottom: 96,
  },

  // ── Positioning wrappers ──────────────────────────────────────
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

  // ── Hero ─────────────────────────────────────────────────────
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
    // includeFontPadding: false,
    color: "#FFFDF9",
  },
  circleOuter: {
    // width/height는 cfg.circleSize로 인라인 override
    marginVertical: 10,
  },
  circleDash: {
    position: "absolute",
    top: -8,
    bottom: -8,
    left: -8,
    right: -8,
    // borderRadius는 cfg.dashRadius로 인라인 override
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
    // fontSize는 cfg.zodiacFontSize로 인라인 override
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

  // ── Fortune card ─────────────────────────────────────────────
  fortuneCard: {
    // marginTop은 cfg.cardMarginTop으로 인라인 override
    marginHorizontal: 24,
  },

  // ── 행운 아이템 · 오늘의 운 그리드 스타일 ────────────────────────
  // 오하아사에는 해당 필드가 없어 주석 처리.
  // 추후 고고별자리 연동 Phase에서 복구 예정.
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

  // ── Empty / error states ─────────────────────────────────────
  emptyWrap: {
    marginTop: 40,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMid,
  },
  errorText: {
    color: colors.apricotDark,
    fontSize: 13,
    textAlign: "center",
  },
  spacer: {
    minHeight: 20,
  },

  // ── 오프스크린 캡처 영역 ──────────────────────────────────────
  offscreen: {
    position: "absolute",
    left: -9999,
    top: 0,
  },
});
