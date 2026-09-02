import { LinearGradient } from "expo-linear-gradient";
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import { ActivityIndicator, StyleSheet } from "react-native";

import { DailyQuestionView } from "@/src/components/daily-question/DailyQuestionView";
import { colors, gradients } from "@/src/constants/design";
import { useHoroscopeDateContext } from "@/src/context/HoroscopeDateContext";

/**
 * 커뮤니티 탭 — 오늘(방송일)의 질문.
 *
 * 날짜를 로컬 "오늘"이 아니라 `latestDate`(오하아사 방송일)로 넘긴다.
 * `question_answers`가 `unique(question_date, device_id)`라, 크롤러가 늦거나
 * KST 05:59 이전인 시간대에 로컬 날짜로 쓰기 시작하면 안드로이드 v1과 **다른 키**에
 * 저장돼 같은 날 피드가 조용히 둘로 쪼개진다.
 *
 * 지난 날짜 수정은 이 탭이 아니라 스택 라우트(`daily-question.tsx`)가 맡는다.
 */
export default function CommunityScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { latestDate, latestDateLoading } = useHoroscopeDateContext();

  if (latestDateLoading) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.loading}>
        <ActivityIndicator color={colors.apricotDark} />
      </LinearGradient>
    );
  }

  // latestDate가 null이면(조회 실패) DailyQuestionView가 오늘 날짜로 대체한다.
  return (
    <DailyQuestionView
      date={latestDate ?? undefined}
      chrome={{ kind: "tab", tabBarHeight }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
