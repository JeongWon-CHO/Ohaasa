import { router, useFocusEffect } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/src/components/common/BottomSheet';
import { ResponsiveContainer } from '@/src/components/common/ResponsiveContainer';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { HoroscopeStrip } from '@/src/components/journal/HoroscopeStrip';
import { JournalHeader, formatTodayKo } from '@/src/components/journal/JournalHeader';
import { MonthCalendar, monthLabelKo } from '@/src/components/journal/MonthCalendar';
import { MoodFace } from '@/src/components/sketch/MoodFace';
import { SketchThumbnail } from '@/src/components/sketch/SketchThumbnail';
import { colors, layout, radius, spacing } from '@/src/constants/design';
import { useMonthJournals } from '@/src/hooks/useMonthJournals';
import { toDateString, toYearMonth } from '@/src/lib/dateKeys';

/**
 * 홈 = 이번 달 달력.
 *
 * 앱을 열었을 때 제일 먼저 보이는 것이 "내가 남긴 하루들"이어야 한다.
 * 운세는 지우지 않되 맨 위 한 줄로만 남긴다 — 날씨처럼, 눌러야 열리는 부가 정보다.
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();

  const today = toDateString(new Date());
  const [yearMonth, setYearMonth] = useState(() => toYearMonth(new Date()));
  const [focused, setFocused] = useState<string | null>(null);
  const { journals, refresh } = useMonthJournals(yearMonth);

  // 일기를 쓰고 돌아오면 달력에 바로 반영돼야 한다. 홈 탭은 언마운트되지 않으므로
  // 마운트 시점의 조회만으로는 갱신되지 않는다.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const outerWidth = Math.min(width, layout.maxContentWidth) - spacing.lg * 2;
  const focusedJournal = focused ? journals.get(focused) : null;
  const wroteToday = journals.has(today);

  return (
    <ScreenBackground>
      <ResponsiveContainer>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.md, paddingBottom: tabBarHeight + spacing.xl },
          ]}
        >
          <JournalHeader subtitle={formatTodayKo()} />

          <HoroscopeStrip />

          <MonthCalendar
            yearMonth={yearMonth}
            journals={journals}
            width={outerWidth}
            today={today}
            onChangeMonth={setYearMonth}
            onPressDay={(date, journal) => {
              // 기록이 있으면 펼쳐 보고, 없으면 그 날짜로 바로 쓰러 간다.
              // 단 미래 날짜는 쓸 수 없다 — 달력이 거짓말을 하게 된다.
              if (journal) setFocused(date);
              else if (date <= today) {
                router.push({ pathname: '/journal-write', params: { date } });
              }
            }}
          />

          <Pressable
            onPress={() => router.push('/journal-write')}
            style={styles.writeBtn}
          >
            <Text style={styles.writeText}>
              {wroteToday ? '오늘 일기 다시 보기' : '오늘 일기 쓰기'}
            </Text>
          </Pressable>
        </ScrollView>
      </ResponsiveContainer>

      <BottomSheet visible={focused !== null} onClose={() => setFocused(null)}>
        {focusedJournal && focused && (
          <View style={styles.detail}>
            <Text style={styles.detailDate}>
              {monthLabelKo(yearMonth)} {Number(focused.slice(8))}일
            </Text>
            <SketchThumbnail
              sketch={focusedJournal.sketch}
              size={outerWidth - spacing.xl}
            />
            <View style={styles.detailRow}>
              <MoodFace mood={focusedJournal.mood} size={30} />
              {focusedJournal.summary.length > 0 && (
                <Text style={styles.detailSummary}>{focusedJournal.summary}</Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                const date = focused;
                setFocused(null);
                router.push({ pathname: '/journal-write', params: { date } });
              }}
              style={styles.editBtn}
            >
              <Text style={styles.editText}>수정하기</Text>
            </Pressable>
          </View>
        )}
      </BottomSheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.lg,
  },
  writeBtn: {
    alignSelf: 'stretch',
    marginTop: spacing.xs,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.apricot,
  },
  writeText: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.cardSolid,
  },
  detail: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  detailDate: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailSummary: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
  },
  editBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editText: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
  },
});
