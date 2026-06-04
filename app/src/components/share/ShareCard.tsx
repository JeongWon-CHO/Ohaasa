import { forwardRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { colors, gradients } from "@/src/constants/design";
import type { ZodiacInfo } from "@/src/constants/zodiac";
import type { Horoscope } from "@/src/types/horoscope";

export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 720;

const BADGE_SIZE = 88;
const CIRCLE_SIZE = 118;
const GLOW_SIZE = CIRCLE_SIZE + 32;
const GLOW_CENTER = GLOW_SIZE / 2;
const DASH_RADIUS = CIRCLE_SIZE / 2 + 8;
const MAX_STARS = 6;

interface ShareCardProps {
  horoscope: Horoscope;
  zodiac: ZodiacInfo;
}

function formatShareDate(dateStr: string, source: "ohaasa" | "gogo"): string {
  const [, month, day] = dateStr.split("-").map(Number);
  const label = source === "gogo" ? "고고별자리" : "오하아사";
  return `${month}월 ${day}일 ${label}`;
}

function ShareInfoGrid({ horoscope }: { horoscope: Horoscope }) {
  const hasLucky =
    horoscope.lucky_color !== null || horoscope.lucky_item !== null;
  const hasScore =
    (horoscope.love_score !== null && horoscope.love_score > 0) ||
    (horoscope.work_score !== null && horoscope.work_score > 0) ||
    (horoscope.money_score !== null && horoscope.money_score > 0) ||
    (horoscope.health_score !== null && horoscope.health_score > 0);

  if (!hasLucky && !hasScore) return null;

  const scoreRows = [
    { label: "연애", value: horoscope.love_score },
    { label: "직장", value: horoscope.work_score },
    { label: "금운", value: horoscope.money_score },
    { label: "건강", value: horoscope.health_score },
  ].filter((r) => r.value !== null && r.value > 0);

  return (
    <View style={infoStyles.grid}>
      {hasLucky && (
        <View style={infoStyles.card}>
          <Text style={infoStyles.cardHeader}>행운 아이템</Text>
          {horoscope.lucky_color !== null && (
            <View style={infoStyles.row}>
              <Text style={infoStyles.rowLabel}>컬러</Text>
              <Text style={infoStyles.rowValue} numberOfLines={2}>
                {horoscope.lucky_color_ko ?? horoscope.lucky_color}
              </Text>
            </View>
          )}
          {horoscope.lucky_item !== null && (
            <View style={infoStyles.row}>
              <Text style={infoStyles.rowLabel}>아이템</Text>
              <Text style={infoStyles.rowValue} numberOfLines={2}>
                {horoscope.lucky_item_ko ?? horoscope.lucky_item}
              </Text>
            </View>
          )}
        </View>
      )}
      {hasScore && (
        <View style={infoStyles.card}>
          <Text style={infoStyles.cardHeader}>오늘의 운 ✦</Text>
          {scoreRows.map(({ label, value }) => (
            <View key={label} style={infoStyles.starRow}>
              <Text style={infoStyles.starLabel}>{label}</Text>
              <View style={infoStyles.stars}>
                {Array.from({ length: MAX_STARS }).map((_, i) => (
                  <FontAwesome
                    key={i}
                    name="star"
                    size={11}
                    color={i < value! ? colors.yellow : colors.cream3}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export const ShareCard = forwardRef<View, ShareCardProps>(
  ({ horoscope, zodiac }, ref) => {
    const dateLabel = formatShareDate(horoscope.date, horoscope.source);
    const advice = horoscope.advice_ko ?? horoscope.advice;

    return (
      <View ref={ref} style={styles.wrapper} collapsable={false}>
        <LinearGradient colors={gradients.screen} style={styles.card}>
          <View style={styles.content}>
            {/* 날짜 */}
            <Text style={styles.header}>✦ {dateLabel} ✦</Text>

            {/* 순위 pill · 별자리 뱃지 · 별자리 이름 — 묶어서 간격 통일 */}
            <View style={styles.topGroup}>
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

              <View style={styles.circleOuter}>
                <Svg
                  width={GLOW_SIZE}
                  height={GLOW_SIZE}
                  style={{ position: "absolute", top: -16, left: -16 }}
                >
                  <Defs>
                    <RadialGradient id="shareGlow" cx="50%" cy="50%" r="50%">
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

              <Text style={styles.zodiacName}>{zodiac.ko}</Text>
            </View>

            {/* 조언 · 행운 아이템 */}
            <View style={styles.bottomGroup}>
              <View style={styles.adviceBox}>
                <Text
                  style={styles.advice}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  numberOfLines={7}
                >
                  {advice}
                </Text>
              </View>

              <ShareInfoGrid horoscope={horoscope} />
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
    paddingHorizontal: 32,
    paddingVertical: 88,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  header: {
    fontSize: 12,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  rankPill: {
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 18,
  },
  rankText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "NotoSansKR_600SemiBold",
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
    fontSize: 20,
    lineHeight: 28,
    fontFamily: "NotoSansKR_300Light",
    color: colors.text,
    letterSpacing: 0.5,
  },
  adviceBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: "rgba(255,253,249,0.75)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
  },
  advice: {
    fontSize: 13,
    fontFamily: "NotoSansKR_300Light",
    color: colors.text,
    lineHeight: Platform.OS === "android" ? 22 : 20,
    textAlign: "center",
  },
  topGroup: {
    alignItems: "center",
    gap: 22,
  },
  bottomGroup: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
});

const infoStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: "rgba(255,253,249,0.75)",
    padding: 12,
  },
  cardHeader: {
    fontSize: 10,
    color: colors.textSoft,
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 12,
    color: colors.textSoft,
    flexShrink: 0,
  },
  rowValue: {
    flex: 1,
    fontSize: 12,
    color: colors.textMid,
    flexWrap: "wrap",
    textAlign: "right",
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  starLabel: {
    fontSize: 12,
    color: colors.textSoft,
    width: 28,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
});
