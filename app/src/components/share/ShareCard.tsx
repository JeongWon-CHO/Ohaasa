import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { colors, gradients } from '@/src/constants/design';
import type { ZodiacInfo } from '@/src/constants/zodiac';
import type { Horoscope } from '@/src/types/horoscope';

export const CARD_WIDTH = 360;
export const CARD_HEIGHT = 640;

interface ShareCardProps {
  horoscope: Horoscope;
  zodiac: ZodiacInfo;
}

function formatShareDate(dateStr: string, source: 'ohaasa' | 'gogo'): string {
  const [, month, day] = dateStr.split('-').map(Number);
  const label = source === 'gogo' ? '고고별자리' : '오하아사';
  return `${month}월 ${day}일 ${label}`;
}

export const ShareCard = forwardRef<View, ShareCardProps>(
  ({ horoscope, zodiac }, ref) => {
    const dateLabel = formatShareDate(horoscope.date, horoscope.source);
    const advice = horoscope.advice_ko ?? horoscope.advice;

    return (
      <View ref={ref} style={styles.wrapper}>
        <LinearGradient colors={gradients.screen} style={styles.card}>
          {/* 헤더 */}
          <Text style={styles.header}>✦  {dateLabel}  ✦</Text>

          {/* 순위 pill */}
          <LinearGradient
            colors={[colors.yellow, colors.apricot]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rankPill}
          >
            <Text style={styles.rankText}>오늘의 운세 {horoscope.rank}위</Text>
          </LinearGradient>

          {/* 별자리 뱃지 */}
          <View style={styles.badgeWrap}>
            <ConstellationBadge sign={zodiac.sign} size={90} />
          </View>

          {/* 별자리 이름 */}
          <Text style={styles.zodiacName}>{zodiac.ko}</Text>

          {/* 운세 텍스트 */}
          <View style={styles.adviceBox}>
            <Text style={styles.advice}>{advice}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 20,
  },
  header: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSoft,
    letterSpacing: 1.2,
  },
  rankPill: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 22,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFDF9',
    letterSpacing: 0.6,
  },
  badgeWrap: {
    marginVertical: 4,
  },
  zodiacName: {
    fontSize: 22,
    fontWeight: '300',
    color: colors.text,
    letterSpacing: 0.5,
  },
  adviceBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(255,253,249,0.75)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: '100%',
  },
  advice: {
    fontSize: 13,
    fontWeight: '300',
    color: colors.text,
    lineHeight: 24,
    textAlign: 'center',
  },
});
