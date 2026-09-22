import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/common/BottomSheet";
import { colors, radius } from "@/src/constants/design";

interface MediaDeniedSheetProps {
  visible: boolean;
  onOpenSettings: () => void;
  onClose: () => void;
}

export function MediaDeniedSheet({
  visible,
  onOpenSettings,
  onClose,
}: MediaDeniedSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>사진 저장 권한이 없어요</Text>
      <Text style={styles.description}>
        기기 설정에서 사진 접근을 허용하면{"\n"}이미지를 갤러리에 저장할 수 있어요.
      </Text>

      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          onPress={onClose}
        >
          <Text style={styles.ghostText}>닫기</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={onOpenSettings}
        >
          <Text style={styles.primaryText}>설정하러 가기</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 19,
    fontFamily: "NotoSansKR_700Bold",
    color: colors.text,
    lineHeight: 28,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.textMid,
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  primary: {
    flex: 1,
    backgroundColor: colors.apricotDark,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: {
    fontSize: 15,
    fontFamily: "NotoSansKR_600SemiBold",
    lineHeight: 22,
    color: "#FFFDF9",
  },
  ghost: {
    flex: 1,
    backgroundColor: "rgba(44,36,22,0.07)",
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  ghostText: {
    fontSize: 15,
    fontFamily: "NotoSansKR_500Medium",
    lineHeight: 22,
    color: colors.textMid,
  },
  pressed: {
    opacity: 0.72,
  },
});
