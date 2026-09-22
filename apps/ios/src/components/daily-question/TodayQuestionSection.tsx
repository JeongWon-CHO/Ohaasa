import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing, typography } from '@/src/constants/design';

interface TodayQuestionSectionProps {
  hasAnswered: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function TodayQuestionSection({ hasAnswered, onPress, style }: TodayQuestionSectionProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionLabel}>오늘의 질문</Text>

      <Pressable
        style={({ pressed }) => [styles.card, shadows.card, pressed && styles.cardPressed]}
        onPress={onPress}
      >
        <View style={styles.iconWrap}>
          <Feather name="help-circle" size={18} color={colors.apricotDark} />
        </View>

        <View style={styles.textWrap}>
          {hasAnswered ? (
            <>
              <Text style={styles.title}>오늘의 질문 구경하기</Text>
              <Text style={styles.subtitle}>내가 남긴 답변도 다시 볼 수 있어요</Text>
            </>
          ) : (
            <>
              <Text style={[styles.title, styles.titleDefault]}>오늘의 질문이 도착했어요</Text>
              <Text style={styles.subtitle}>내 생각을 먼저 남겨보세요</Text>
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
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.apricotDark,
    lineHeight: 19,
  },
  titleDefault: {
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 17,
  },
});
