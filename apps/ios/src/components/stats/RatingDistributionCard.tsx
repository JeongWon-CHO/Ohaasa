import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/constants/design';
import type { RatingDist } from '@/src/hooks/useReviewHistory';

interface RatingDistributionCardProps {
  dist: RatingDist;
}

const RATINGS = [5, 4, 3, 2, 1] as const;

export function RatingDistributionCard({ dist }: RatingDistributionCardProps) {
  const maxCount = Math.max(...Object.values(dist), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>별점 분포</Text>
      <View style={styles.rows}>
        {RATINGS.map((n) => {
          const count = dist[n];
          return (
            <View key={n} style={styles.row}>
              <View style={styles.stars}>
                {Array.from({ length: n }, (_, i) => (
                  <FontAwesome5 key={i} name="star" size={9} solid color={colors.yellow} />
                ))}
                {Array.from({ length: 5 - n }, (_, i) => (
                  <FontAwesome5
                    key={`e${i}`}
                    name="star"
                    size={9}
                    solid
                    color="rgba(156,139,120,0.18)"
                  />
                ))}
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { flex: count }]} />
                <View style={{ flex: maxCount - count }} />
              </View>
              <Text style={styles.count}>{count}</Text>
            </View>
          );
        })}
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
  stars: {
    flexDirection: 'row',
    gap: 2,
    width: 62,
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
    backgroundColor: colors.apricot,
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
