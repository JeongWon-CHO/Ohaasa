import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { BottomSheet } from '@/src/components/common/BottomSheet';
import { ConstellationBadge } from '@/src/components/final/ConstellationBadge';
import { colors, radius, zodiacColors } from '@/src/constants/design';
import { ZODIAC_LIST, type ZodiacSign } from '@/src/constants/zodiac';

interface ZodiacFilterSheetProps {
  visible: boolean;
  selectedId: ZodiacSign | null;
  onClose: () => void;
  /** null이면 필터 해제(전체 보기). 이미 선택된 별자리를 다시 누르면 null이 전달된다. */
  onSelect: (sign: ZodiacSign | null) => void;
}

export function ZodiacFilterSheet({
  visible,
  selectedId,
  onClose,
  onSelect,
}: ZodiacFilterSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>별자리로 보기</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Feather name="x" size={20} color={colors.textSoft} />
        </Pressable>
      </View>
      <Text style={styles.description}>
        궁금한 별자리의 답변만 모아볼 수 있어요.{'\n'}선택하지 않으면 전체 답변이 보여요.
      </Text>

      <View style={styles.grid}>
        {ZODIAC_LIST.map((zodiac) => {
          const selected = zodiac.sign === selectedId;
          return (
            <Pressable
              key={zodiac.sign}
              style={({ pressed }) => [
                styles.item,
                { backgroundColor: `${zodiacColors[zodiac.sign]}40` },
                selected && styles.itemSelected,
                pressed && styles.itemPressed,
              ]}
              onPress={() => onSelect(selected ? null : zodiac.sign)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <View
                style={[
                  styles.badgeWrap,
                  { backgroundColor: `${zodiacColors[zodiac.sign]}80` },
                ]}
              >
                <ConstellationBadge sign={zodiac.sign} size={44} />
              </View>
              <Text style={[styles.itemLabel, selected && styles.itemLabelSelected]}>
                {zodiac.ko}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontFamily: 'NotoSansKR_700Bold',
    color: colors.text,
    lineHeight: 25,
  },
  description: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  item: {
    width: '31%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: colors.apricotDark,
    backgroundColor: 'rgba(217,138,104,0.10)',
  },
  itemPressed: {
    backgroundColor: 'rgba(44,36,22,0.05)',
  },
  badgeWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemLabel: {
    fontSize: 12,
    lineHeight: 17,
    includeFontPadding: false,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
  },
  itemLabelSelected: {
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.apricotDark,
  },
});
