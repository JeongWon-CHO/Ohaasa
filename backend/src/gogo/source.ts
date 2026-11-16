import { fetchHtml } from "./fetcher";
import { parse, type GogoParseResult } from "./parser";
import { validate } from "./validation";

/** 두 수집 경로가 동일한 공식 소스 및 완전성 검증을 사용한다. */
export async function fetchGogo(
  today: string,
  options: { allowStaleOfficial?: boolean } = {},
): Promise<GogoParseResult> {
  const result = parse(await fetchHtml(), Number(today.slice(0, 4)));
  validate(result);
  console.log(`[gogo] source=official date=${result.date}`);
  if (result.date !== today && !options.allowStaleOfficial) {
    console.warn(
      `[gogo] Official date=${result.date}, expected=${today}; skipping`,
    );
  }
  // 실제 날짜를 유지해 호출부가 stale 처리하며, 메인 수집기의 --force도 유지한다.
  return result;
}
