import { useCallback, useEffect, useState } from 'react';

import { containsObjectionableContent } from '@ohaasa/shared/lib/contentFilter';
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
  remove: () => Promise<boolean>;
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

      const body = form.body.trim();
      // Do not mark a rejected public write as successfully published in local storage.
      if (visibility === 'public' && zodiacSign) {
        if (containsObjectionableContent(body)) return null;
        const ok = await upsertPublicAnswer(date, deviceId, zodiacSign, body);
        if (!ok) return null;
      } else if (existingAnswer?.visibility === 'public') {
        if (!await deletePublicAnswer(date, deviceId)) return null;
      }
      const saved = await upsertQuestionAnswer({
        date, zodiacSign, questionText, body, visibility,
      });

      setExistingAnswer(saved);
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [date, zodiacSign, questionText, form, existingAnswer]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!date) return false;
    const wasPublic = existingAnswer?.visibility === 'public';
    if (wasPublic) {
      const deviceId = await getOrCreateDeviceId();
      if (!await deletePublicAnswer(date, deviceId)) return false;
    }
    await deleteQuestionAnswer(date);

    setExistingAnswer(null);
    setForm(EMPTY_DRAFT);
    return true;
  }, [date, existingAnswer]);

  return { form, setForm, save, remove, isSaving, existingAnswer, isLoaded };
}
