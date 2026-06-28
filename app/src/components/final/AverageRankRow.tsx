import { StyleSheet, Text, View } from 'react-native';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { colors, zodiacColors } from '@/src/constants/design';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import type { ZodiacSign } from '@/src/constants/zodiac';

interface AverageRankRowProps {
  sign: ZodiacSign;
  averageRank: number;
  rank: number;
  isMine: boolean;
}

// 1위 금, 2위 은, 3위 동 — RankingRow와 동일 규칙
const RANK_COLORS: Partial<Record<number, string>> = {
  1: '#C8922A',
  2: '#8A9BAA',
  3: '#B07A60',
};

function getRankColor(rank: number): string {
  return RANK_COLORS[rank] ?? colors.textSoft;
}

export function AverageRankRow({ sign, averageRank, rank, isMine }: AverageRankRowProps) {
  const zodiac = ZODIAC_MAP[sign];
  const signColor = zodiacColors[sign];

  return (
    <View style={[styles.row, isMine && { borderColor: signColor, backgroundColor: `${signColor}33` }]}>
      <View style={styles.rankWrap}>
        <Text style={[styles.rankNumber, { color: getRankColor(rank) }]}>{rank}</Text>
      </View>

      <View style={[styles.circleWrap, { backgroundColor: `${signColor}80` }]}>
        <ConstellationBadge sign={sign} size={30} />
      </View>

      <View style={styles.copy}>
        <Text style={styles.name}>{zodiac.ko}</Text>
        {isMine && (
          <View style={styles.mineBadge}>
            <Text style={styles.mineBadgeText}>내 별자리</Text>
          </View>
        )}
      </View>

      <Text style={styles.average}>{averageRank.toFixed(1)}위</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,253,249,0.6)',
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  rankWrap: {
    width: 20,
    alignItems: 'center',
    flexShrink: 0,
  },
  rankNumber: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'NotoSansKR_500Medium',
    includeFontPadding: false,
  },
  circleWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  copy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'NotoSansKR_400Regular',
    includeFontPadding: false,
    color: colors.text,
  },
  mineBadge: {
    borderRadius: 6,
    backgroundColor: 'rgba(255,253,249,0.80)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mineBadgeText: {
    color: colors.apricotDark,
    fontSize: 9,
    lineHeight: 12,
    fontFamily: 'NotoSansKR_700Bold',
    includeFontPadding: false,
    letterSpacing: 0.54,
  },
  average: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: 'NotoSansKR_500Medium',
    includeFontPadding: false,
    color: colors.textMid,
    flexShrink: 0,
  },
});
