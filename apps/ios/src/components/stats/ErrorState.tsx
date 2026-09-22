import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ConstellationBadge } from "@/src/components/final/ConstellationBadge";
import { colors } from "@/src/constants/design";
import type { ZodiacSign } from "@/src/constants/zodiac";

interface ErrorStateProps {
  zodiacSign: ZodiacSign | null;
  onRetry: () => void;
}

export function ErrorState({ zodiacSign, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.errorIllustration}>
        <ConstellationBadge sign={zodiacSign ?? undefined} size={64} />
        <View style={styles.errorCloud}>
          <Feather name="cloud" size={20} color={colors.textSoft} />
        </View>
      </View>
      <Text style={styles.errorTitle}>운세 흐름을 불러오지 못했어요</Text>
      <Text style={styles.errorSubtitle}>잠시 후 다시 시도해 주세요</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 6,
  },
  errorIllustration: {
    marginBottom: 8,
    opacity: 0.55,
  },
  errorCloud: {
    position: "absolute",
    right: -8,
    bottom: -4,
    borderRadius: 12,
    backgroundColor: colors.cardSolid,
    padding: 4,
  },
  errorTitle: {
    fontSize: 15,
    lineHeight: 20,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.text,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    color: colors.textSoft,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: colors.text,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    fontSize: 13,
    lineHeight: 18,
    includeFontPadding: false,
    fontFamily: "NotoSansKR_500Medium",
    color: colors.cardSolid,
  },
});
