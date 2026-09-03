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
import { colors, layout, spacing, typography } from "@/src/constants/design";

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
  /**
   * 상단 안전영역을 이 헤더가 직접 먹을지.
   *
   * 컨테이너가 이미 인셋을 준 화면에서는 꺼야 한다 — 보관함은 sticky 월 헤더가
   * 상태바에 붙지 않게 리스트 **바깥**에 인셋을 주고 있어서, 여기서 또 주면 이중이 된다.
   */
  withTopInset?: boolean;
  /**
   * 본문 여백(`spacing.lg`)이 걸린 스크롤 컨테이너 **안에** 놓일 때 켠다.
   *
   * 이 헤더는 자기 좌우 여백(`layout.headerPaddingH` = 28)을 갖는데, 부모가 이미 16을 주고
   * 있으면 44가 되어 제목만 안쪽으로 밀린다. 그만큼 되물어 다른 화면과 시작점을 맞춘다.
   * 컨테이너에 좌우 여백이 없는 화면(커뮤니티)은 켜면 안 된다.
   */
  bleed?: boolean;
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
  withTopInset = true,
  bleed = false,
}: FinalHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.header,
        { paddingTop: (withTopInset ? insets.top : 0) + 12 },
        bleed && styles.bleed,
      ]}
    >
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
    // 부모가 가운데 정렬이어도(홈 스크롤 컨테이너) 헤더는 폭을 꽉 채워야 한다.
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: layout.headerPaddingH,
  },
  bleed: {
    marginHorizontal: -spacing.lg,
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
