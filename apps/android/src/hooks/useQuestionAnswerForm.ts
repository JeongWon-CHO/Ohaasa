import { useCallback, useEffect, useState } from 'react';

import type { ZodiacSign } from '@ohaasa/shared/constants/zodiac';
import { getOrCreateDeviceId } from '@ohaasa/shared/lib/storage';
import { deletePublicAnswer, upsertPublicAnswer } from '@ohaasa/shared/lib/supabase';
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
    if (!isLoaded || zodiacSign) return;
    setForm((current) =>
      current.visibility === 'private'
        ? current
        : { ...current, visibility: 'private' },
    );
  }, [isLoaded, zodiacSign]);

  useEffect(() => {
    if (!date) {
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
      // 별자리 없는 사용자의 공개 행은 구버전 Android에서 렌더링할 수 없다.
      // UI 잠금과 별개로 저장 경계에서도 비공개를 강제한다.
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
