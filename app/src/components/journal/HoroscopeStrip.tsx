import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { ZODIAC_SIGN_COLORS } from '@/src/components/ZodiacPicker';
import { colors, radius, spacing } from '@/src/constants/design';
import { useAllHoroscopes } from '@/src/hooks/useHoroscope';
import { useZodiac } from '@/src/hooks/useZodiac';

/**
 * 홈 맨 위에 날씨처럼 얹는 한 줄짜리 운세.
 *
 * 운세를 지우지 않되 위계를 확실히 낮추는 자리다 — 화면을 차지하지 않고,
 * 눌러야 전체가 열린다. 그래서 여기서는 한 줄만 보여주고 나머지는 /horoscope로 넘긴다.
 *
 * 네트워크가 실패해도 아무것도 그리지 않는다. 이 줄이 달력 렌더를 막으면 안 된다
 * (→ CLAUDE.md "네트워크 실패는 운세 조회를 막지 않는다").
 */

function firstLine(text: string, max = 40): string {
  const line = text.split('\n')[0].trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
}

export function HoroscopeStrip() {
  const { zodiacSign } = useZodiac();
  const { horoscopes, loading } = useAllHoroscopes();

  // 별자리를 아직 안 골랐다면 설정으로 유도한다. 온보딩에서 건너뛸 수 있으므로
  // 이 상태가 정상적으로 존재한다.
  if (!zodiacSign) {
    return (
      <Pressable style={styles.strip} onPress={() => router.push('/(tabs)/settings')}>
        <View style={[styles.badge, { backgroundColor: colors.cream2 }]}>
          <ConstellationBadge size={20} />
        </View>
        <Text style={styles.muted}>별자리를 설정하면 오늘의 운세를 볼 수 있어요</Text>
        <Feather name="chevron-right" size={14} color={colors.textSoft} />
      </Pressable>
    );
  }

  const horoscope = horoscopes.find((h) => h.zodiac_sign === zodiacSign) ?? null;
  if (loading || !horoscope) return null;

  const advice = horoscope.advice_ko ?? horoscope.advice;

  return (
    <Pressable style={styles.strip} onPress={() => router.push('/horoscope')}>
      {/* 이모지는 OS 폰트라 통제가 안 된다 — 앱이 쓰는 별자리 원형 아이콘으로 통일한다. */}
      <View style={[styles.badge, { backgroundColor: ZODIAC_SIGN_COLORS[zodiacSign] }]}>
        <ConstellationBadge sign={zodiacSign} size={20} />
      </View>
      <View style={styles.rank}>
        <Text style={styles.rankText}>{horoscope.rank}위</Text>
      </View>
      <Text style={styles.advice} numberOfLines={1}>
        {firstLine(advice)}
      </Text>
      <Feather name="chevron-right" size={14} color={colors.textSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rank: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.segmentTrack,
  },
  rankText: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.apricotDark,
  },
  advice: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
  },
  muted: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
  },
});
