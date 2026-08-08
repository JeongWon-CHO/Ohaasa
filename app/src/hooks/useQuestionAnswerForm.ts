import { useCallback, useEffect, useState } from 'react';

import type { ZodiacSign } from '@/src/constants/zodiac';
import { getOrCreateDeviceId } from '@/src/lib/storage';
import { deletePublicAnswer, upsertPublicAnswer } from '@/src/lib/supabase';
import {
  deleteQuestionAnswer,
  getQuestionAnswer,
  upsertQuestionAnswer,
  type AnswerVisibility,
  type QuestionAnswer,
} from '@/src/lib/questionAnswers';

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
  visibility: 'private',
};

export function useQuestionAnswerForm({
  date,
  zodiacSign,
  questionText,
}: Params): UseQuestionAnswerFormResult {
  const [form, setForm] = useState<QuestionAnswerDraft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [existingAnswer, setExistingAnswer] = useState<QuestionAnswer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
    if (!date || !zodiacSign || !questionText || form.body.trim().length === 0) return null;

    setIsSaving(true);
    try {
      const deviceId = await getOrCreateDeviceId();

      const saved = await upsertQuestionAnswer({
        date,
        zodiacSign,
        questionText,
        body: form.body.trim(),
        visibility: form.visibility,
      });

      if (form.visibility === 'public') {
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
