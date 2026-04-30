import { Pressable, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { ZODIAC_LIST, type ZodiacSign } from '@/src/constants/zodiac';
import { colors } from '@/src/constants/design';

interface ZodiacPickerProps {
  value: ZodiacSign | null;
  onChange: (zodiacSign: ZodiacSign) => void;
  disabled?: boolean;
}

export const ZODIAC_SIGN_COLORS: Record<ZodiacSign, string> = {
  aries:       '#F9C5BD',
  taurus:      '#C5E8C5',
  gemini:      '#FFF0B3',
  cancer:      '#C5D8F0',
  leo:         '#FFD9A0',
  virgo:       '#D5E8D0',
  libra:       '#E8D0F0',
  scorpio:     '#D0B8C8',
  sagittarius: '#FFD4A0',
  capricorn:   '#C8D8C8',
  aquarius:    '#A8D8EA',
  pisces:      '#B8D0F0',
};

const DATE_RANGES: Record<ZodiacSign, string> = {
  aries:       '3/21–4/19',
  taurus:      '4/20–5/20',
  gemini:      '5/21–6/21',
  cancer:      '6/22–7/22',
  leo:         '7/23–8/22',
  virgo:       '8/23–9/22',
  libra:       '9/23–10/23',
  scorpio:     '10/24–11/22',
  sagittarius: '11/23–12/21',
  capricorn:   '12/22–1/19',
  aquarius:    '1/20–2/18',
  pisces:      '2/19–3/20',
};

export function ZodiacPicker({ value, onChange, disabled = false }: ZodiacPickerProps) {
  return (
    <View style={styles.grid}>
      {ZODIAC_LIST.map((zodiac) => {
        const selected = zodiac.sign === value;
        const signColor = ZODIAC_SIGN_COLORS[zodiac.sign];

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={zodiac.sign}
            onPress={() => onChange(zodiac.sign)}
            style={({ pressed }) => [
              styles.card,
              selected && {
                backgroundColor: signColor,
                borderColor: 'rgba(217,138,104,0.40)',
                borderWidth: 2,
                shadowColor: signColor,
                shadowOpacity: 0.73,
                shadowRadius: 9,
                shadowOffset: { width: 0, height: 5 },
              },
              pressed && !disabled && styles.pressedCard,
              disabled && styles.disabledCard,
            ]}>
            {selected ? (
              <View style={styles.check}>
                <FontAwesome color="#fff" name="check" size={8} />
              </View>
            ) : null}

            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: selected
                    ? 'rgba(255,253,249,0.65)'
                    : `${signColor}80`,
                },
              ]}>
              <ConstellationBadge sign={zodiac.sign} size={44} />
            </View>

            <Text numberOfLines={1} style={[styles.name, selected && styles.selectedName]}>
              {zodiac.ko}
            </Text>
            <Text numberOfLines={1} style={[styles.date, selected && styles.selectedDate]}>
              {DATE_RANGES[zodiac.sign]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  card: {
    position: 'relative',
    width: '30.8%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(237,227,214,0.7)',
    borderRadius: 18,
    backgroundColor: 'rgba(255,253,249,0.80)',
    paddingTop: 11,
    paddingHorizontal: 6,
    paddingBottom: 10,
    gap: 5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2.5,
    shadowOffset: { width: 0, height: 1 },
  },
  pressedCard: {
    opacity: 0.76,
    transform: [{ scale: 0.98 }],
  },
  disabledCard: {
    opacity: 0.55,
  },
  check: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    backgroundColor: colors.apricotDark,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textMid,
    textAlign: 'center',
  },
  selectedName: {
    fontWeight: '500',
    color: colors.text,
  },
  date: {
    fontSize: 9,
    fontWeight: '400',
    color: colors.textSoft,
    textAlign: 'center',
  },
  selectedDate: {
    color: colors.textMid,
  },
});
