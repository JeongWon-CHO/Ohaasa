import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/src/constants/design";

interface StarRatingInputProps {
  rating: number | null;
  onChange: (rating: number) => void;
}

export function StarRatingInput({ rating, onChange }: StarRatingInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>오늘 운세는 어땠나요?</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = rating !== null && n <= rating;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              hitSlop={10}
              style={styles.starBtn}
            >
              <FontAwesome5
                name="star"
                size={34}
                solid={filled}
                color={filled ? colors.yellow : "rgba(156,139,120,0.25)"}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.labelsRow}>
        <Text style={styles.label}>달랐어요</Text>
        <Text style={styles.label}>비슷했어요</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  question: {
    fontSize: 14,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
  },
  starsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  starBtn: {
    padding: spacing.xs,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing.xs,
  },
  label: {
    fontSize: 11,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
  },
});
