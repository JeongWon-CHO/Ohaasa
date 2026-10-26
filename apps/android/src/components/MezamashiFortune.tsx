import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';
import type { MezamashiHoroscope } from '@ohaasa/shared/types/mezamashi';
import { ZODIAC_MAP } from '@ohaasa/shared/constants/zodiac';

import { HoroscopeCard } from '@/src/components/HoroscopeCard';
import { DatePill } from '@/src/components/final/DatePill';
import { FinalCard } from '@/src/components/final/FinalCard';
import { ZodiacHeroCircle } from '@/src/components/final/ZodiacHeroCircle';
import { colors } from '@/src/constants/design';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof Feather>['name'];
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name={icon} size={16} color={colors.apricotDark} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} lineBreakStrategyIOS="hangul-word">
        {value}
      </Text>
    </View>
  );
}

export function MezamashiFortune({
  horoscope,
  showHeading = true,
}: {
  horoscope: MezamashiHoroscope;
  showHeading?: boolean;
}) {
  const [year, month, day] = horoscope.date.split('-').map(Number);
  // 요일은 날짜 자체로 계산한다. 기기의 시간대와 무관하게 방송일을 표시한다.
  const broadcastWeekday = ['일', '월', '화', '수', '목', '금', '토'][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ];
  const extra = horoscope.extra_advice_ko ?? horoscope.extra_advice;
  const person = horoscope.lucky_person_ko ?? horoscope.lucky_person;
  const menu = horoscope.lucky_menu_ko ?? horoscope.lucky_menu;
  const hasExtra = Boolean(extra || person || menu);

  return (
    <View>
      {showHeading && (
        <>
          <View style={styles.date}>
            <DatePill
              dateText={`${year}년 ${month}월 ${day}일 (${broadcastWeekday}) 메자마시`}
            />
          </View>
          <ZodiacHeroCircle
            zodiac={ZODIAC_MAP[horoscope.zodiac_sign]}
            rankPillText={`별자리 운세 ${horoscope.rank}위`}
          />
        </>
      )}
      <HoroscopeCard
        advice={horoscope.advice_ko ?? horoscope.advice}
        style={styles.fortune}
      />

      <FinalCard style={styles.card}>
        <Text style={styles.cardTitle}>오늘의 행운</Text>
        <InfoRow
          icon="gift"
          label="행운 포인트"
          value={horoscope.lucky_point_ko ?? horoscope.lucky_point}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="sun"
          label="행운의 색상"
          value={horoscope.lucky_color_ko ?? horoscope.lucky_color}
        />
      </FinalCard>

      {hasExtra && (
        <FinalCard style={[styles.card, styles.extraCard]}>
          <Text style={styles.cardTitle}>
            {horoscope.rank === 12
              ? '행운을 더하는 작은 실천'
              : '좋은 흐름을 이어가세요'}
          </Text>
          <InfoRow
            icon="star"
            label={horoscope.rank === 12 ? '행운 행동' : '오늘의 조언'}
            value={extra}
          />
          {extra && (person || menu) ? <View style={styles.divider} /> : null}
          <InfoRow icon="users" label="행운의 인물" value={person} />
          {person && menu ? <View style={styles.divider} /> : null}
          <InfoRow icon="coffee" label="행운의 메뉴" value={menu} />
        </FinalCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  date: { marginHorizontal: 28, marginTop: 18 },
  fortune: { marginHorizontal: 24, marginTop: 24 },
  card: {
    marginHorizontal: 24,
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  extraCard: { backgroundColor: 'rgba(255,248,235,0.8)' },
  cardTitle: {
    fontFamily: 'NotoSansKR_500Medium',
    fontSize: 12,
    lineHeight: 20,
    color: colors.textMid,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 5,
  },
  rowIcon: { paddingTop: 2 },
  label: {
    fontFamily: 'NotoSansKR_400Regular',
    fontSize: 12,
    lineHeight: 21,
    color: colors.textSoft,
    width: 76,
  },
  value: {
    flex: 1,
    fontFamily: 'NotoSansKR_400Regular',
    fontSize: 13,
    lineHeight: 21,
    color: colors.text,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cream3,
    marginVertical: 6,
  },
});
