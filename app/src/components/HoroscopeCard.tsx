import { StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";

import { FinalCard } from "@/src/components/final/FinalCard";
import { typography } from "@/src/constants/design";
import { useScreenSize } from "@/src/hooks/useScreenSize";

const ADVICE_CONFIG = {
  android: {
    fontSize: 13,
    lineHeight: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  ios: {
    fontSize: 14,
    lineHeight: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
} as const;

interface HoroscopeCardProps {
  advice: string;
  style?: StyleProp<ViewStyle>;
}

export function HoroscopeCard({ advice, style }: HoroscopeCardProps) {
  const cfg = ADVICE_CONFIG[useScreenSize()];
  return (
    <FinalCard
      style={[
        styles.card,
        {
          paddingVertical: cfg.paddingVertical,
          paddingHorizontal: cfg.paddingHorizontal,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.advice,
          { fontSize: cfg.fontSize, lineHeight: cfg.lineHeight },
        ]}
      >
        {advice}
      </Text>
    </FinalCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  advice: {
    ...typography.fortune,
    textAlign: "center",
  },
});
