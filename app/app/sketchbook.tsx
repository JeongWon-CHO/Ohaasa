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
import { SketchThumbnail } from '@/src/components/sketch/SketchThumbnail';
import { colors, radius, spacing } from '@/src/constants/design';
import { sampleSketchForDate } from '@/src/constants/sampleDoodles';
import { countPoints, type Sketch } from '@/src/lib/sketch';
import {
  clearAllSketches,
  daysInMonth,
  loadDaySketch,
  loadMonthSketches,
  saveDaySketch,
  toDateString,
  toYearMonth,
} from '@/src/lib/sketchbook';

/**
 * 4열은 "보관함", 7열은 "달력". 같은 데이터를 두 배치로 놓고 비교하려고 토글로 뒀다.
 * 7열에서는 칸이 절반 크기가 되므로 획이 많은 그림이 뭉개지는지가 여기서 갈린다.
 */
const COLUMN_OPTIONS = [4, 7] as const;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return toYearMonth(new Date(y, m - 1 + delta, 1));
}

function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return `${y}년 ${m}월`;
}

/** 달력 배치에서 1일 앞에 넣을 빈 칸 수 */
function leadingBlanks(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay();
}

export default function SketchbookScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [yearMonth, setYearMonth] = useState(() => toYearMonth(new Date()));
  const [sketches, setSketches] = useState<Map<string, Sketch>>(new Map());
  const [focused, setFocused] = useState<string | null>(null);
  const [columns, setColumns] = useState<number>(COLUMN_OPTIONS[0]);

  const [reloadTick, setReloadTick] = useState(0);
  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  useEffect(() => {
    // cancelled 플래그가 없으면 월을 빠르게 넘길 때 먼저 띄운 조회가 나중에 도착해
    // 지금 보고 있는 달을 덮어쓸 수 있다.
    let cancelled = false;
    loadMonthSketches(yearMonth).then((loaded) => {
      if (!cancelled) setSketches(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [yearMonth, reloadTick]);

  const days = daysInMonth(yearMonth);

  // 이번 달이면 오늘까지만 — 미래 날짜에 그림이 있으면 "쌓임"이 거짓말이 된다.
  const today = toDateString(new Date());
  const pastDays = days.filter((d) => d <= today);
  const fillTarget = pastDays.length > 0 ? pastDays : days;

  const fillDummy = useCallback(async () => {
    // 며칠은 비워둔다. 매일 빠짐없이 쓴 스케치북은 현실이 아니라서
    // 빈칸이 섞인 모습으로 판단해야 한다.
    for (const date of fillTarget) {
      if (Math.random() < 0.22) continue;
      await saveDaySketch(date, sampleSketchForDate(date));
    }
    reload();
  }, [fillTarget, reload]);

  /**
   * 샘플 도안은 획이 1~4개뿐이라 작은 칸에서 유리하게 보인다.
   * 실제로 그린 그림(획 수십~수백 개)이 같은 크기에서 어떻게 보이는지가 진짜 질문이라
   * 오늘 저장한 내 그림을 그대로 복제해 채워본다.
   */
  const fillWithMine = useCallback(async () => {
    const mine = await loadDaySketch(today);
    if (!mine) {
      Alert.alert(
        '오늘 그림이 없어요',
        '그림일기 프로토타입에서 [오늘 날짜로 저장]을 먼저 눌러주세요.',
      );
      return;
    }
    for (const date of fillTarget) await saveDaySketch(date, mine);
    reload();
  }, [today, fillTarget, reload]);

  const clearAll = useCallback(async () => {
    await clearAllSketches();
    reload();
  }, [reload]);

  const innerWidth = Math.min(width, 600) - spacing.xl * 2;
  const gap = columns === 7 ? spacing.xs : spacing.sm;
  const cell = (innerWidth - gap * (columns - 1)) / columns;
  const focusedSketch = focused ? sketches.get(focused) : null;
  const blanks = columns === 7 ? leadingBlanks(yearMonth) : 0;

  return (
    <ScreenBackground>
      <ResponsiveContainer>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>스케치북</Text>

          <View style={styles.spacer} />

          <View style={styles.segment}>
            {COLUMN_OPTIONS.map((n) => (
              <Pressable
                key={n}
                onPress={() => setColumns(n)}
                style={[styles.segmentBtn, columns === n && styles.segmentBtnActive]}
              >
                <Text
                  style={[styles.segmentText, columns === n && styles.segmentTextActive]}
                >
                  {n === 7 ? '달력' : '보관함'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.monthRow}>
          <Pressable
            onPress={() => setYearMonth((v) => shiftMonth(v, -1))}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Feather name="chevron-left" size={18} color={colors.textMid} />
          </Pressable>
          <Text style={styles.month}>{monthLabel(yearMonth)}</Text>
          <Pressable
            onPress={() => setYearMonth((v) => shiftMonth(v, 1))}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Feather name="chevron-right" size={18} color={colors.textMid} />
          </Pressable>
        </View>

        <Text style={styles.count}>{sketches.size}개의 그림</Text>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xxl },
          ]}
        >
          {columns === 7 && (
            <View style={[styles.grid, { gap }]}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={[styles.weekday, { width: cell }]}>
                  {w}
                </Text>
              ))}
            </View>
          )}

          <View style={[styles.grid, { gap }]}>
            {Array.from({ length: blanks }, (_, i) => (
              <View key={`blank-${i}`} style={{ width: cell }} />
            ))}

            {days.map((date) => {
              const sketch = sketches.get(date);
              const day = Number(date.slice(8));
              return (
                <Pressable
                  key={date}
                  onPress={() => sketch && setFocused(date)}
                  style={{ width: cell }}
                >
                  {sketch ? (
                    <SketchThumbnail sketch={sketch} size={cell} />
                  ) : (
                    <View style={[styles.empty, { width: cell, height: cell }]} />
                  )}
                  <Text style={[styles.day, !sketch && styles.dayEmpty]}>{day}</Text>
                </Pressable>
              );
            })}
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
        {focusedSketch && focused && (
          <View style={styles.sheet}>
            <Text style={styles.sheetDate}>
              {monthLabel(yearMonth)} {Number(focused.slice(8))}일
            </Text>
            <SketchThumbnail sketch={focusedSketch} size={innerWidth} />
            <Text style={styles.sheetMeta}>
              획 {focusedSketch.strokes.length} · 점 {countPoints(focusedSketch)}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  spacer: {
    flex: 1,
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
  segment: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    backgroundColor: colors.segmentTrack,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  segmentBtnActive: {
    backgroundColor: colors.cardSolid,
  },
  segmentText: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  segmentTextActive: {
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  month: {
    fontSize: 18,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
  },
  count: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    marginBottom: spacing.xs,
  },
  empty: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(156,139,120,0.25)',
  },
  day: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  dayEmpty: {
    color: 'rgba(156,139,120,0.45)',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    backgroundColor: colors.apricot,
  },
  btnGhost: {
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
  sheet: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  sheetDate: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  sheetMeta: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
});
