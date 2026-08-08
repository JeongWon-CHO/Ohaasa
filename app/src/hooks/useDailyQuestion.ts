import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getQuestionByDate } from '@/src/constants/dailyQuestions';
import { getQuestionAnswer, type QuestionAnswer } from '@/src/lib/questionAnswers';

type UseDailyQuestionResult = {
  questionText: string | null;
  myAnswer: QuestionAnswer | null;
  hasAnswered: boolean;
  loading: boolean;
  refetch: () => void;
};

export function useDailyQuestion(date: string | null | undefined): UseDailyQuestionResult {
  const [myAnswer, setMyAnswer] = useState<QuestionAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  const refetch = useCallback(() => setReloadTick((n) => n + 1), []);

  // useFocusEffect: 홈 탭은 언마운트되지 않으므로 /daily-question에서 돌아왔을 때
  // 답변 상태를 다시 읽어오려면 focus 시점 재조회가 필요하다 (daily-review의 currentReview와 동일 패턴).
  useFocusEffect(
    useCallback(() => {
      if (!date) {
        setMyAnswer(null);
        setLoading(false);
        return;
      }

      let cancelled = false;
      setLoading(true);
      getQuestionAnswer(date).then((answer) => {
        if (cancelled) return;
        setMyAnswer(answer);
        setLoading(false);
      });

      return () => {
        cancelled = true;
      };
    }, [date, reloadTick]),
  );

  const questionText = date ? getQuestionByDate(date) : null;

  return { questionText, myAnswer, hasAnswered: myAnswer !== null, loading, refetch };
}
