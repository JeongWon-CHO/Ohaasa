import { StyleSheet, Text, View } from 'react-native';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { colors, zodiacColors } from '@/src/constants/design';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import type { Horoscope } from '@/src/types/horoscope';

interface RankingRowProps {
  horoscope: Horoscope;
  isMine?: boolean;
}

// 1위 금, 2위 은, 3위 동 — HTML rankColor spec
const RANK_COLORS: Partial<Record<number, string>> = {
  1: '#C8922A',
  2: '#8A9BAA',
  3: '#B07A60',
};

function getRankColor(rank: number): string {
  return RANK_COLORS[rank] ?? colors.textSoft;
}

export function RankingRow({ horoscope, isMine = false }: RankingRowProps) {
  const zodiac = ZODIAC_MAP[horoscope.zodiac_sign];
  const signColor = zodiacColors[horoscope.zodiac_sign];
  const isTop3 = horoscope.rank <= 3;

  const shadowStyle = isMine
    ? {
        shadowColor: signColor,
        shadowOpacity: 0.80,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 5 },
        elevation: 5,
      }
    : {
        shadowColor: '#000' as const,
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      };

  return (
    <View
      style={[
        styles.row,
        isMine
          ? [styles.myRow, { backgroundColor: signColor }]
          : styles.normalRow,
        shadowStyle,
      ]}
    >
      {/* Rank number — plain text, no box. top3: 16px/700, else: 13px/500 */}
      <View style={styles.rankWrap}>
        <Text
          style={[
            styles.rankNumber,
            {
              fontSize: isTop3 ? 16 : 13,
              fontWeight: isTop3 ? '700' : '500',
              color: getRankColor(horoscope.rank),
            },
          ]}
        >
          {horoscope.rank}
        </Text>
      </View>

      {/* Zodiac circle — 38×38, bg: mine=white-tint / normal=signColor@50% */}
      <View
        style={[
          styles.circleWrap,
          {
            backgroundColor: isMine
              ? 'rgba(255,253,249,0.65)'
              : `${signColor}80`,
          },
        ]}
      >
        <ConstellationBadge sign={horoscope.zodiac_sign} size={32} />
      </View>

      {/* Copy — name + badge + preview */}
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Text style={[styles.name, isMine && styles.myName]}>{zodiac.ko}</Text>
          {isMine ? (
            <View style={styles.mineBadge}>
              <Text style={styles.mineBadgeText}>내 별자리</Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.preview,
            { color: isMine ? colors.textMid : colors.textSoft },
          ]}
        >
          {horoscope.advice_ko ?? horoscope.advice}
        </Text>
      </View>

      {/* 행운색 열 — 오하아사에는 해당 필드가 없어 주석 처리.
          추후 고고별자리 연동 Phase에서 복구 예정.
      <View style={styles.luckyCol}>
        <Text style={styles.luckyLabel}>행운색</Text>
        <Text
          style={[
            styles.luckyValue,
            { color: isMine ? colors.textMid : colors.textSoft },
          ]}
        >
          {horoscope.luckyColor}
        </Text>
      </View>
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  normalRow: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,253,249,0.82)',
  },
  myRow: {
    borderWidth: 2,
    borderColor: 'rgba(217,138,104,0.55)',
  },

  // Rank number
  rankWrap: {
    width: 26,
    alignItems: 'center',
    flexShrink: 0,
  },
  rankNumber: {
    // fontSize / fontWeight / color applied inline
  },

  // Zodiac circle
  circleWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // Copy
  copy: {
    flex: 1,
    minWidth: 0,
  },
  titleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginBottom: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.text,
  },
  myName: {
    fontWeight: '600',
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
    fontWeight: '700',
    letterSpacing: 0.54,
  },
  preview: {
    fontSize: 10.5,
    // color applied inline
  },

  // 행운색 열 스타일 — 오하아사에는 해당 필드가 없어 주석 처리.
  // 추후 고고별자리 연동 Phase에서 복구 예정.
  // luckyCol: {
  //   flexShrink: 0,
  //   alignItems: 'flex-end',
  // },
  // luckyLabel: {
  //   fontSize: 9,
  //   color: colors.textSoft,
  //   marginBottom: 1,
  // },
  // luckyValue: {
  //   fontSize: 10,
  //   fontWeight: '500',
  //   // color applied inline
  // },
});
