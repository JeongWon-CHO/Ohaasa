import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { colors } from "@/src/constants/design";

export function StatisticsHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>ohaasa</Text>
        <Text style={styles.title}>운세 흐름</Text>
        <Text style={styles.subtitle}>최근 운세 순위를 한눈에 확인해요</Text>
      </View>
      <Pressable onPress={() => {}} style={styles.shareButton}>
        <Feather name="upload" size={16} color={colors.apricotDark} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: "NotoSansKR_300Light",
    includeFontPadding: false,
    color: colors.textSoft,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    lineHeight: 29,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.text,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
    marginTop: 2,
  },
  shareButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,253,249,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
});
