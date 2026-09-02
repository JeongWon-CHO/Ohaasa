import { useLocalSearchParams } from "expo-router";

import { DailyQuestionView } from "@/src/components/daily-question/DailyQuestionView";

/**
 * 오늘의 질문 — **파라미터 진입 전용** 스택 라우트.
 *
 * 파라미터 없는 오늘 자 진입은 커뮤니티 탭(`(tabs)/community.tsx`)이 맡는다.
 * 이 라우트가 남아 있는 이유는 기록 탭 "수정하기"(`ReviewDetailSheet`)가
 * 지난 날짜를 `date`·`mode`로 열기 때문이다 — 탭은 언마운트되지 않아
 * 같은 화면에 파라미터로 다시 진입시킬 수 없다.
 */
export default function DailyQuestionRoute() {
  const { date, mode } = useLocalSearchParams<{ date?: string; mode?: string }>();

  return <DailyQuestionView date={date} editMode={mode === "edit"} />;
}
