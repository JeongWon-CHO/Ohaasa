import { StyleSheet, Text, View } from 'react-native';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import type { MockHoroscope } from '@/src/constants/mockHoroscope';
import { colors, radius, shadows, spacing, typography } from '@/src/constants/design';
import { ZODIAC_MAP } from '@/src/constants/zodiac';

interface RankingRowProps {
  horoscope: MockHoroscope;
  isMine?: boolean;
}

function getPreview(advice: string): string {
  return advice.length > 42 ? `${advice.slice(0, 42)}...` : advice;
}

export function RankingRow({ horoscope, isMine = false }: RankingRowProps) {
  const zodiac = ZODIAC_MAP[horoscope.zodiacSign];

  return (
    <View style={[styles.row, shadows.card, isMine && styles.myRow]}>
      <View style={[styles.rankBox, isMine && styles.myRankBox]}>
        <Text style={[styles.rankNumber, isMine && styles.myRankNumber]}>
          {horoscope.rank}
        </Text>
        <Text style={[styles.rankLabel, isMine && styles.myRankLabel]}>위</Text>
      </View>

      <ConstellationBadge sign={horoscope.zodiacSign} size={52} />

      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Text style={[styles.name, isMine && styles.myName]}>{zodiac.ko}</Text>
          {isMine ? (
            <View style={styles.mineBadge}>
              <Text style={styles.mineBadgeText}>내 별자리</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.preview}>
          {getPreview(horoscope.advice)}
        </Text>
        <Text style={styles.point}>Lucky color · {horoscope.luckyColor}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,253,249,0.78)',
    padding: spacing.md,
  },
  myRow: {
    borderColor: colors.apricotDark,
    backgroundColor: 'rgba(240,184,154,0.26)',
  },
  rankBox: {
    width: 42,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.cream2,
  },
  myRankBox: {
    backgroundColor: colors.apricotDark,
  },
  rankNumber: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 21,
  },
  myRankNumber: {
    color: '#fff',
  },
  rankLabel: {
    color: colors.textSoft,
    fontSize: 10,
    fontWeight: '700',
  },
  myRankLabel: {
    color: '#fff',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  myName: {
    color: colors.apricotDark,
  },
  mineBadge: {
    borderRadius: radius.pill,
    backgroundColor: colors.apricotDark,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  mineBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  preview: {
    ...typography.body,
    color: colors.textMid,
    fontSize: 12,
  },
  point: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
});
