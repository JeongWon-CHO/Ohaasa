import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { colors } from "@/src/constants/design";

interface FinalHeaderProps {
  subtitle?: string;
  onSharePress?: () => void;
  sharing?: boolean;
  onSavePress?: () => void;
  saving?: boolean;
}

export function FinalHeader({
  subtitle = "오늘도 좋은 하루 되세요 ☀️",
  onSharePress,
  sharing = false,
  onSavePress,
  saving = false,
}: FinalHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <View style={styles.copy}>
        <Text style={styles.title}>ohaasa</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.actions}>
        {onSavePress && (
          <TouchableOpacity
            onPress={onSavePress}
            disabled={saving || sharing}
            style={styles.iconButton}
          >
            <View style={styles.iconWrap}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.apricotDark} />
              ) : (
                <Feather name="download" size={18} color={colors.apricotDark} />
              )}
            </View>
          </TouchableOpacity>
        )}
        {onSharePress && (
          <TouchableOpacity
            onPress={onSharePress}
            disabled={sharing || saving}
            style={styles.iconButton}
          >
            <View style={styles.iconWrap}>
              {sharing ? (
                <ActivityIndicator size="small" color={colors.apricotDark} />
              ) : (
                <Feather name="share-2" size={18} color={colors.apricotDark} />
              )}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: "NotoSansKR_300Light",
    includeFontPadding: false,
    color: colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "NotoSansKR_400Regular",
    includeFontPadding: false,
    color: colors.textSoft,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 20,
  },
  iconButton: {
    padding: 6,
  },
  iconWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
