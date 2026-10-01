/** SQL moderation filter uses the same normalized tokens. Keep both lists in sync. */
export const OBJECTIONABLE_TERMS = [
  '씨발', '씨팔', '씹새', '개새끼', '병신', '좆', '보지년', '창녀',
  '죽여버', '죽여줄', '자살해', '강간', '아동포르노', '몰카판매',
  'fuck', 'motherfucker', 'nigger',
] as const;

export function normalizeCommunityContent(body: string): string {
  return body.normalize('NFKC').toLowerCase().replace(/[^가-힣a-z0-9]/g, '');
}

export function containsObjectionableContent(body: string): boolean {
  const normalized = normalizeCommunityContent(body);
  return OBJECTIONABLE_TERMS.some((term) => normalized.includes(term));
}

export const CONTENT_FILTER_MESSAGE = '부적절한 표현이 포함되어 있어요. 내용을 수정해 주세요.';
