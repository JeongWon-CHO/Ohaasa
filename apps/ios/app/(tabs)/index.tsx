import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
} from "react-native";

import { ResponsiveContainer } from "@/src/components/common/ResponsiveContainer";
import { ScreenBackground } from "@/src/components/final/ScreenBackground";
import { DailyPrompt } from "@/src/components/journal/DailyPrompt";
import { HoroscopeStrip } from "@/src/components/journal/HoroscopeStrip";
import { FinalHeader } from "@/src/components/final/FinalHeader";
import { MonthCalendar } from "@/src/components/journal/MonthCalendar";
import { colors, layout, radius, spacing } from "@/src/constants/design";
import { useMonthJournals } from "@/src/hooks/useMonthJournals";
import { formatTodayKo, toDateString, toYearMonth } from "@/src/lib/dateKeys";

/**
 * 홈 = 이번 달 달력.
 *
 * 앱을 열었을 때 제일 먼저 보이는 것이 "내가 남긴 하루들"이어야 한다.
 * 운세는 지우지 않되 맨 위 한 줄로만 남긴다 — 날씨처럼, 눌러야 열리는 부가 정보다.
 */
export default function HomeScreen() {
  const { width } = useWindowDimensions();

  const today = toDateString(new Date());
  const [yearMonth, setYearMonth] = useState(() => toYearMonth(new Date()));
  const { journals, refresh } = useMonthJournals(yearMonth);
  // 새로고침 횟수. 탭이 살아 있는 동안만 유지되면 충분해서 저장하지 않는다.
  const [promptOffset, setPromptOffset] = useState(0);

  // 일기를 쓰고 돌아오면 달력에 바로 반영돼야 한다. 홈 탭은 언마운트되지 않으므로
  // 마운트 시점의 조회만으로는 갱신되지 않는다.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const outerWidth = Math.min(width, layout.maxContentWidth) - spacing.lg * 2;
  const wroteToday = journals.has(today);

  return (
    <ScreenBackground deco="starfield">
      <ResponsiveContainer>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            // 상단 안전영역은 FinalHeader가, 바닥은 탭바가 차지하는 레이아웃 공간이 이미 처리한다.
            { paddingBottom: spacing.xl },
          ]}
        >
          <FinalHeader subtitle={formatTodayKo()} bleed />

          <HoroscopeStrip />

          <MonthCalendar
            yearMonth={yearMonth}
            journals={journals}
            width={outerWidth}
            today={today}
            onChangeMonth={setYearMonth}
            onPressDay={(date, journal) => {
              // 기록이 있으면 읽기 화면으로, 없으면 그 날짜로 바로 쓰러 간다.
              // 단 미래 날짜는 쓸 수 없다 — 달력이 거짓말을 하게 된다.
              if (journal)
                router.push({ pathname: "/journal-view", params: { date } });
              else if (date <= today) {
                router.push({ pathname: "/journal-write", params: { date } });
              }
            }}
          />

          {/* 질문과 버튼은 한 덩어리다 — 질문을 읽고 바로 누르는 흐름.
              이미 오늘을 남겼으면 질문은 그대로 두되 새로고침만 없앤다. */}
          <DailyPrompt
            date={today}
            offset={promptOffset}
            onShuffle={
              wroteToday ? undefined : () => setPromptOffset((n) => n + 1)
            }
          />

          <Pressable
            onPress={() =>
              router.push(
                wroteToday
                  ? { pathname: "/journal-view", params: { date: today } }
                  : { pathname: "/journal-write", params: { date: today } },
              )
            }
            style={styles.writeBtn}
          >
            <Text style={styles.writeText}>
              {wroteToday ? "오늘 일기 다시 보기" : "오늘 일기 쓰기"}
            </Text>
          </Pressable>
        </ScrollView>
      </ResponsiveContainer>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.lg,
  },
  // 화면 폭을 꽉 채우면 '섹션-섹션-바' 리듬이 되어 답답하다.
  // 글자 길이에 맞춰 줄이고 가운데에 띄운다.
  writeBtn: {
    alignSelf: "center",
    // 컨테이너 gap(16) 위에 더 얹는 값이다 — 질문을 읽고 잠깐 생각할 틈을 준다.
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.pill,
    alignItems: "center",
    backgroundColor: colors.action,
  },
  writeText: {
    fontSize: 14,
    fontFamily: "NotoSansKR_400Regular",
    color: colors.actionText,
  },
});
