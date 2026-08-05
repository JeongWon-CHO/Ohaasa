import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { colors, spacing } from '@/src/constants/design';
import { useReviewHistory } from '@/src/hooks/useReviewHistory';
import { NoteArchiveCard } from './NoteArchiveCard';
import { RatingDistributionCard } from './RatingDistributionCard';
import { ReviewCalendar } from './ReviewCalendar';
import { ReviewDetailSheet } from './ReviewDetailSheet';
import { ReviewSummaryCard } from './ReviewSummaryCard';
import { TopMemorableItemsCard } from './TopMemorableItemsCard';

function getTodayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export function ReviewHistoryTab() {
  const tabBarHeight = useBottomTabBarHeight();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { reviewsByDate, summary, ratingDist, topItems, noteArchive, loading } =
    useReviewHistory(year, month);

  const todayStr = getTodayStr();
  const canGoNext = !(year === today.getFullYear() && month === today.getMonth() + 1);
  const sheetReview = selectedDate ? (reviewsByDate[selectedDate] ?? null) : null;
  const hasAnyRating = Object.values(ratingDist).some((v) => v > 0);

  function prevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (!canGoNext) return;
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={styles.loadingText}>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <ReviewCalendar
          year={year}
          month={month}
          reviewsByDate={reviewsByDate}
          todayStr={todayStr}
          onDayPress={setSelectedDate}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
          canGoNext={canGoNext}
        />

        <ReviewSummaryCard summary={summary} />

        {hasAnyRating && <RatingDistributionCard dist={ratingDist} />}
        {topItems.length > 0 && <TopMemorableItemsCard items={topItems} />}
        {noteArchive.length > 0 && <NoteArchiveCard notes={noteArchive} />}

        {summary.totalDays === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>이달에 남긴 기록이 없어요</Text>
            <Text style={styles.emptyBody}>오늘의 운세를 보고 리뷰를 남겨보세요</Text>
          </View>
        )}
      </ScrollView>

      <ReviewDetailSheet
        visible={selectedDate !== null}
        date={selectedDate}
        review={sheetReview}
        onClose={() => setSelectedDate(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  list: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 22,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'NotoSansKR_400Regular',
    color: colors.text,
    lineHeight: 22,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: 'NotoSansKR_300Light',
    color: colors.textSoft,
    lineHeight: 20,
  },
});
