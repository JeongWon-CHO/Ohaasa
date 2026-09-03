/** 저장 키와 화면에서 함께 쓰는 날짜 문자열 헬퍼. */

export function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function toDateString(date: Date): string {
  return `${toYearMonth(date)}-${String(date.getDate()).padStart(2, '0')}`;
}

/** `yearMonth`는 `YYYY-MM`. 그 달의 모든 날짜를 오름차순으로 준다. */
export function daysInMonth(yearMonth: string): string[] {
  const [y, m] = yearMonth.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from(
    { length: last },
    (_, i) => `${yearMonth}-${String(i + 1).padStart(2, '0')}`,
  );
}

export function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  return toYearMonth(new Date(y, m - 1 + delta, 1));
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** "9월 3일 목요일". 헤더 부제처럼 사람이 읽는 자리에 쓴다. */
export function formatTodayKo(date = new Date()): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_KO[date.getDay()]}요일`;
}
