import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/src/components/common/BottomSheet';
import { colors, radius, spacing } from '@/src/constants/design';
import { ZODIAC_MAP } from '@/src/constants/zodiac';
import type { DailyReview } from '@/src/lib/dailyReviews';

interface ReviewDetailSheetProps {
  visible: boolean;
  date: string | null;
  review: DailyReview | null;
  onClose: () => void;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${dow})`;
}

export function ReviewDetailSheet({ visible, date, review, onClose }: ReviewDetailSheetProps) {
  function handleEdit() {
    if (!date) return;
    onClose();
    router.push({ pathname: '/daily-review', params: { date } });
  }

  const zodiac = review ? ZODIAC_MAP[review.zodiacSign] : null;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {date && (
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.content}>
            <Text style={styles.dateLabel}>{formatDate(date)}</Text>

            {review ? (
              <>
                <View style={styles.metaRow}>
                  {zodiac && (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>
                        {zodiac.ko}
                      </Text>
                    </View>
                  )}
                  {review.horoscopeRank != null && (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>운세 {review.horoscopeRank}위</Text>
                    </View>
                  )}
                </View>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <FontAwesome5
                      key={n}
                      name="star"
                      size={22}
                      solid={n <= review.rating}
                      color={n <= review.rating ? colors.yellow : 'rgba(156,139,120,0.2)'}
                    />
                  ))}
                </View>

                {review.memorableItems.length > 0 && (
                  <View style={styles.chipsRow}>
                    {review.memorableItems.map((item) => (
                      <View key={item} style={[styles.chip, styles.chipActive]}>
                        <Text style={[styles.chipText, styles.chipTextActive]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {review.note.trim().length > 0 && (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>{review.note.trim()}</Text>
                  </View>
                )}

                <Pressable
                  onPress={handleEdit}
                  style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.72 }]}
                >
                  <Text style={styles.editBtnText}>수정하기</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>이날 남긴 기록이 없어요</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  dateLabel: {
    fontSize: 16,
    fontFamily: 'NotoSansKR_600SemiBold',
    color: colors.text,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.cream3,
    backgroundColor: colors.cardSolid,
  },
  chipActive: {
    backgroundColor: 'rgba(240,184,154,0.18)',
    borderColor: colors.apricot,
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.textSoft,
    lineHeight: 18,
  },
  chipTextActive: {
    fontFamily: 'NotoSansKR_500Medium',
    color: colors.apricotDark,
  },
  noteBox: {
    backgroundColor: colors.cream2,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  noteText: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textMid,
    lineHeight: 22,
  },
  editBtn: {
    backgroundColor: colors.apricotDark,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  editBtnText: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_500Medium',
    color: '#FFFDF5',
    lineHeight: 22,
  },
  emptyWrap: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 22,
  },
});
