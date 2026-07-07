import { useCallback, useEffect, useState } from 'react';

import type { ZodiacSign } from '@/src/constants/zodiac';
import {
  type DailyReview,
  type DailyReviewDraft,
  getDailyReview,
  upsertDailyReview,
} from '@/src/lib/dailyReviews';

type Params = {
  date: string | null;
  zodiacSign: ZodiacSign | null;
  horoscopeRank: number | null;
};

type UseDailyReviewResult = {
  form: DailyReviewDraft;
  setForm: React.Dispatch<React.SetStateAction<DailyReviewDraft>>;
  save: () => Promise<DailyReview | null>;
  isSaving: boolean;
  existingReview: DailyReview | null;
  isLoaded: boolean;
};

const EMPTY_DRAFT: DailyReviewDraft = {
  rating: null,
  memorableItems: [],
  note: '',
};

export function useDailyReview({ date, zodiacSign, horoscopeRank }: Params): UseDailyReviewResult {
  const [form, setForm] = useState<DailyReviewDraft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [existingReview, setExistingReview] = useState<DailyReview | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!date || !zodiacSign) {
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    getDailyReview(date, zodiacSign).then((review) => {
      if (cancelled) return;
      setExistingReview(review);
      if (review) {
        setForm({
          rating: review.rating,
          memorableItems: review.memorableItems,
          note: review.note,
        });
      }
      setIsLoaded(true);
    });

    return () => { cancelled = true; };
  }, [date, zodiacSign]);

  const save = useCallback(async (): Promise<DailyReview | null> => {
    if (!date || !zodiacSign || form.rating === null) return null;

    setIsSaving(true);
    try {
      const saved = await upsertDailyReview({
        draft: { ...form, rating: form.rating },
        date,
        zodiacSign,
        horoscopeRank,
      });
      setExistingReview(saved);
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [date, zodiacSign, horoscopeRank, form]);

  return { form, setForm, save, isSaving, existingReview, isLoaded };
}
