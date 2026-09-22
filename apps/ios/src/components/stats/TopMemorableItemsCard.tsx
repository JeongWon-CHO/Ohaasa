import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/constants/design';
import type { ItemCount } from '@/src/hooks/useReviewHistory';

interface TopMemorableItemsCardProps {
  items: ItemCount[];
}

export function TopMemorableItemsCard({ items }: TopMemorableItemsCardProps) {
  const maxCount = items[0]?.count ?? 1;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>자주 선택한 기억 항목</Text>
      <View style={styles.rows}>
        {items.map(({ item, count }) => (
          <View key={item} style={styles.row}>
            <Text style={styles.itemLabel} numberOfLines={1}>
              {item}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { flex: count }]} />
              <View style={{ flex: maxCount - count }} />
            </View>
            <Text style={styles.count}>{count}</Text>
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
  rows: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemLabel: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
    lineHeight: 18,
    width: 80,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cream3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  bar: {
    backgroundColor: 'rgba(240,184,154,0.8)',
  },
  count: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
    width: 20,
    textAlign: 'right',
  },
});
