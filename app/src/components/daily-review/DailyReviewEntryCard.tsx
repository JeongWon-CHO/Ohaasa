import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, shadows, spacing, typography } from "@/src/constants/design";

interface DailyReviewEntryCardProps {
  hasReview: boolean;
  rating?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function DailyReviewEntryCard({ hasReview, rating = 0, onPress, style }: DailyReviewEntryCardProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionLabel}>오늘의 운세 리뷰</Text>

      <Pressable
        style={({ pressed }) => [styles.card, shadows.card, pressed && styles.cardPressed]}
        onPress={onPress}
      >
        <View style={styles.iconWrap}>
          <Feather name="moon" size={18} color={colors.apricotDark} />
        </View>

        <View style={styles.textWrap}>
          {hasReview ? (
            <>
              <Text style={styles.title}>{renderStars(rating)} 오늘의 별점을 남겼어요</Text>
              <Text style={styles.subtitle}>기록을 다시 열어볼 수 있어요</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>오늘 운세는 어땠나요?</Text>
              <Text style={styles.subtitle}>별점과 한 줄 기록을 남겨보세요</Text>
            </>
          )}
        </View>

        <Feather name="chevron-right" size={16} color={colors.textSoft} />
      </Pressable>
    </View>
  );
}

function renderStars(rating: number): string {
  const filled = Math.round(Math.max(0, Math.min(5, rating)));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 16,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  cardPressed: {
    opacity: 0.72,
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(240,184,154,0.5)",
    backgroundColor: "rgba(240,184,154,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
    lineHeight: 17,
  },
});
