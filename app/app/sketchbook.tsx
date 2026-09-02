import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
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
import { MonthCalendar, monthLabelKo } from '@/src/components/journal/MonthCalendar';
import { MoodFace } from '@/src/components/sketch/MoodFace';
import { SketchThumbnail } from '@/src/components/sketch/SketchThumbnail';
import { colors, layout, radius, spacing } from '@/src/constants/design';
import { sampleJournalDraftForDate } from '@/src/constants/sampleDoodles';
import { useMonthJournals } from '@/src/hooks/useMonthJournals';
import { daysInMonth, toDateString, toYearMonth } from '@/src/lib/dateKeys';
import { clearAllJournals, saveJournal } from '@/src/lib/journal';
import { countPoints } from '@/src/lib/sketch';

/** 개발용 화면 — 달력 자체는 홈 탭에 있고, 여기는 샘플 채우기·지우기 도구다. */
export default function SketchbookScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [yearMonth, setYearMonth] = useState(() => toYearMonth(new Date()));
  const [focused, setFocused] = useState<string | null>(null);
  const { journals, refresh } = useMonthJournals(yearMonth);

  const today = toDateString(new Date());
  const days = daysInMonth(yearMonth);
  const pastDays = days.filter((d) => d <= today);
  const fillTarget = pastDays.length > 0 ? pastDays : days;

  const fillDummy = useCallback(async () => {
    // 며칠은 비워둔다. 매일 빠짐없이 쓴 달력은 현실이 아니라서
    // 빈칸이 섞인 모습으로 판단해야 한다.
    for (const date of fillTarget) {
      if (Math.random() < 0.22) continue;
      await saveJournal(date, sampleJournalDraftForDate(date));
    }
    refresh();
  }, [fillTarget, refresh]);

  const fillWithMine = useCallback(async () => {
    const mine = journals.get(today);
    if (!mine) {
      Alert.alert('오늘 일기가 없어요', '홈에서 [오늘 일기 쓰기]로 먼저 한 장 남겨주세요.');
      return;
    }
    for (const date of fillTarget) {
      await saveJournal(date, {
        mood: mine.mood,
        sketch: mine.sketch,
        summary: mine.summary,
      });
    }
    refresh();
  }, [journals, today, fillTarget, refresh]);

  const clearAll = useCallback(async () => {
    await clearAllJournals();
    refresh();
  }, [refresh]);

  const outerWidth = Math.min(width, layout.maxContentWidth) - spacing.lg * 2;
  const focusedJournal = focused ? journals.get(focused) : null;

  return (
    <ScreenBackground>
      <ResponsiveContainer>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>샘플 데이터</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <MonthCalendar
            yearMonth={yearMonth}
            journals={journals}
            width={outerWidth}
            today={today}
            onChangeMonth={setYearMonth}
            onPressDay={(date, journal) => journal && setFocused(date)}
          />

          <View style={styles.actions}>
            <Pressable onPress={fillDummy} style={styles.btn}>
              <Text style={styles.btnText}>샘플로 채우기</Text>
            </Pressable>
            <Pressable onPress={fillWithMine} style={styles.btn}>
              <Text style={styles.btnText}>내 그림으로 채우기</Text>
            </Pressable>
          </View>
          <Pressable onPress={clearAll} style={[styles.btn, styles.btnGhost]}>
            <Text style={[styles.btnText, styles.btnGhostText]}>전부 지우기</Text>
          </Pressable>
        </ScrollView>
      </ResponsiveContainer>

      <BottomSheet visible={focused !== null} onClose={() => setFocused(null)}>
        {focusedJournal && focused && (
          <View style={styles.detail}>
            <Text style={styles.detailDate}>
              {monthLabelKo(yearMonth)} {Number(focused.slice(8))}일
            </Text>
            <SketchThumbnail sketch={focusedJournal.sketch} size={outerWidth - spacing.xl} />
            <View style={styles.detailRow}>
              <MoodFace mood={focusedJournal.mood} size={30} />
              {focusedJournal.summary.length > 0 && (
                <Text style={styles.detailSummary}>{focusedJournal.summary}</Text>
              )}
            </View>
            <Text style={styles.detailMeta}>
              획 {focusedJournal.sketch.strokes.length} · 점{' '}
              {countPoints(focusedJournal.sketch)}
            </Text>
          </View>
        )}
      </BottomSheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    alignSelf: 'stretch',
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.apricot,
  },
  btnGhost: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.cardSolid,
  },
  btnGhostText: { color: colors.textMid },
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
  detailMeta: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
});
