import { useCallback, useEffect, useState } from 'react';

import {
  emptyDraft,
  loadJournal,
  saveJournal,
  type DailyJournal,
  type JournalDraft,
} from '@/src/lib/journal';

export function useJournal(date: string) {
  const [draft, setDraft] = useState<JournalDraft>(emptyDraft);
  const [existing, setExisting] = useState<DailyJournal | null>(null);
  // "로딩 끝났나"를 boolean이 아니라 "어느 날짜를 읽어놨나"로 들고 있는다.
  // 날짜가 바뀌는 순간 자동으로 미로딩 상태가 되므로, 이전 날짜의 draft가
  // 한 프레임 비쳤다가 바뀌는 일이 없다.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 날짜를 바꿔가며 열 수 있으므로, 늦게 도착한 조회가 지금 화면을 덮지 않게 막는다.
    let cancelled = false;
    loadJournal(date).then((journal) => {
      if (cancelled) return;
      setExisting(journal);
      setDraft(
        journal
          ? { mood: journal.mood, sketch: journal.sketch, summary: journal.summary }
          : emptyDraft(),
      );
      setLoadedFor(date);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const saved = await saveJournal(date, draft);
      setExisting(saved);
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [date, draft]);

  return { draft, setDraft, existing, isLoaded: loadedFor === date, isSaving, save };
}
