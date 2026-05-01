import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

import type { ZodiacSign } from "@/src/constants/zodiac";
import { colors, radius } from "@/src/constants/design";

interface Point {
  x: number;
  y: number;
}

interface ConstellationBadgeProps {
  sign?: ZodiacSign;
  size?: number;
}

const DEFAULT_POINTS: Point[] = [
  { x: 16, y: 34 },
  { x: 29, y: 21 },
  { x: 43, y: 28 },
  { x: 54, y: 15 },
];

const POINTS_BY_SIGN: Partial<Record<ZodiacSign, Point[]>> = {
  aries: [
    { x: 18, y: 38 },
    { x: 31, y: 22 },
    { x: 46, y: 31 },
    { x: 56, y: 18 },
  ],
  taurus: [
    { x: 15, y: 27 },
    { x: 29, y: 18 },
    { x: 43, y: 24 },
    { x: 55, y: 38 },
  ],
  gemini: [
    { x: 19, y: 16 },
    { x: 21, y: 45 },
    { x: 46, y: 17 },
    { x: 48, y: 46 },
  ],
  cancer: [
    { x: 16, y: 34 },
    { x: 29, y: 24 },
    { x: 43, y: 33 },
    { x: 56, y: 23 },
  ],
  leo: [
    { x: 16, y: 41 },
    { x: 28, y: 24 },
    { x: 45, y: 19 },
    { x: 55, y: 35 },
  ],
  virgo: [
    { x: 15, y: 20 },
    { x: 26, y: 34 },
    { x: 40, y: 21 },
    { x: 55, y: 42 },
  ],
  libra: [
    { x: 14, y: 39 },
    { x: 28, y: 26 },
    { x: 43, y: 26 },
    { x: 56, y: 39 },
  ],
  scorpio: [
    { x: 15, y: 19 },
    { x: 27, y: 31 },
    { x: 42, y: 27 },
    { x: 55, y: 45 },
  ],
  sagittarius: [
    { x: 15, y: 45 },
    { x: 29, y: 33 },
    { x: 43, y: 22 },
    { x: 56, y: 14 },
  ],
  capricorn: [
    { x: 16, y: 24 },
    { x: 28, y: 39 },
    { x: 43, y: 31 },
    { x: 55, y: 44 },
  ],
  aquarius: [
    { x: 14, y: 27 },
    { x: 28, y: 19 },
    { x: 42, y: 30 },
    { x: 56, y: 22 },
  ],
  pisces: [
    { x: 18, y: 17 },
    { x: 27, y: 37 },
    { x: 44, y: 27 },
    { x: 55, y: 45 },
  ],
};

export function ConstellationBadge({
  sign,
  size = 74,
}: ConstellationBadgeProps) {
  const points = sign
    ? (POINTS_BY_SIGN[sign] ?? DEFAULT_POINTS)
    : DEFAULT_POINTS;

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 72 72">
        {points.slice(1).map((point, index) => {
          const previous = points[index];

          return (
            <Line
              key={`${previous.x}-${point.x}`}
              x1={previous.x}
              y1={previous.y}
              x2={point.x}
              y2={point.y}
              stroke={colors.textSoft}
              strokeLinecap="round"
              strokeWidth={1.3}
            />
          );
        })}
        {points.map((point) => (
          <Circle
            cx={point.x}
            cy={point.y}
            fill={colors.yellow}
            key={`${point.x}-${point.y}`}
            r={3.2}
            stroke={colors.textSoft}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    // borderWidth: 1,
    // borderColor: colors.border,
    // backgroundColor: 'rgba(255,253,249,0.68)',
    overflow: "hidden",
    borderRadius: radius.pill,
  },
});
