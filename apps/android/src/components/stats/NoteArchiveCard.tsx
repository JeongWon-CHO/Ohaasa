import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/src/constants/design';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import type { DailyReview } from '@/src/lib/dailyReviews';

interface NoteArchiveCardProps {
  notes: DailyReview[];
}

function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${m}월 ${d}일`;
}

export function NoteArchiveCard({ notes }: NoteArchiveCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>한 줄 기록</Text>
      <View style={styles.list}>
        {notes.map((r, idx) => {
          const zodiac = ZODIAC_MAP[r.zodiacSign];
          return (
            <View key={r.id}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.entry}>
                <View style={styles.entryMeta}>
                  <Text style={styles.dateText}>{formatShort(r.date)}</Text>
                  <View style={styles.miniStars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <FontAwesome5
                        key={n}
                        name="star"
                        size={9}
                        solid={n <= r.rating}
                        color={n <= r.rating ? colors.yellow : 'rgba(156,139,120,0.2)'}
                      />
                    ))}
                  </View>
                  {zodiac && (
                    <Text style={styles.zodiacText}>
                      {zodiac.ko}
                    </Text>
                  )}
                </View>
                <Text style={styles.noteText}>{r.note.trim()}</Text>
              </View>
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
  list: {
    gap: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  entry: {
    gap: 6,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
    lineHeight: 18,
  },
  miniStars: {
    flexDirection: 'row',
    gap: 2,
  },
  zodiacText: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 17,
  },
  noteText: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textMid,
    lineHeight: 20,
  },
});
