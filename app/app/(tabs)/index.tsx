import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import FontAwesome from "@expo/vector-icons/FontAwesome";
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
// 행운 아이템·오늘의 운 카드에서 사용. 오하아사에는 해당 필드가 없어 주석 처리.
// 추후 고고별자리 연동 Phase에서 복구 예정.
// import { FinalCard } from "@/src/components/final/FinalCard";
import { FinalHeader } from "@/src/components/final/FinalHeader";
import { HoroscopeCard } from "@/src/components/HoroscopeCard";
import { colors, gradients } from "@/src/constants/design";
import { ZODIAC_MAP, type ZodiacSign } from "@/src/constants/zodiac";
import { useAllHoroscopes } from "@/src/hooks/useHoroscope";
import { useZodiac } from "@/src/hooks/useZodiac";

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

const DATE_RANGES: Record<ZodiacSign, string> = {
  aries: "3/21–4/19",
  taurus: "4/20–5/20",
  gemini: "5/21–6/21",
  cancer: "6/22–7/22",
  leo: "7/23–8/22",
  virgo: "8/23–9/22",
  libra: "9/23–10/23",
  scorpio: "10/24–11/22",
  sagittarius: "11/23–12/21",
  capricorn: "12/22–1/19",
  aquarius: "1/20–2/18",
  pisces: "2/19–3/20",
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
  const { zodiacSign, loading: zodiacLoading, error: zodiacError } = useZodiac();
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
      <CircleDeco x={230} y={-30} size={160} color={colors.yellow} opacity={0.1} />
      <CircleDeco x={200} y={590} size={160} color={colors.apricot} opacity={0.1} />
      <StarDeco x={46} y={128} size={5} color={colors.yellow} opacity={0.26} />
      <StarDeco x={294} y={108} size={4} color={colors.apricot} opacity={0.22} />
      <StarDeco x={28} y={440} size={3} color={colors.yellow} opacity={0.18} />
      <MoonDeco x={286} y={174} size={22} color={colors.apricot} opacity={0.18} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {/* Header */}
        <View style={styles.headerWrap}>
          <FinalHeader subtitle={COPY.headerSubtitle} />
        </View>

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
            <View style={styles.hero}>
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
              <View style={styles.circleOuter}>
                <Svg
                  width={168}
                  height={168}
                  style={{ position: "absolute", top: -16, left: -16 }}
                >
                  <Defs>
                    <RadialGradient
                      id="todayCircleGlowGradient"
                      cx="50%"
                      cy="50%"
                      r="50%"
                    >
                      <Stop offset="0%" stopColor="#F0B89A" stopOpacity={0.58} />
                      <Stop offset="45%" stopColor="#F5D98B" stopOpacity={0.3} />
                      <Stop offset="80%" stopColor="#FAF6F0" stopOpacity={0.12} />
                      <Stop offset="100%" stopColor="#FAF6F0" stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Circle cx={84} cy={84} r={84} fill="url(#todayCircleGlowGradient)" />
                </Svg>
                <View style={styles.circleDash} />
                <View style={styles.circleBadge}>
                  <ConstellationBadge sign={zodiac.sign} size={106} />
                </View>
              </View>

              {/* Zodiac name + English sub */}
              <View style={styles.zodiacText}>
                <Text style={styles.zodiacName}>{zodiac.ko}</Text>
                <Text style={styles.zodiacSub}>
                  {EN_NAMES[zodiac.sign]} · {DATE_RANGES[zodiac.sign]}
                </Text>
              </View>
            </View>

            {/* Fortune card */}
            <HoroscopeCard advice={horoscope.advice} style={styles.fortuneCard} />

            {/* 행운 아이템 카드 — 오하아사에는 해당 필드가 없어 주석 처리.
                추후 고고별자리 연동 Phase에서 복구 예정.
            <View style={styles.infoGrid}>
              <FinalCard style={styles.gridCard}>
                <Text style={styles.gridHeader}>행운 아이템</Text>
                <LuckyRow label="컬러"   value={horoscope.luckyColor} />
                <LuckyRow label="아이템" value={horoscope.luckyItem} />
                <LuckyRow label="숫자"   value={String(horoscope.luckyNumber)} />
              </FinalCard>

              오늘의 운 별점 카드 — 오하아사에는 해당 필드가 없어 주석 처리.
              추후 고고별자리 연동 Phase에서 복구 예정.
              <FinalCard style={styles.gridCard}>
                <Text style={styles.gridHeader}>오늘의 운 ✦</Text>
                <StarRow label="연애" value={horoscope.love} />
                <StarRow label="직장" value={horoscope.work} />
                <StarRow label="금운" value={horoscope.money} />
                <StarRow label="건강" value={horoscope.mood} />
              </FinalCard>
            </View>
            */}
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
    </LinearGradient>
  );
}

// ─── Helper row components (주석 처리된 카드에서 사용 예정) ──────────────────────
// 오하아사에는 luckyColor·luckyItem·luckyNumber·love·work·money·mood 필드가 없어
// 아래 컴포넌트들도 현재 미사용. 추후 고고별자리 연동 Phase에서 복구 예정.

function LuckyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.luckyRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function StarRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.starRow}>
      <Text style={[styles.rowLabel, styles.starLabel]}>{label}</Text>
      <View style={styles.stars}>
        {Array.from({ length: 5 }).map((_, i) => (
          <FontAwesome
            key={i}
            name="star"
            size={12}
            color={i < value ? colors.yellow : colors.cream3}
          />
        ))}
      </View>
    </View>
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
  headerWrap: {
    paddingTop: 20,
    paddingHorizontal: 28,
  },
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
    marginTop: 28,
    alignItems: "center",
  },
  rankPill: {
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 18,
    marginBottom: 18,
    shadowColor: colors.apricot,
    shadowOpacity: 0.5,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFDF9",
    letterSpacing: 0.66,
  },
  circleOuter: {
    width: 136,
    height: 136,
  },
  circleDash: {
    position: "absolute",
    top: -8,
    bottom: -8,
    left: -8,
    right: -8,
    borderRadius: 76,
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
    marginTop: 16,
  },
  zodiacName: {
    fontSize: 19,
    fontWeight: "400",
    color: colors.text,
  },
  zodiacSub: {
    fontSize: 11,
    color: colors.textSoft,
    marginTop: 3,
  },

  // ── Fortune card ─────────────────────────────────────────────
  fortuneCard: {
    marginTop: 22,
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
    fontWeight: "500",
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
});
