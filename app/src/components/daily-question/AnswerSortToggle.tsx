import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/constants/design';
import type { AnswerFeedSort } from '@/src/hooks/useAnswerFeed';

const OPTIONS: { value: AnswerFeedSort; label: string }[] = [
  { value: 'latest', label: '최신순' },
  { value: 'likes', label: '공감순' },
];

interface AnswerSortToggleProps {
  sort: AnswerFeedSort;
  onChangeSort: (sort: AnswerFeedSort) => void;
}

export function AnswerSortToggle({ sort, onChangeSort }: AnswerSortToggleProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => (
        <Pressable key={opt.value} onPress={() => onChangeSort(opt.value)} style={styles.btn}>
          <Text style={[styles.label, sort === opt.value && styles.labelActive]}>
            {opt.label}
          </Text>
          {sort === opt.value && <View style={styles.dot} />}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
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
});
