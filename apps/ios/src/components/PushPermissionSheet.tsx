import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/src/components/common/BottomSheet";
import { colors, radius } from "@/src/constants/design";

interface PushPermissionSheetProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function PushPermissionSheet({
  visible,
  onAccept,
  onDecline,
}: PushPermissionSheetProps) {
  return (
    <BottomSheet visible={visible}>
      <Text style={styles.title}>매일 아침 운세를 받아볼까요?</Text>
      <Text style={styles.description}>
        운세가 업데이트되면 알림으로 알려드려요.{"\n"}언제든 설정에서 끌 수 있어요.
      </Text>

      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          onPress={onDecline}
        >
          <Text style={styles.ghostText}>나중에</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={onAccept}
        >
          <Text style={styles.primaryText}>받을게요</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
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
