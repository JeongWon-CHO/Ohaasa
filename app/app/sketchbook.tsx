import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { GRID_PAD, HandDrawnGrid } from '@/src/components/sketch/HandDrawnGrid';
import { MoodFace } from '@/src/components/sketch/MoodFace';
import { SketchThumbnail } from '@/src/components/sketch/SketchThumbnail';
import { colors, layout, radius, spacing } from '@/src/constants/design';
import { sampleJournalDraftForDate } from '@/src/constants/sampleDoodles';
import { daysInMonth, shiftMonth, toDateString, toYearMonth } from '@/src/lib/dateKeys';
import {
  clearAllJournals,
  loadMonthJournals,
  saveJournal,
  type DailyJournal,
} from '@/src/lib/journal';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/** 날짜 숫자가 차지하는 줄 높이. 칸 높이 = 이 값 + 정사각 그림. */
const DAY_ROW = 13;
const HEADER_ROW = 15;

function monthTitle(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${y}. ${MONTH_NAMES[m - 1]}`;
}

function monthLabelKo(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${y}년 ${m}월`;
}

/**
 * 종이 다이어리처럼 격자를 그어 한 달을 통째로 보여준다.
 * 칸을 따로 떨어진 카드로 두면 "보관함"이 되고, 선을 이어 붙이면 "달력"이 된다 —
 * 빠진 날이 표 안의 빈칸으로 읽히는 게 이 화면의 요점이다.
 */
export default function SketchbookScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [yearMonth, setYearMonth] = useState(() => toYearMonth(new Date()));
  const [journals, setJournals] = useState<Map<string, DailyJournal>>(new Map());
  const [focused, setFocused] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    // cancelled 플래그가 없으면 월을 빠르게 넘길 때 먼저 띄운 조회가 나중에 도착해
    // 지금 보고 있는 달을 덮어쓸 수 있다.
    let cancelled = false;
    loadMonthJournals(yearMonth).then((loaded) => {
      if (!cancelled) setJournals(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [yearMonth, reloadTick]);

  const days = daysInMonth(yearMonth);
  const today = toDateString(new Date());
  const pastDays = days.filter((d) => d <= today);
  const fillTarget = pastDays.length > 0 ? pastDays : days;

  const fillDummy = useCallback(async () => {
    // 며칠은 비워둔다. 매일 빠짐없이 쓴 달력은 현실이 아니라서
    // 빈칸이 섞인 모습으로 판단해야 한다.
    for (const date of fillTarget) {
      if (Math.random() < 0.22) continue;
      await saveJournal(date, sampleJournalDraftForDate(date));
    }
    reload();
  }, [fillTarget, reload]);

  const fillWithMine = useCallback(async () => {
    const mine = journals.get(today);
    if (!mine) {
      Alert.alert('오늘 일기가 없어요', '[오늘 일기 쓰기]로 먼저 한 장 남겨주세요.');
      return;
    }
    for (const date of fillTarget) {
      await saveJournal(date, {
        mood: mine.mood,
        sketch: mine.sketch,
        summary: mine.summary,
      });
    }
    reload();
  }, [journals, today, fillTarget, reload]);

  const clearAll = useCallback(async () => {
    await clearAllJournals();
    reload();
  }, [reload]);

  // 격자는 시트 안쪽(패딩 제외)에 들어가야 한다. 바깥 폭으로 잡으면 오른쪽이 잘린다.
  const outerWidth = Math.min(width, layout.maxContentWidth) - spacing.lg * 2;
  const sheetPadding = spacing.md;
  const cell = Math.floor((outerWidth - sheetPadding * 2) / 7);
  const gridWidth = cell * 7;
  const sketchSize = cell - 1;
  const cellHeight = DAY_ROW + sketchSize;

  // 1일을 요일 자리에 맞추고, 마지막 주의 남는 칸까지 채워 표를 직사각형으로 만든다.
  const [y, m] = yearMonth.split('-').map(Number);
  const leading = new Date(y, m - 1, 1).getDay();
  const slots: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...days,
  ];
  while (slots.length % 7 !== 0) slots.push(null);
  const weeks = Array.from({ length: slots.length / 7 }, (_, i) =>
    slots.slice(i * 7, i * 7 + 7),
  );

  const focusedJournal = focused ? journals.get(focused) : null;

  return (
    <ScreenBackground>
      <ResponsiveContainer>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.spacer} />
          <Pressable
            onPress={() => setYearMonth((v) => shiftMonth(v, -1))}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Feather name="chevron-left" size={18} color={colors.textMid} />
          </Pressable>
          <Pressable
            onPress={() => setYearMonth((v) => shiftMonth(v, 1))}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Feather name="chevron-right" size={18} color={colors.textMid} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          <View style={[styles.sheet, { width: gridWidth + sheetPadding * 2 }]}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{monthTitle(yearMonth)}</Text>
              <Text style={styles.count}>{journals.size}일</Text>
            </View>

            <View style={styles.grid}>
              {/* 격자선은 View 테두리가 아니라 손으로 그은 듯한 SVG 선으로 덮는다. */}
              <View style={styles.gridLines} pointerEvents="none">
                <HandDrawnGrid
                  columns={7}
                  cellWidth={cell}
                  headerHeight={HEADER_ROW}
                  rowHeight={cellHeight}
                  rows={weeks.length}
                  color={RULE}
                  seed={yearMonth}
                />
              </View>

              <View style={styles.weekRow}>
                {WEEKDAYS.map((w) => (
                  <View key={w} style={[styles.headCell, { width: cell }]}>
                    <Text style={styles.headText}>{w}</Text>
                  </View>
                ))}
              </View>

              {weeks.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {week.map((date, di) => {
                    if (!date) {
                      return (
                        <View
                          key={`e${di}`}
                          style={[styles.cell, { width: cell, height: cellHeight }]}
                        />
                      );
                    }
                    const journal = journals.get(date);
                    const day = Number(date.slice(8));
                    const isToday = date === today;
                    return (
                      <Pressable
                        key={date}
                        onPress={() => journal && setFocused(date)}
                        style={[styles.cell, { width: cell, height: cellHeight }]}
                      >
                        <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                          {day}
                        </Text>
                        {journal && (
                          <SketchThumbnail sketch={journal.sketch} size={sketchSize} bare />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>

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
            <Pressable
              onPress={() => {
                setFocused(null);
                router.push({ pathname: '/journal-write', params: { date: focused } });
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

const RULE = '#7A6854';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  spacer: { flex: 1 },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: colors.cardSolid,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
    letterSpacing: 1.5,
  },
  count: {
    fontSize: 10,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  grid: {
    position: 'relative',
  },
  // 선이 칸 내용 위에 오도록 겹쳐 놓는다. 아래에 두면 그림이 선을 가린다.
  gridLines: {
    position: 'absolute',
    top: -GRID_PAD,
    left: -GRID_PAD,
    zIndex: 1,
  },
  weekRow: {
    flexDirection: 'row',
  },
  headCell: {
    height: HEADER_ROW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    fontSize: 8,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    letterSpacing: 0.5,
  },
  cell: {
    overflow: 'hidden',
  },
  dayNum: {
    fontSize: 9,
    lineHeight: DAY_ROW,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    paddingLeft: 3,
  },
  dayNumToday: {
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.apricotDark,
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
  btnGhostText: {
    color: colors.textMid,
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
