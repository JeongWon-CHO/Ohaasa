import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getAllQuestionAnswers, type QuestionAnswer } from '@/src/lib/questionAnswers';

export function useQuestionAnswerHistory(year: number, month: number) {
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      getAllQuestionAnswers().then((all) => {
        if (cancelled) return;
        const filtered = all.filter((a) => {
          const [y, m] = a.date.split('-').map(Number);
          return y === year && m === month;
        });
        setAnswers(filtered);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- reloadTick은 본문이 읽지 않지만 refetch()의 유일한 트리거다.
    }, [year, month, reloadTick]),
  );

  const answersByDate = useMemo(
    () => Object.fromEntries(answers.map((a) => [a.date, a])),
    [answers],
  );

  return { answers, answersByDate, loading, refetch };
}
