import { AntDesign, Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { type DailyCard } from '@/src/constants/dailyCards';
import { colors, radius, shadows, spacing, typography } from '@/src/constants/design';

interface TodayCardSectionProps {
  card: DailyCard | null;
  isOpened: boolean;
  onOpenPress: () => void;
  onViewPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function TodayCardSection({ card, isOpened, onOpenPress, onViewPress, style }: TodayCardSectionProps) {
  const handlePress = isOpened ? onViewPress : onOpenPress;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionLabel}>오늘의 카드</Text>

      <Pressable
        style={({ pressed }) => [styles.card, shadows.card, pressed && styles.cardPressed]}
        onPress={handlePress}
      >
        <View style={styles.iconWrap}>
          <AntDesign name="crown" size={18} color={colors.apricotDark} />
        </View>

        <View style={styles.textWrap}>
          {isOpened && card ? (
            <>
              <Text style={styles.title}>{card.name}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{card.spell}</Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>오늘의 운세 카드가 도착했어요</Text>
              <Text style={styles.subtitle}>열어보면 오늘의 카드가 펼쳐져요</Text>
            </>
          )}
        </View>

        <Feather name="chevron-right" size={16} color={colors.textSoft} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginTop: 16,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  cardPressed: {
    opacity: 0.72,
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(240,184,154,0.5)',
    backgroundColor: 'rgba(240,184,154,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.apricotDark,
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 17,
  },
});
