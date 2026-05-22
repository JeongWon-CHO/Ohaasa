import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { colors, gradients } from "@/src/constants/design";
import type { ZodiacInfo } from "@/src/constants/zodiac";
import type { Horoscope } from "@/src/types/horoscope";

export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 640;

const BADGE_SIZE = 90;
const CIRCLE_SIZE = 110;
const GLOW_SIZE = CIRCLE_SIZE + 32;
const GLOW_CENTER = GLOW_SIZE / 2;
const DASH_RADIUS = CIRCLE_SIZE / 2 + 8;

interface ShareCardProps {
  horoscope: Horoscope;
  zodiac: ZodiacInfo;
}

function formatShareDate(dateStr: string, source: "ohaasa" | "gogo"): string {
  const [, month, day] = dateStr.split("-").map(Number);
  const label = source === "gogo" ? "고고별자리" : "오하아사";
  return `${month}월 ${day}일 ${label}`;
}

export const ShareCard = forwardRef<View, ShareCardProps>(
  ({ horoscope, zodiac }, ref) => {
    const dateLabel = formatShareDate(horoscope.date, horoscope.source);
    const advice = horoscope.advice_ko ?? horoscope.advice;

    return (
      <View ref={ref} style={styles.wrapper} collapsable={false}>
        <LinearGradient colors={gradients.screen} style={styles.card}>
          {/* 헤더 — 상단 고정 */}
          <Text style={styles.header}>✦ {dateLabel} ✦</Text>

          {/* 나머지 콘텐츠 — 중앙 정렬 */}
          <View style={styles.content}>
            {/* 순위 pill */}
            <LinearGradient
              colors={[colors.yellow, colors.apricot]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rankPill}
            >
              <Text style={styles.rankText}>
                오늘의 운세 {horoscope.rank}위
              </Text>
            </LinearGradient>

            {/* 별자리 뱃지 + 글로우 */}
            <View style={styles.circleOuter}>
              <Svg
                width={GLOW_SIZE}
                height={GLOW_SIZE}
                style={{ position: "absolute", top: -16, left: -16 }}
              >
                <Defs>
                  <RadialGradient id="shareGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#F0B89A" stopOpacity={0.58} />
                    <Stop offset="45%" stopColor="#F5D98B" stopOpacity={0.3} />
                    <Stop offset="80%" stopColor="#FAF6F0" stopOpacity={0.12} />
                    <Stop offset="100%" stopColor="#FAF6F0" stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle
                  cx={GLOW_CENTER}
                  cy={GLOW_CENTER}
                  r={GLOW_CENTER}
                  fill="url(#shareGlow)"
                />
              </Svg>
              <View
                style={[styles.circleDash, { borderRadius: DASH_RADIUS }]}
              />
              <View style={styles.circleBadge}>
                <ConstellationBadge sign={zodiac.sign} size={BADGE_SIZE} />
              </View>
            </View>

            {/* 별자리 이름 */}
            <Text style={styles.zodiacName}>{zodiac.ko}</Text>

            {/* 운세 텍스트 */}
            <View style={styles.adviceBox}>
              <Text style={styles.advice}>{advice}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    flex: 1,
    paddingHorizontal: 36,
    paddingTop: 60,
    paddingBottom: 36,
  },
  header: {
    fontSize: 9,
    fontWeight: "400",
    color: colors.textSoft,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  rankPill: {
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  rankText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFDF9",
    letterSpacing: 0.6,
  },
  circleOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
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
  zodiacName: {
    fontSize: 16,
    fontWeight: "300",
    color: colors.text,
    letterSpacing: 0.5,
  },
  adviceBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: "rgba(255,253,249,0.75)",
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: "100%",
  },
  advice: {
    fontSize: 10,
    fontWeight: "300",
    color: colors.text,
    lineHeight: 18,
    textAlign: "center",
  },
});
