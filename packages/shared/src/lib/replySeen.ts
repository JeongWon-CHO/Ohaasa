import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * "내 답변에 달린 답글을 어디까지 봤는지"의 로컬 기록.
 *
 * 서버에 읽음 표시를 둘 수 없다 — 로그인이 없어 "누가 읽었는지"를 걸어둘 주체가 없고,
 * 피드는 device_id를 내려보내지 않으므로 클라이언트가 자기 행을 갱신할 키도 마땅치 않다.
 * 재설치하면 초기화되는데, device_id도 함께 재생성돼 어차피 남의 답변이 되므로 감수한다.
 *
 * moderation.ts와 파일을 나눈 이유: 저쪽은 "안 보기로 한 것"의 목록이고 이쪽은 열람 기록이라
 * clearModerationState()가 같이 지워서는 안 된다 (차단만 풀었는데 배지가 되살아난다).
 */

const KEY = 'ohaasa:reply_seen:v1';

/**
 * 답변은 기기당 하루 1개라 항목이 하루에 하나씩 늘어난다. 지난 날짜의 기록은
 * 그 답변 카드를 다시 열지 않는 한 쓰이지 않으므로 오래된 것부터 버린다.
 */
const MAX_ENTRIES = 60;

/** answer_id → 마지막으로 확인한 답글의 created_at (ISO) */
type SeenMap = Record<string, string>;

async function loadAll(): Promise<SeenMap> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as SeenMap) : {};
  } catch {
    return {};
  }
}

export async function getReplySeenAt(answerId: string): Promise<string | null> {
  const all = await loadAll();
  return all[answerId] ?? null;
}

/**
 * 기준값은 "지금 시각"이 아니라 실제로 본 답글의 created_at이다.
 *
 * created_at은 서버 시계로 찍히므로 기기 시계가 조금이라도 뒤처져 있으면, now()로 저장한 순간
 * 방금 읽은 답글이 그 기준보다 미래가 되어 영영 새 답글로 남는다.
 */
export async function setReplySeenAt(answerId: string, seenAt: string): Promise<void> {
  const all = await loadAll();
  if (all[answerId] === seenAt) return;

  const next: SeenMap = { ...all, [answerId]: seenAt };
  const keys = Object.keys(next);
  if (keys.length <= MAX_ENTRIES) {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return;
  }

  // 값이 ISO 문자열이라 사전순 정렬 = 시간순 정렬이다.
  const pruned: SeenMap = {};
  for (const key of keys.sort((a, b) => next[b].localeCompare(next[a])).slice(0, MAX_ENTRIES)) {
    pruned[key] = next[key];
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(pruned));
}
