import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ZodiacInfo } from '@ohaasa/shared/constants/zodiac';
import type { MezamashiHoroscope } from '@ohaasa/shared/types/mezamashi';
import { isTodayHoroscope } from '@ohaasa/shared/lib/horoscopeDate';

import { ZodiacHeroCircle } from '@/src/components/final/ZodiacHeroCircle';
import { colors, gradients } from '@/src/constants/design';

interface MezamashiShareCardProps {
  horoscope: MezamashiHoroscope;
  zodiac: ZodiacInfo;
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} lineBreakStrategyIOS="hangul-word">
        {value}
      </Text>
    </View>
  );
}

/** 순위별 추가 항목에 따라 높이를 늘려 전체 내용을 캡처한다. */
export const MezamashiShareCard = forwardRef<View, MezamashiShareCardProps>(
  function MezamashiShareCard({ horoscope, zodiac }, ref) {
    const [, month, day] = horoscope.date.split('-').map(Number);
    const extra = horoscope.extra_advice_ko ?? horoscope.extra_advice;
    const person = horoscope.lucky_person_ko ?? horoscope.lucky_person;
    const menu = horoscope.lucky_menu_ko ?? horoscope.lucky_menu;

    return (
      <View ref={ref} style={styles.wrapper} collapsable={false}>
        <LinearGradient colors={gradients.screen} style={styles.card}>
          <View style={styles.heading}>
            <Text style={styles.date}>
              ✦ {month}월 {day}일 메자마시 ✦
            </Text>
            <ZodiacHeroCircle
              zodiac={zodiac}
              rankPillText={`${isTodayHoroscope(horoscope.date) ? '오늘의 운세' : '그날의 운세'} ${horoscope.rank}위`}
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.advice} lineBreakStrategyIOS="hangul-word">
              {horoscope.advice_ko ?? horoscope.advice}
            </Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>오늘의 행운</Text>
            <InfoRow
              label="행운 포인트"
              value={horoscope.lucky_point_ko ?? horoscope.lucky_point}
            />
            <InfoRow
              label="행운의 색상"
              value={horoscope.lucky_color_ko ?? horoscope.lucky_color}
            />
          </View>

          {Boolean(extra || person || menu) && (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>
                {horoscope.rank === 12
                  ? '행운을 더하는 작은 실천'
                  : '좋은 흐름을 이어가세요'}
              </Text>
              <InfoRow
                label={horoscope.rank === 12 ? '행운 행동' : '오늘의 조언'}
                value={extra}
              />
              <InfoRow label="행운의 인물" value={person} />
              <InfoRow label="행운의 메뉴" value={menu} />
            </View>
          )}
        </LinearGradient>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    width: 360,
    flexShrink: 0,
  },
  card: {
    minHeight: 640,
    paddingHorizontal: 28,
    paddingVertical: 36,
    gap: 16,
  },
  heading: {
    alignItems: 'center',
    flexShrink: 0,
    marginBottom: 8,
  },
  date: {
    fontFamily: 'NotoSansKR_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSoft,
    textAlign: 'center',
    letterSpacing: 1,
  },
  panel: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: 'rgba(255,253,249,0.75)',
    padding: 16,
    gap: 10,
  },
  advice: {
    fontFamily: 'NotoSansKR_300Light',
    fontSize: 12,
    lineHeight: 21,
    color: colors.textMid,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: 'NotoSansKR_500Medium',
    fontSize: 11,
    lineHeight: 18,
    color: colors.textMid,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flexShrink: 0,
  },
  label: {
    width: 70,
    flexShrink: 0,
    fontFamily: 'NotoSansKR_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: colors.textSoft,
  },
  value: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'NotoSansKR_400Regular',
    fontSize: 11,
    lineHeight: 18,
    color: colors.textMid,
    textAlign: 'right',
  },
});
