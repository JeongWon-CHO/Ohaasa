import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 신고·차단의 로컬 상태.
 *
 * 서버에는 신고 사실만 남기고(question_answer_reports), "누가 무엇을 안 보기로 했는지"는
 * 전부 기기에 둔다. 로그인이 없어 서버에 사용자별 차단 목록을 걸어둘 주체가 없기 때문이다.
 * 재설치하면 초기화되는데, device_id도 함께 재생성되므로 감수한다.
 *
 * 차단 키는 device_id가 아니라 author_hash다 — 피드는 device_id를 절대 내려보내지 않는다.
 * author_hash는 기기별로 안정적이라 차단이 다음 날 올라오는 글에도 계속 적용된다.
 */

const BLOCKED_AUTHORS_KEY = 'ohaasa:blocked_authors:v1';
const HIDDEN_ANSWERS_KEY = 'ohaasa:hidden_answers:v1';

export type ReportReason = 'abuse' | 'spam' | 'sexual' | 'other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'abuse', label: '욕설 · 비방 · 괴롭힘' },
  { value: 'spam', label: '스팸 · 광고' },
  { value: 'sexual', label: '음란 · 선정적인 내용' },
  { value: 'other', label: '기타' },
];

async function loadList(key: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

async function addTo(key: string, value: string): Promise<void> {
  const list = await loadList(key);
  if (list.includes(value)) return;
  await AsyncStorage.setItem(key, JSON.stringify([...list, value]));
}

// ─── 차단한 작성자 ───────────────────────────────────────────────

export async function getBlockedAuthors(): Promise<Set<string>> {
  return new Set(await loadList(BLOCKED_AUTHORS_KEY));
}

export async function addBlockedAuthor(authorHash: string): Promise<void> {
  await addTo(BLOCKED_AUTHORS_KEY, authorHash);
}

export async function removeBlockedAuthor(authorHash: string): Promise<void> {
  const list = await loadList(BLOCKED_AUTHORS_KEY);
  await AsyncStorage.setItem(
    BLOCKED_AUTHORS_KEY,
    JSON.stringify(list.filter((hash) => hash !== authorHash)),
  );
}

export async function clearBlockedAuthors(): Promise<void> {
  await AsyncStorage.removeItem(BLOCKED_AUTHORS_KEY);
}

export async function getBlockedAuthorCount(): Promise<number> {
  return (await loadList(BLOCKED_AUTHORS_KEY)).length;
}

// ─── 내가 신고해서 숨긴 답변 ──────────────────────────────────────

export async function getHiddenAnswerIds(): Promise<Set<string>> {
  return new Set(await loadList(HIDDEN_ANSWERS_KEY));
}

export async function addHiddenAnswerId(answerId: string): Promise<void> {
  await addTo(HIDDEN_ANSWERS_KEY, answerId);
}

/** 신고 전송이 실패했을 때 낙관적 숨김을 되돌린다. */
export async function removeHiddenAnswerId(answerId: string): Promise<void> {
  const list = await loadList(HIDDEN_ANSWERS_KEY);
  await AsyncStorage.setItem(
    HIDDEN_ANSWERS_KEY,
    JSON.stringify(list.filter((id) => id !== answerId)),
  );
}

/** QA용 — 차단·숨김 기록을 모두 지운다. 서버의 신고 기록은 건드리지 않는다. */
export async function clearModerationState(): Promise<void> {
  await AsyncStorage.multiRemove([BLOCKED_AUTHORS_KEY, HIDDEN_ANSWERS_KEY]);
}
