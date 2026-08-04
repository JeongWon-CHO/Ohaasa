import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/constants/design';
import type { ReviewSummary } from '@/src/hooks/useReviewHistory';

interface ReviewSummaryCardProps {
  summary: ReviewSummary;
}

const ITEMS: { key: keyof ReviewSummary; label: string }[] = [
  { key: 'totalDays', label: '리뷰 남긴 날' },
  { key: 'daysWithRating', label: '별점 남긴 날' },
  { key: 'daysWithNote', label: '메모 남긴 날' },
  { key: 'daysWithMemorableItems', label: '기억 항목 선택' },
];

export function ReviewSummaryCard({ summary }: ReviewSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>이달의 기록 요약</Text>
      <View style={styles.grid}>
        {ITEMS.map(({ key, label }) => (
          <View key={key} style={styles.item}>
            <Text style={styles.value}>{summary[key]}</Text>
            <Text style={styles.label}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
    lineHeight: 19,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    width: '50%',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  value: {
    fontSize: 22,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.apricotDark,
    lineHeight: 30,
    includeFontPadding: false,
  },
  label: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 17,
  },
});
