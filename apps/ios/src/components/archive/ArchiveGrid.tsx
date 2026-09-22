import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MoodFace } from '@/src/components/sketch/MoodFace';
import { SketchThumbnail } from '@/src/components/sketch/SketchThumbnail';
import { colors, radius, spacing } from '@/src/constants/design';
import type { DailyJournal } from '@/src/lib/journal';

/**
 * 칸 폭의 상한.
 *
 * `SketchThumbnail`은 90px(`TEXTURE_ABOVE`)을 넘으면 모눈과 질감을 살리려고
 * Skia `<Canvas>`로 그린다. 각 Canvas가 네이티브 뷰라 달력처럼 몇십 칸이면
 * 그 비용이 그대로 붙는데, 보관함은 스크롤할수록 칸이 계속 쌓인다.
 * 그래서 **넓은 화면에서 칸을 키우지 않고 열을 늘린다** — 아이패드도 마찬가지다.
 * 90이 아니라 88인 것은 반올림으로 경계에 걸치지 않게 하려는 여유다.
 */
export const MAX_CELL = 88;

export const GRID_GAP = spacing.sm;

/** 칸이 `MAX_CELL` 이하가 되는 가장 적은 열 수. 12는 사고 방지용 상한이다. */
export function columnsFor(innerWidth: number): number {
  let cols = 3;
  while (cols < 12 && (innerWidth - GRID_GAP * (cols - 1)) / cols > MAX_CELL) {
    cols += 1;
  }
  return cols;
}

export function cellSizeFor(innerWidth: number, columns: number): number {
  return Math.floor((innerWidth - GRID_GAP * (columns - 1)) / columns);
}

export function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

interface ArchiveCellProps {
  journal: DailyJournal;
  size: number;
  onPress: (date: string) => void;
}

const ArchiveCell = memo(function ArchiveCell({
  journal,
  size,
  onPress,
}: ArchiveCellProps) {
  return (
    <Pressable
      onPress={() => onPress(journal.date)}
      style={({ pressed }) => [{ width: size }, pressed && styles.pressed]}
    >
      <SketchThumbnail sketch={journal.sketch} size={size} />
      <View style={styles.caption}>
        <MoodFace mood={journal.mood} size={13} />
        <Text style={styles.day}>{Number(journal.date.slice(8))}</Text>
      </View>
    </Pressable>
  );
});

interface ArchiveRowProps {
  journals: DailyJournal[];
  size: number;
  onPress: (date: string) => void;
}

export const ArchiveRow = memo(function ArchiveRow({
  journals,
  size,
  onPress,
}: ArchiveRowProps) {
  return (
    <View style={styles.row}>
      {journals.map((journal) => (
        <ArchiveCell
          key={journal.date}
          journal={journal}
          size={size}
          onPress={onPress}
        />
      ))}
    </View>
  );
});

/**
 * 달 이름. 배경이 그라데이션이라 **띠가 아니라 알약으로 둔다** —
 * 화면 위아래로 배경색이 달라서 sticky 헤더에 불투명 띠를 깔면
 * 스크롤할수록 헤더 색만 제자리에 남아 경계가 드러난다.
 */
export const ArchiveMonthHeader = memo(function ArchiveMonthHeader({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{label}</Text>
        <Text style={styles.pillCount}>{count}장</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  pressed: {
    opacity: 0.6,
  },
  caption: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  day: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
  headerRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
  },
  pillCount: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
});
