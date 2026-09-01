import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HandDrawnGrid, GRID_PAD } from '@/src/components/sketch/HandDrawnGrid';
import { SketchThumbnail } from '@/src/components/sketch/SketchThumbnail';
import { colors, radius, spacing } from '@/src/constants/design';
import { daysInMonth, shiftMonth } from '@/src/lib/dateKeys';
import type { DailyJournal } from '@/src/lib/journal';

/**
 * 종이 다이어리처럼 격자를 그어 한 달을 통째로 보여준다.
 * 칸을 따로 떨어진 카드로 두면 "보관함"이 되고, 선을 이어 붙이면 "달력"이 된다 —
 * 빠진 날이 표 안의 빈칸으로 읽히는 게 이 화면의 요점이다.
 *
 * 홈 탭과 스케치북이 같은 달력을 쓰므로 컴포넌트로 뺐다.
 * 데이터 로딩은 하지 않는다 — 화면마다 언제 다시 읽을지가 다르기 때문이다.
 */

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/** 날짜 숫자가 차지하는 줄 높이. 칸 높이 = 이 값 + 정사각 그림. */
const DAY_ROW = 13;
const HEADER_ROW = 15;
const RULE = '#7A6854';

export function monthTitle(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${y}. ${MONTH_NAMES[m - 1]}`;
}

export function monthLabelKo(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${y}년 ${m}월`;
}

interface MonthCalendarProps {
  /** YYYY-MM */
  yearMonth: string;
  journals: Map<string, DailyJournal>;
  /** 바깥에서 쓸 수 있는 폭(패딩 제외 전) */
  width: number;
  /** YYYY-MM-DD — 숫자를 강조한다 */
  today: string;
  onChangeMonth?: (yearMonth: string) => void;
  onPressDay?: (date: string, journal: DailyJournal | undefined) => void;
}

export function MonthCalendar({
  yearMonth,
  journals,
  width,
  today,
  onChangeMonth,
  onPressDay,
}: MonthCalendarProps) {
  // 격자는 시트 안쪽(패딩 제외)에 들어가야 한다. 바깥 폭으로 잡으면 오른쪽이 잘린다.
  const sheetPadding = spacing.md;
  const cell = Math.floor((width - sheetPadding * 2) / 7);
  const gridWidth = cell * 7;
  const sketchSize = cell - 1;
  const cellHeight = DAY_ROW + sketchSize;

  // 1일을 요일 자리에 맞추고, 마지막 주의 남는 칸까지 채워 표를 직사각형으로 만든다.
  const [y, m] = yearMonth.split('-').map(Number);
  const leading = new Date(y, m - 1, 1).getDay();
  const slots: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...daysInMonth(yearMonth),
  ];
  while (slots.length % 7 !== 0) slots.push(null);
  const weeks = Array.from({ length: slots.length / 7 }, (_, i) =>
    slots.slice(i * 7, i * 7 + 7),
  );

  return (
    <View style={[styles.sheet, { width: gridWidth + sheetPadding * 2 }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{monthTitle(yearMonth)}</Text>

        {onChangeMonth ? (
          <View style={styles.nav}>
            <Pressable
              onPress={() => onChangeMonth(shiftMonth(yearMonth, -1))}
              hitSlop={12}
              style={styles.navBtn}
            >
              <Feather name="chevron-left" size={16} color={colors.textMid} />
            </Pressable>
            <Text style={styles.count}>{journals.size}일</Text>
            <Pressable
              onPress={() => onChangeMonth(shiftMonth(yearMonth, 1))}
              hitSlop={12}
              style={styles.navBtn}
            >
              <Feather name="chevron-right" size={16} color={colors.textMid} />
            </Pressable>
          </View>
        ) : (
          <Text style={styles.count}>{journals.size}일</Text>
        )}
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
              return (
                <Pressable
                  key={date}
                  onPress={() => onPressDay?.(date, journal)}
                  style={[styles.cell, { width: cell, height: cellHeight }]}
                >
                  <Text style={[styles.dayNum, date === today && styles.dayNumToday]}>
                    {Number(date.slice(8))}
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
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.paper,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
    letterSpacing: 1.5,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 10,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    minWidth: 24,
    textAlign: 'center',
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
});
