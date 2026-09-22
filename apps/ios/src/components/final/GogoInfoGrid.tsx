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
  const luckyItem =
    horoscope.lucky_item_ohaasa_ko ??
    horoscope.lucky_item_ohaasa ??
    horoscope.lucky_item_ko ??
    horoscope.lucky_item;

  /* 고고 컬러 열 — 평일에는 노출하지 않는다.
     오하아사 아이템이 "분홍색"처럼 색으로 내려오는 날이 있어(관측상 5건 중 1건 꼴)
     고고 컬러와 나란히 뜨면 한 화면에 서로 다른 색이 두 개 보인다.
     주말(source='gogo')은 고고가 메인 소스라 그대로 보여준다.
     평일 컬러를 되살리려면 아래를 `const showGogoColor = true;`로 바꾸면 된다. */
  const showGogoColor = horoscope.source === "gogo";
  const luckyColor = showGogoColor
    ? horoscope.lucky_color_ko ?? horoscope.lucky_color
    : null;

  const hasLucky =
    luckyColor !== null ||
    luckyItem !== null ||
    horoscope.lucky_place !== null;
  const hasScore =
    (horoscope.love_score !== null && horoscope.love_score > 0) ||
    (horoscope.work_score !== null && horoscope.work_score > 0) ||
    (horoscope.money_score !== null && horoscope.money_score > 0) ||
    (horoscope.health_score !== null && horoscope.health_score > 0);

  if (!hasLucky && !hasScore) return null;

  return (
    <View style={[styles.infoGrid, style]}>
      {hasLucky && (
        <FinalCard style={styles.gridCard}>
          <Text style={styles.gridHeader}>행운 아이템</Text>
          <LuckyRow
            label="장소"
            value={horoscope.lucky_place_ko ?? horoscope.lucky_place}
          />
          <LuckyRow
            label="컬러"
            value={luckyColor}
          />
          <LuckyRow
            label="아이템"
            value={luckyItem}
          />
        </FinalCard>
      )}

      {hasScore && (
        <FinalCard style={styles.gridCard}>
          <Text style={styles.gridHeader}>오늘의 운 ✦</Text>
          <StarRow label="연애" value={horoscope.love_score} />
          <StarRow label="직장" value={horoscope.work_score} />
          <StarRow label="금운" value={horoscope.money_score} />
          <StarRow label="건강" value={horoscope.health_score} />
        </FinalCard>
      )}
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
    padding: 12,
  },
  gridHeader: {
    fontSize: 10,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
    letterSpacing: 1.08,
    marginBottom: 8,
  },
  luckyRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: Platform.OS === "ios" ? 6 : 4,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Platform.OS === "ios" ? 6 : 4,
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
    flexShrink: 0,
  },
  starLabel: {
    minWidth: 34,
  },
  rowValue: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textMid,
    textAlign: "right",
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
});
