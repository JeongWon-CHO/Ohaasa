import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { colors } from "@/src/constants/design";
import type { Horoscope } from "@/src/types/horoscope";
import { FinalCard } from "./FinalCard";

interface GogoInfoGridProps {
  horoscope: Horoscope;
  style?: StyleProp<ViewStyle>;
}

function LuckyRow({ label, value }: { label: string; value: string | null }) {
  if (value === null) return null;
  return (
    <View style={styles.luckyRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const MAX_STARS = 6;

function StarRow({ label, value }: { label: string; value: number | null }) {
  if (value === null || value === undefined || value <= 0) return null;
  const filled = Math.min(value, MAX_STARS);
  return (
    <View style={styles.starRow}>
      <Text style={[styles.rowLabel, styles.starLabel]}>{label}</Text>
      <View style={styles.stars}>
        {Array.from({ length: MAX_STARS }).map((_, i) => (
          <FontAwesome
            key={i}
            name="star"
            size={12}
            color={i < filled ? colors.yellow : colors.cream3}
          />
        ))}
      </View>
    </View>
  );
}

export function GogoInfoGrid({ horoscope, style }: GogoInfoGridProps) {
  const hasLucky =
    horoscope.lucky_color !== null || horoscope.lucky_item !== null;
  const hasScore =
    (horoscope.love_score !== null && horoscope.love_score > 0) ||
    (horoscope.work_score !== null && horoscope.work_score > 0) ||
    (horoscope.money_score !== null && horoscope.money_score > 0) ||
    (horoscope.health_score !== null && horoscope.health_score > 0);

  if (!hasLucky && !hasScore) return null;

  return (
    <View style={[styles.infoGrid, style]}>
      <FinalCard style={styles.gridCard}>
        <Text style={styles.gridHeader}>행운 아이템</Text>
        <LuckyRow
          label="컬러"
          value={horoscope.lucky_color_ko ?? horoscope.lucky_color}
        />
        <LuckyRow
          label="아이템"
          value={horoscope.lucky_item_ko ?? horoscope.lucky_item}
        />
      </FinalCard>

      <FinalCard style={styles.gridCard}>
        <Text style={styles.gridHeader}>오늘의 운 ✦</Text>
        <StarRow label="연애" value={horoscope.love_score} />
        <StarRow label="직장" value={horoscope.work_score} />
        <StarRow label="금운" value={horoscope.money_score} />
        <StarRow label="건강" value={horoscope.health_score} />
      </FinalCard>
    </View>
  );
}

const styles = StyleSheet.create({
  infoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  gridCard: {
    flex: 1,
    padding: 16,
  },
  gridHeader: {
    fontSize: 10,
    color: colors.textSoft,
    letterSpacing: 1.08,
    marginBottom: 12,
  },
  luckyRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Platform.OS === "ios" ? 12 : 8,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 12 : 8,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textSoft,
    flexShrink: 0,
  },
  starLabel: {
    minWidth: 34,
  },
  rowValue: {
    flex: 1,
    fontSize: 13,
    color: colors.textMid,
    flexWrap: "wrap",
    textAlign: "right",
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
});
