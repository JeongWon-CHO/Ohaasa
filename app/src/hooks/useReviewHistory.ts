import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getAllDailyReviews, type DailyReview } from '@/src/lib/dailyReviews';

export type ReviewSummary = {
  totalDays: number;
  daysWithRating: number;
  daysWithNote: number;
  daysWithMemorableItems: number;
};

export type RatingDist = Record<1 | 2 | 3 | 4 | 5, number>;
export type ItemCount = { item: string; count: number };

export function useReviewHistory(year: number, month: number) {
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      getAllDailyReviews().then((all) => {
        if (cancelled) return;
        const filtered = all.filter((r) => {
          const [y, m] = r.date.split('-').map(Number);
          return y === year && m === month;
        });
        setReviews(filtered);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [year, month]),
  );

  const reviewsByDate = useMemo(
    () => Object.fromEntries(reviews.map((r) => [r.date, r])),
    [reviews],
  );

  const summary: ReviewSummary = useMemo(
    () => ({
      totalDays: reviews.length,
      daysWithRating: reviews.filter((r) => r.rating > 0).length,
      daysWithNote: reviews.filter((r) => r.note.trim().length > 0).length,
      daysWithMemorableItems: reviews.filter((r) => r.memorableItems.length > 0).length,
    }),
    [reviews],
  );

  const ratingDist: RatingDist = useMemo(() => {
    const d: RatingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      const k = r.rating as 1 | 2 | 3 | 4 | 5;
      if (k >= 1 && k <= 5) d[k]++;
    });
    return d;
  }, [reviews]);

  const topItems: ItemCount[] = useMemo(() => {
    const counts: Record<string, number> = {};
    reviews.forEach((r) =>
      r.memorableItems.forEach((item) => {
        counts[item] = (counts[item] ?? 0) + 1;
      }),
    );
    return Object.entries(counts)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count);
  }, [reviews]);

  const noteArchive = useMemo(
    () =>
      [...reviews]
        .filter((r) => r.note.trim().length > 0)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [reviews],
  );

  return { reviews, reviewsByDate, summary, ratingDist, topItems, noteArchive, loading };
}
