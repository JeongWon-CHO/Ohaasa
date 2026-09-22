import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadows, spacing } from '@/src/constants/design';
import type { AnswerFeedSort } from '@/src/hooks/useAnswerFeed';

const OPTIONS: { value: AnswerFeedSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'likes', label: '공감순' },
];

interface AnswerSortToggleProps {
  sort: AnswerFeedSort;
  onChangeSort: (sort: AnswerFeedSort) => void;
  isFiltered: boolean;
  onOpenFilter: () => void;
}

export function AnswerSortToggle({
  sort,
  onChangeSort,
  isFiltered,
  onOpenFilter,
}: AnswerSortToggleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.sortOptions}>
        {OPTIONS.map((opt) => (
          <Pressable key={opt.value} onPress={() => onChangeSort(opt.value)} style={styles.btn}>
            <Text style={[styles.label, sort === opt.value && styles.labelActive]}>
              {opt.label}
            </Text>
            {sort === opt.value && <View style={styles.dot} />}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onOpenFilter}
        style={[styles.filterBtn, isFiltered && styles.filterBtnActive, shadows.card]}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel="별자리 필터"
      >
        <Feather name="filter" size={14} color={isFiltered ? '#FFFDF5' : colors.textMid} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 4,
  },
  btn: {
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  label: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
    includeFontPadding: false,
  },
  labelActive: {
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.apricotDark,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.apricotDark,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSolid,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.apricotDark,
    borderColor: colors.apricotDark,
  },
});
