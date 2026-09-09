import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius } from "@/src/constants/design";

interface ToastProps {
  message: string;
  visible: boolean;
}

export function Toast({ message, visible }: ToastProps) {
  // 렌더 간 같은 인스턴스여야 하지만 렌더 중 ref를 읽으면 안 된다 (→ BottomSheet).
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { bottom: insets.bottom + 40, opacity }]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    // 폭 제한이 없으면 긴 메시지가 화면 밖으로 뻗는다. 개발 빌드는 실패 원인 문자열까지 붙어 길어진다.
    maxWidth: "88%",
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  text: {
    color: "#FFFDF9",
    fontSize: 14,
    lineHeight: 18,
    fontFamily: "NotoSansKR_500Medium",
  },
});
