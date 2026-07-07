import type { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { layout } from "@/src/constants/design";

interface ResponsiveContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ResponsiveContainer({ children, style }: ResponsiveContainerProps) {
  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
});
