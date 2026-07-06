import { useCallback, useEffect, useState } from 'react';

import { type DailyCard, getCardByRank } from '@/src/constants/dailyCards';
import { getCardOpenedDate, setCardOpenedDate } from '@/src/lib/storage';

type UseDailyCardResult = {
  card: DailyCard | null;
  isOpened: boolean;
  markOpened: () => Promise<void>;
  loading: boolean;
};

export function useDailyCard(
  rank: number | null | undefined,
  broadcastDate: string | null | undefined,
): UseDailyCardResult {
  const [isOpened, setIsOpened] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!broadcastDate) {
      setLoading(false);
      return;
    }

    getCardOpenedDate().then((savedDate) => {
      setIsOpened(savedDate === broadcastDate);
      setLoading(false);
    });
  }, [broadcastDate]);

  const markOpened = useCallback(async () => {
    if (!broadcastDate) return;
    await setCardOpenedDate(broadcastDate);
    setIsOpened(true);
  }, [broadcastDate]);

  const card = rank != null && broadcastDate ? getCardByRank(rank, broadcastDate) : null;

  return { card, isOpened, markOpened, loading };
}
