import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DatePill } from '@/src/components/final/DatePill';
import { FinalCard } from '@/src/components/final/FinalCard';
import { FinalHeader } from '@/src/components/final/FinalHeader';
import { RankingRow } from '@/src/components/final/RankingRow';
import { ScreenBackground } from '@/src/components/final/ScreenBackground';
import { colors, spacing, typography } from '@/src/constants/design';
import { MOCK_BROADCAST_DATE, MOCK_HOROSCOPES } from '@/src/constants/mockHoroscope';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import { useZodiac } from '@/src/hooks/useZodiac';

const COPY = {
  subtitle: '12개 별자리 오늘의 순위',
  broadcastLabel: 'BROADCAST',
  summaryLabel: 'ALL RANKINGS',
  summaryTitle: '오늘의 흐름을 한눈에',
  summaryBody: '가볍게 스크롤하면서 나와 주변 사람들의 별자리 흐름을 확인해보세요.',
};

const RANKED_HOROSCOPES = Object.values(MOCK_HOROSCOPES).sort(
  (a, b) => a.rank - b.rank,
);

export default function RankingsScreen() {
  const { zodiacSign } = useZodiac();
  const zodiac = zodiacSign ? ZODIAC_MAP[zodiacSign] : null;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FinalHeader subtitle={COPY.subtitle} />
        <DatePill dateText={MOCK_BROADCAST_DATE} label={COPY.broadcastLabel} />

        <FinalCard style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{COPY.summaryLabel}</Text>
          <Text style={styles.summaryTitle}>{COPY.summaryTitle}</Text>
          <Text style={styles.summaryBody}>
            {zodiac
              ? `${zodiac.ko}는 리스트에서 살구색으로 표시됩니다.`
              : COPY.summaryBody}
          </Text>
        </FinalCard>

        <View style={styles.list}>
          {RANKED_HOROSCOPES.map((horoscope) => (
            <RankingRow
              horoscope={horoscope}
              isMine={horoscope.zodiacSign === zodiacSign}
              key={horoscope.zodiacSign}
            />
          ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: 96,
  },
  summaryCard: {
    gap: spacing.sm,
  },
  summaryLabel: {
    ...typography.label,
  },
  summaryTitle: {
    ...typography.sectionTitle,
  },
  summaryBody: {
    ...typography.body,
    color: colors.textMid,
    lineHeight: 22,
  },
  list: {
    gap: spacing.md,
  },
  spacer: {
    minHeight: 20,
  },
});
