import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ShareCard } from "@/src/components/share/ShareCard";
import { useShareHoroscope } from "@/src/hooks/useShareHoroscope";
import { LinearGradient } from "expo-linear-gradient";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Svg, {
  Circle,
  Defs,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { DatePill } from "@/src/components/final/DatePill";
import { GogoInfoGrid } from "@/src/components/final/GogoInfoGrid";
import { HoroscopeCard } from "@/src/components/HoroscopeCard";
import { colors, gradients } from "@/src/constants/design";
import { ZODIAC_MAP, type ZodiacSign } from "@/src/constants/zodiac";
import { useAllHoroscopes } from "@/src/hooks/useHoroscope";

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
  virgo: "8/23–9/23",
  libra: "9/24–10/22",
  scorpio: "10/23–11/22",
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

// ─── Screen ───────────────────────────────────────────────────

export default function ZodiacDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sign } = useLocalSearchParams<{ sign: string }>();
  const { horoscopes, broadcastDate, loading, error } = useAllHoroscopes();

  const { cardRef, share, sharing } = useShareHoroscope();

  const validSign =
    typeof sign === "string" && sign in ZODIAC_MAP
      ? (sign as ZodiacSign)
      : null;

  const zodiac = validSign ? ZODIAC_MAP[validSign] : null;
  const horoscope = validSign
    ? (horoscopes.find((h) => h.zodiac_sign === validSign) ?? null)
    : null;

  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
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

      {/* 헤더 */}
      <View style={[styles.backRow, { paddingTop: insets.top + 14 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <FontAwesome
            name="chevron-left"
            size={16}
            color={colors.apricotDark}
          />
        </TouchableOpacity>
        {horoscope && zodiac && (
          <TouchableOpacity
            onPress={share}
            hitSlop={12}
            style={styles.backBtn}
            disabled={sharing}
          >
            <Feather
              name="share-2"
              size={20}
              color={sharing ? colors.textSoft : colors.apricotDark}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        {/* DatePill */}
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
        ) : !validSign || !zodiac ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>알 수 없는 별자리입니다.</Text>
          </View>
        ) : !horoscope ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>방송 데이터가 없습니다.</Text>
          </View>
        ) : (
          <>
            {/* Hero */}
            <View style={styles.hero}>
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

              <View style={styles.circleOuter}>
                <Svg
                  width={150}
                  height={150}
                  style={{ position: "absolute", top: -16, left: -16 }}
                >
                  <Defs>
                    <RadialGradient
                      id="detailCircleGlow"
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
                    cx={75}
                    cy={75}
                    r={75}
                    fill="url(#detailCircleGlow)"
                  />
                </Svg>
                <View style={styles.circleDash} />
                <View style={styles.circleBadge}>
                  <ConstellationBadge sign={zodiac.sign} size={90} />
                </View>
              </View>

              <View style={styles.zodiacText}>
                <Text style={styles.zodiacName}>{zodiac.ko}</Text>
                <Text style={styles.zodiacSub}>
                  {EN_NAMES[zodiac.sign]} · {DATE_RANGES[zodiac.sign]}
                </Text>
              </View>
            </View>

            {/* Fortune card */}
            <HoroscopeCard
              advice={horoscope.advice_ko ?? horoscope.advice}
              style={styles.fortuneCard}
            />

            {/* 고고별자리 행운 아이템 · 오늘의 운 */}
            <GogoInfoGrid horoscope={horoscope} style={styles.infoGrid} />
          </>
        )}

        <View style={styles.spacer} />
      </ScrollView>
      {/* 오프스크린 캡처용 ShareCard */}
      {horoscope && zodiac && (
        <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
          <ShareCard ref={cardRef} horoscope={horoscope} zodiac={zodiac} />
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: "hidden",
  },
  backRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  content: {
    paddingBottom: 96,
  },
  pillWrap: {
    marginTop: 4,
    marginHorizontal: 28,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,
    marginTop: 28,
  },
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
    fontSize: 13,
    color: colors.apricotDark,
    textAlign: "center",
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
    fontSize: 12,
    lineHeight: 16,
    fontFamily: "NotoSansKR_500Medium",
    includeFontPadding: false,
    color: "#FFFDF9",
    letterSpacing: 0.66,
  },
  circleOuter: {
    width: 118,
    height: 118,
    marginVertical: 20,
  },
  circleDash: {
    position: "absolute",
    top: -8,
    bottom: -8,
    left: -8,
    right: -8,
    borderRadius: 67,
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
    fontSize: 20,
    lineHeight: 28,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.text,
  },
  zodiacSub: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
    marginTop: 3,
  },

  // ── Fortune card ─────────────────────────────────────────────
  fortuneCard: {
    marginTop: 22,
    marginHorizontal: 24,
  },

  // ── 고고별자리 행운 아이템 · 오늘의 운 ────────────────────────────
  infoGrid: {
    marginTop: 12,
    marginHorizontal: 24,
  },

  spacer: {
    minHeight: 20,
  },
  offscreen: {
    position: "absolute",
    left: -9999,
    top: 0,
  },
});
