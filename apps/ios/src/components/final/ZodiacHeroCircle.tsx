import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { colors } from "@/src/constants/design";
import type { ZodiacInfo } from "@/src/constants/zodiac";
import { useScreenSize } from "@/src/hooks/useScreenSize";

const SCREEN_CONFIG = {
  android: {
    circleSize: 100,
    badgeSize: 76,
    glowSize: 128,
    glowCenter: 64,
    dashRadius: 56,
  },
  ios: {
    circleSize: 110,
    badgeSize: 84,
    glowSize: 141,
    glowCenter: 70,
    dashRadius: 62,
  },
} as const;

interface ZodiacHeroCircleProps {
  zodiac: ZodiacInfo;
  rankPillText: string;
}

export function ZodiacHeroCircle({ zodiac, rankPillText }: ZodiacHeroCircleProps) {
  const cfg = SCREEN_CONFIG[useScreenSize()];

  return (
    <View style={styles.hero}>
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
              <Stop offset="0%" stopColor="#F0B89A" stopOpacity={0.58} />
              <Stop offset="45%" stopColor="#F5D98B" stopOpacity={0.3} />
              <Stop offset="80%" stopColor="#FAF6F0" stopOpacity={0.12} />
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
        <View style={[styles.circleDash, { borderRadius: cfg.dashRadius }]} />
        <View style={styles.circleBadge}>
          <ConstellationBadge sign={zodiac.sign} size={cfg.badgeSize} />
        </View>
      </View>

      <View style={styles.zodiacText}>
        <Text style={styles.zodiacName}>{zodiac.ko}</Text>
        <Text style={styles.zodiacSub}>
          {zodiac.en} · {zodiac.dateRange}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    marginTop: 24,
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
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
  },
  zodiacSub: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSoft,
    marginTop: 4,
  },
});
