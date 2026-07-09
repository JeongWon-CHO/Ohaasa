import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/constants/design';
import type { DailyReview } from '@/src/lib/dailyReviews';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

interface ReviewCalendarProps {
  year: number;
  month: number;
  reviewsByDate: Record<string, DailyReview>;
  todayStr: string;
  onDayPress: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  canGoNext: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function ReviewCalendar({
  year,
  month,
  reviewsByDate,
  todayStr,
  onDayPress,
  onPrevMonth,
  onNextMonth,
  canGoNext,
}: ReviewCalendarProps) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <Pressable onPress={onPrevMonth} hitSlop={12} style={styles.navBtn}>
          <Feather name="chevron-left" size={20} color={colors.textMid} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {year}년 {month}월
        </Text>
        <Pressable
          onPress={canGoNext ? onNextMonth : undefined}
          hitSlop={12}
          style={styles.navBtn}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={canGoNext ? colors.textMid : colors.cream3}
          />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text
            key={d}
            style={[styles.weekLabel, i === 0 && styles.sunText, i === 6 && styles.satText]}
          >
            {d}
          </Text>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((day, ci) => {
            if (!day) return <View key={`e-${ci}`} style={styles.cell} />;
            const dateStr = `${year}-${pad(month)}-${pad(day)}`;
            const hasReview = dateStr in reviewsByDate;
            const isToday = dateStr === todayStr;
            const isSun = ci === 0;
            const isSat = ci === 6;

            return (
              <Pressable
                key={dateStr}
                style={styles.cell}
                onPress={() => onDayPress(dateStr)}
              >
                <View
                  style={[
                    styles.dayCircle,
                    hasReview && styles.dayCircleReview,
                    isToday && !hasReview && styles.dayCircleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      hasReview && styles.dayTextReview,
                      !hasReview && isSun && styles.sunText,
                      !hasReview && isSat && styles.satText,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL_H = 40;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.text,
    lineHeight: 22,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 16,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayCircle: {
    width: CELL_H,
    height: CELL_H,
    borderRadius: CELL_H / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleReview: {
    backgroundColor: 'rgba(240,184,154,0.2)',
    borderWidth: 1.5,
    borderColor: colors.apricot,
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: colors.cream3,
  },
  dayText: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    lineHeight: 18,
    includeFontPadding: false,
  },
  dayTextReview: {
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.apricotDark,
  },
  sunText: { color: colors.trendDown },
  satText: { color: colors.skyDark },
});
