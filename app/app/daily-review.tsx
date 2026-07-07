import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients, typography } from "@/src/constants/design";

export default function DailyReviewScreen() {
  return (
    <LinearGradient colors={gradients.screen} style={styles.fill}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.6 }]}
          hitSlop={12}
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>오늘의 운세 리뷰</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.body}>
        <Text style={styles.placeholder}>기록 작성 화면 (준비 중)</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 17,
    fontFamily: "NotoSansKR_500Medium",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    fontSize: 14,
    fontFamily: "NotoSansKR_300Light",
    color: colors.textSoft,
  },
});
