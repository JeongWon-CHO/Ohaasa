import { useCallback, useEffect, useState } from 'react';

import type { ZodiacSign } from '@ohaasa/shared/constants/zodiac';
import { getOrCreateDeviceId } from '@ohaasa/shared/lib/storage';
import {
  deletePublicAnswer,
  upsertPublicAnswer,
} from '@ohaasa/shared/lib/supabase';
import {
  deleteQuestionAnswer,
  getQuestionAnswer,
  upsertQuestionAnswer,
  type AnswerVisibility,
  type QuestionAnswer,
} from '@ohaasa/shared/lib/questionAnswers';

export type QuestionAnswerDraft = {
  body: string;
  visibility: AnswerVisibility;
};

type Params = {
  date: string | null;
  zodiacSign: ZodiacSign | null;
  questionText: string | null;
};

type UseQuestionAnswerFormResult = {
  form: QuestionAnswerDraft;
  setForm: React.Dispatch<React.SetStateAction<QuestionAnswerDraft>>;
  save: () => Promise<QuestionAnswer | null>;
  remove: () => Promise<void>;
  isSaving: boolean;
  existingAnswer: QuestionAnswer | null;
  isLoaded: boolean;
};

const EMPTY_DRAFT: QuestionAnswerDraft = {
  body: '',
  visibility: 'public',
};

export function useQuestionAnswerForm({
  date,
  zodiacSign,
  questionText,
}: Params): UseQuestionAnswerFormResult {
  const [form, setForm] = useState<QuestionAnswerDraft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [existingAnswer, setExistingAnswer] = useState<QuestionAnswer | null>(
    null,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 읽을 대상이 없으니 로딩을 여기서 끝낸다. 비동기 경로가 없어 콜백으로 미룰 수 없다.
      setIsLoaded(true);
      return;
    }

    let cancelled = false;
    getQuestionAnswer(date).then((answer) => {
      if (cancelled) return;
      setExistingAnswer(answer);
      if (answer) {
        setForm({ body: answer.body, visibility: answer.visibility });
      }
      setIsLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [date]);

  const save = useCallback(async (): Promise<QuestionAnswer | null> => {
    if (!date || !questionText || form.body.trim().length === 0) return null;

    setIsSaving(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      // 임시 호환 정책: null 별자리를 처리하지 못하는 구버전 Android 사용자를 보호하기 위해
      // 별자리 미등록 사용자의 공개 글을 막는다. Android 1.8.0+ 보급 후 공개를 허용할 때 제거한다.
      // DB와 공용 타입의 zodiac_sign null 허용은 iOS 심사 대응 요구사항이므로 유지해야 한다.
      const visibility: AnswerVisibility = zodiacSign
        ? form.visibility
        : 'private';

      const saved = await upsertQuestionAnswer({
        date,
        zodiacSign,
        questionText,
        body: form.body.trim(),
        visibility,
      });

      if (visibility === 'public' && zodiacSign) {
        await upsertPublicAnswer(date, deviceId, zodiacSign, saved.body);
      } else if (existingAnswer?.visibility === 'public') {
        await deletePublicAnswer(date, deviceId);
      }

      setExistingAnswer(saved);
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [date, zodiacSign, questionText, form, existingAnswer]);

  const remove = useCallback(async (): Promise<void> => {
    if (!date) return;

    const wasPublic = existingAnswer?.visibility === 'public';
    await deleteQuestionAnswer(date);

    if (wasPublic) {
      const deviceId = await getOrCreateDeviceId();
      await deletePublicAnswer(date, deviceId);
    }

    setExistingAnswer(null);
    setForm(EMPTY_DRAFT);
  }, [date, existingAnswer]);

  return { form, setForm, save, remove, isSaving, existingAnswer, isLoaded };
}
