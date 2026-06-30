import { StyleSheet, Text, View } from 'react-native';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { colors, zodiacColors } from '@/src/constants/design';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import type { ZodiacSign } from '@/src/constants/zodiac';
import type { Trend } from '@/src/hooks/useHoroscopeTrends';

interface AverageRankRowProps {
  sign: ZodiacSign;
  averageRank: number;
  rank: number;
  trend: Trend;
  rankDiff: number;
  isMine: boolean;
  isComparing?: boolean;
  detailMode?: boolean;
}

const TREND_SYMBOL: Record<Trend, string> = {
  up: '▲',
  down: '▼',
  flat: '–',
};

function getTrendColor(trend: Trend): string {
  if (trend === 'up') return colors.trendUp;
  if (trend === 'down') return colors.trendDown;
  return colors.textSoft;
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

export function AverageRankRow({
  sign,
  averageRank,
  rank,
  trend,
  rankDiff,
  isMine,
  isComparing = false,
  detailMode = false,
}: AverageRankRowProps) {
  const zodiac = ZODIAC_MAP[sign];
  const signColor = zodiacColors[sign];

  return (
    <View
      style={[
        styles.row,
        isMine && { backgroundColor: signColor },
        isComparing && styles.rowComparing,
      ]}
    >
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
        {isComparing && (
          <View style={styles.comparingBadge}>
            <Text style={styles.comparingBadgeText}>비교중</Text>
          </View>
        )}
      </View>

      <View style={styles.trendWrap}>
        <Text style={[styles.trendSymbol, { color: getTrendColor(trend) }]}>{TREND_SYMBOL[trend]}</Text>
        {trend !== 'flat' && (
          <Text style={[styles.trendDiff, { color: getTrendColor(trend) }]}>{rankDiff}</Text>
        )}
      </View>
      <Text style={styles.average}>{detailMode ? averageRank.toFixed(1) : Math.round(averageRank)}위</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  rowComparing: {
    borderWidth: 1.5,
    borderColor: colors.skyDark,
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
  comparingBadge: {
    borderRadius: 6,
    backgroundColor: 'rgba(123,174,199,0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comparingBadgeText: {
    color: colors.skyDark,
    fontSize: 9,
    lineHeight: 12,
    fontFamily: 'NotoSansKR_700Bold',
    includeFontPadding: false,
    letterSpacing: 0.54,
  },
  trendWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    flexShrink: 0,
  },
  trendSymbol: {
    fontSize: 11,
    lineHeight: 18,
    includeFontPadding: false,
  },
  trendDiff: {
    fontSize: 10.5,
    lineHeight: 14,
    fontFamily: 'NotoSansKR_500Medium',
    includeFontPadding: false,
  },
  average: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: 'NotoSansKR_500Medium',
    includeFontPadding: false,
    color: colors.textMid,
    flexShrink: 0,
    minWidth: 32,
    textAlign: 'right',
  },
});
