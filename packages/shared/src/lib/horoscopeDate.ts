/** 운세 날짜를 기기 시간대와 무관하게 한국 시간의 오늘과 비교한다. */
export function isTodayHoroscope(
  date: string | null | undefined,
  now = new Date(),
): boolean {
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return date === kstDate;
}
