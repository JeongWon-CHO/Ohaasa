import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/src/constants/design';
import { ZODIAC_MAP, type ZodiacSign } from '@/src/constants/zodiac';
import type { AnswerFeedScope } from '@/src/hooks/useAnswerFeed';

interface AnswerFeedTabsProps {
  scope: AnswerFeedScope;
  mySign: ZodiacSign | null;
  onChangeScope: (scope: AnswerFeedScope) => void;
  onOpenFilter: () => void;
}

export function AnswerFeedTabs({ scope, mySign, onChangeScope, onOpenFilter }: AnswerFeedTabsProps) {
  const isFiltered = scope !== 'all' && scope !== mySign;

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        <View style={styles.segmentTrack}>
          <Pressable
            onPress={() => onChangeScope('all')}
            style={[styles.segment, scope === 'all' && styles.segmentActive]}
          >
            <Text style={[styles.segmentLabel, scope === 'all' && styles.segmentLabelActive]}>
              전체
            </Text>
          </Pressable>
          <Pressable
            onPress={() => mySign && onChangeScope(mySign)}
            disabled={!mySign}
            style={[styles.segment, scope === mySign && styles.segmentActive]}
          >
            <Text style={[styles.segmentLabel, scope === mySign && styles.segmentLabelActive]}>
              내 별자리
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onOpenFilter}
          style={[styles.filterBtn, isFiltered && styles.filterBtnActive, shadows.card]}
        >
          <Feather name="filter" size={14} color={isFiltered ? '#FFFDF5' : colors.textMid} />
        </Pressable>
      </View>

      {isFiltered && (
        <View style={styles.filterChip}>
          <Text style={styles.filterChipText}>{ZODIAC_MAP[scope as ZodiacSign].ko} 답변만 보기</Text>
          <Pressable onPress={() => onChangeScope('all')} hitSlop={8}>
            <Feather name="x" size={13} color={colors.apricotDark} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  segmentTrack: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: colors.segmentTrack,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: colors.cardSolid,
    ...shadows.card,
  },
  segmentLabel: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.textMid,
    lineHeight: 18,
  },
  segmentLabelActive: {
    fontFamily: 'NotoSansKR_700Bold',
    color: colors.apricotDark,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSolid,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.apricotDark,
    borderColor: colors.apricotDark,
  },
  filterChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(240,184,154,0.18)',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.apricotDark,
  },
});
