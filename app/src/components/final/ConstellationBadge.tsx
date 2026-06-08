import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";

import type { ZodiacSign } from "@/src/constants/zodiac";
import { radius } from "@/src/constants/design";

interface ConstellationBadgeProps {
  sign?: ZodiacSign;
  size?: number;
}

const IMAGE_BY_SIGN: Record<ZodiacSign, ImageSourcePropType> = {
  aries: require("@/assets/images/zodiac/aries.png"),
  taurus: require("@/assets/images/zodiac/taurus.png"),
  gemini: require("@/assets/images/zodiac/gemini.png"),
  cancer: require("@/assets/images/zodiac/cancer.png"),
  leo: require("@/assets/images/zodiac/leo.png"),
  virgo: require("@/assets/images/zodiac/virgo.png"),
  libra: require("@/assets/images/zodiac/libra.png"),
  scorpio: require("@/assets/images/zodiac/scorpio.png"),
  sagittarius: require("@/assets/images/zodiac/sagittarius.png"),
  capricorn: require("@/assets/images/zodiac/capricorn.png"),
  aquarius: require("@/assets/images/zodiac/aquarius.png"),
  pisces: require("@/assets/images/zodiac/pisces.png"),
};

export function ConstellationBadge({
  sign,
  size = 74,
}: ConstellationBadgeProps) {
  if (!sign) {
    return (
      <View
        style={[
          styles.badge,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Image
        source={IMAGE_BY_SIGN[sign]}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: radius.pill,
  },
});
