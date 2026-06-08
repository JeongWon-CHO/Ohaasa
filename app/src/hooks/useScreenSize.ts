import { Platform } from "react-native";

export type ScreenSize = "ios" | "android";

export function useScreenSize(): ScreenSize {
  return Platform.OS === "ios" ? "ios" : "android";
}
