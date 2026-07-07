import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "@/src/constants/design";

const BASE_ITEMS = ["한 줄 운세", "오늘의 운", "행운 장소", "행운 컬러", "행운 아이템"] as const;
const CARD_ITEM = "오늘의 카드";

interface MemorableItemChipsProps {
  selected: string[];
  onChange: (items: string[]) => void;
  showCardChip?: boolean;
}

export function MemorableItemChips({
  selected,
  onChange,
  showCardChip = false,
}: MemorableItemChipsProps) {
  const items = showCardChip ? [...BASE_ITEMS, CARD_ITEM] : [...BASE_ITEMS];

  function toggle(item: string) {
    onChange(
      selected.includes(item)
        ? selected.filter((i) => i !== item)
        : [...selected, item]
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.question}>무엇이 가장 기억에 남았나요?</Text>
      <View style={styles.chips}>
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <Pressable
              key={item}
              onPress={() => toggle(item)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  question: {
    fontSize: 12,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.cream3,
    backgroundColor: colors.cardSolid,
  },
  chipActive: {
    backgroundColor: "rgba(240,184,154,0.18)",
    borderColor: colors.apricot,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textSoft,
  },
  chipTextActive: {
    fontFamily: "NotoSansKR_500Medium",
    color: colors.apricotDark,
  },
});
