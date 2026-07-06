import { Image, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

import { type DailyCard } from '@/src/constants/dailyCards';
import { colors, radius, shadows, spacing, typography } from '@/src/constants/design';

interface TodayCardSectionProps {
  card: DailyCard | null;
  isOpened: boolean;
  onOpenPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function TodayCardSection({ card, isOpened, onOpenPress, style }: TodayCardSectionProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionLabel}>오늘의 카드</Text>

      <View style={[styles.callout, shadows.card]}>
        {isOpened && card ? (
          <OpenedCallout card={card} />
        ) : (
          <UnopenedCallout onOpenPress={onOpenPress} />
        )}
      </View>
    </View>
  );
}

function UnopenedCallout({ onOpenPress }: { onOpenPress: () => void }) {
  return (
    <>
      <Image
        source={require('@/assets/images/card/envelope.png')}
        style={styles.icon}
        resizeMode="contain"
      />
      <Text style={styles.calloutText} numberOfLines={1}>
        오늘의 운세 카드가 도착했어요!
      </Text>
      <TouchableOpacity style={styles.openButton} onPress={onOpenPress} activeOpacity={0.75}>
        <Text style={styles.openButtonText}>열기</Text>
      </TouchableOpacity>
    </>
  );
}

function OpenedCallout({ card }: { card: DailyCard }) {
  return (
    <>
      <View style={styles.openedDot} />
      <Text style={styles.openedName}>{card.name}</Text>
      <Text style={styles.openedSpell} numberOfLines={1}>
        {card.spell}
      </Text>
    </>
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

  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  // Unopened
  icon: {
    width: 32,
    height: 26,
    flexShrink: 0,
  },
  calloutText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textMid,
    lineHeight: 18,
  },
  openButton: {
    backgroundColor: 'rgba(240,184,154,0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  openButtonText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.apricotDark,
  },

  // Opened
  openedDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.apricot,
    flexShrink: 0,
  },
  openedName: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.text,
    flexShrink: 0,
  },
  openedSpell: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 18,
  },
});
