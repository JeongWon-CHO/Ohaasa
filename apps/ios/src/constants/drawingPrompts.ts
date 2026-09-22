import { DRAWING_QUESTIONS } from './daily-questions';

/**
 * 빈 캔버스 앞에서 "오늘 뭘 그리지"로 막히는 걸 덜어주는 하루 한 줄.
 *
 * '오늘의 질문'(글로 답하는 질문)이 아니라 **그림 전용 질문**을 쓴다 —
 * 저쪽은 답이 생각이라 캔버스 앞에서 그대로 막힌다.
 * 그리고 그쪽 회전 로직(dailyQuestions.ts)은 건드리지 않는다: 카테고리 개수나
 * 순서가 바뀌면 날짜별 인덱스가 밀려서 안드로이드 v1 사용자가 보던 질문이 전부 달라진다.
 */
const POOL: string[] = DRAWING_QUESTIONS;

export const PROMPT_POOL_SIZE = POOL.length;

const MS_PER_DAY = 86_400_000;
const EPOCH = Date.UTC(2026, 0, 1);

/**
 * 날짜를 해시해서 인덱스를 뽑으면 생일 문제 때문에 1년 안에 같은 질문이 수십 번
 * 다시 나온다(1400개 풀에서 365일이면 약 58회). 대신 **풀 크기와 서로소인 보폭**으로
 * 한 칸씩 걸어가면 풀을 한 바퀴 다 돌 때까지 절대 겹치지 않는다 — 하루 하나씩이면
 * POOL.length일(약 3.8년)치가 전부 다른 질문이 된다.
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** 풀 크기가 바뀌어도(질문을 추가해도) 서로소가 유지되도록 실행 시점에 고른다. */
function coprimeStride(length: number, from: number): number {
  for (let s = from; s < from + length; s += 1) {
    if (gcd(s, length) === 1) return s;
  }
  return 1;
}

const DAY_STRIDE = coprimeStride(POOL.length, Math.floor(POOL.length / 3));
const SHUFFLE_STRIDE = coprimeStride(POOL.length, Math.floor(POOL.length / 7));

function dayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH) / MS_PER_DAY);
}

/**
 * 같은 날 다시 열면 같은 질문이 나온다 — 그래야 "오늘의" 질문이 된다.
 * `offset`은 새로고침을 누른 횟수로, 별도 보폭을 써서 눌러도 풀 전체를 고루 돈다.
 */
export function getPromptForDate(date: string, offset = 0): string {
  if (POOL.length === 0) return '';
  const i = dayIndex(date) * DAY_STRIDE + offset * SHUFFLE_STRIDE;
  return POOL[((i % POOL.length) + POOL.length) % POOL.length];
}
