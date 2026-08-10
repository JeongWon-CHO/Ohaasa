import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadows } from '@/src/constants/design';
import { type ZodiacSign } from '@/src/constants/zodiac';
import type { AnswerFeedTab } from '@/src/hooks/useAnswerFeed';

interface AnswerFeedTabsProps {
  tab: AnswerFeedTab;
  mySign: ZodiacSign | null;
  onChangeTab: (tab: AnswerFeedTab) => void;
}

// 별자리 필터가 걸려 있어도 이 세그먼트는 tab state만 따른다 —
// 필터 활성 여부는 AnswerSortToggle의 필터 버튼 색으로만 표시한다.
export function AnswerFeedTabs({ tab, mySign, onChangeTab }: AnswerFeedTabsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.segmentTrack}>
        <Pressable
          onPress={() => onChangeTab('all')}
          style={[styles.segment, tab === 'all' && styles.segmentActive]}
        >
          <Text style={[styles.segmentLabel, tab === 'all' && styles.segmentLabelActive]}>
            전체
          </Text>
        </Pressable>
        <Pressable
          onPress={() => mySign && onChangeTab('mine')}
          disabled={!mySign}
          style={[styles.segment, tab === 'mine' && styles.segmentActive]}
        >
          <Text style={[styles.segmentLabel, tab === 'mine' && styles.segmentLabelActive]}>
            내 별자리
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  segmentTrack: {
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
});
