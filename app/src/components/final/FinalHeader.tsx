import type { ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { APP_TITLE } from "@/src/constants/app";
import { colors, layout, typography } from "@/src/constants/design";

interface FinalHeaderProps {
  /** push된 화면에서 뒤로가기를 붙인다. 탭 화면에서는 넘기지 않는다. */
  onBackPress?: () => void;
  /**
   * 헤더 큰 글자. 운세 계열 push 화면은 영문 워드마크를 쓴다(`ohaasa` · `Ranking` …).
   * 비우면 앱 이름(`APP_TITLE`)이 들어가고, 비우는 건 탭 루트(설정)뿐이다.
   */
  title?: string;
  subtitle?: string;
  onSharePress?: () => void;
  sharing?: boolean;
  onSavePress?: () => void;
  saving?: boolean;
  rightSlot?: ReactNode;
}

export function FinalHeader({
  onBackPress,
  title,
  subtitle,
  onSharePress,
  sharing = false,
  onSavePress,
  saving = false,
  rightSlot,
}: FinalHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      {onBackPress && (
        <TouchableOpacity onPress={onBackPress} hitSlop={12} style={styles.backButton}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
      )}
      <View style={styles.copy}>
        <Text style={styles.title}>{title ?? APP_TITLE}</Text>
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
        {rightSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    /**
     * 광학 정렬. 헤더 패딩(28)은 아래 콘텐츠와 같은데도 셰브론이 더 안쪽에서 시작해 보인다 —
     * 30 박스에 22 아이콘이 가운데 정렬돼 +4, Feather `chevron-left`가 24 viewBox에서
     * x축 9~15만 차지해 +7, 합쳐서 잉크가 약 39pt에서 시작하기 때문이다.
     * 터치 영역(30×30)은 그대로 두고 눈에 보이는 획만 콘텐츠 선(28)에 맞춘다.
     */
    marginLeft: -10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: layout.headerPaddingH,
  },
  copy: {
    flex: 1,
  },
  title: typography.headerTitle,
  subtitle: {
    ...typography.headerSubtitle,
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
