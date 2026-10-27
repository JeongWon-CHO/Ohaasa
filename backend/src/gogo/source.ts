import { fetchHtml } from "./fetcher";
import { parse, type GogoParseResult } from "./parser";
import { fetchHtml as fetchCat, parse as parseCat } from "./todays-cat";
import { validate } from "./validation";

/** 두 수집 경로가 동일한 공식 우선/fallback 및 완전성 검증을 사용한다. */
export async function fetchGogo(
  today: string,
  options: { allowStaleOfficial?: boolean } = {},
): Promise<GogoParseResult> {
  let stale: GogoParseResult | undefined;
  const errors: unknown[] = [];
  try {
    const result = parse(await fetchHtml(), Number(today.slice(0, 4)));
    validate(result);
    if (result.date === today || options.allowStaleOfficial) {
      console.log(`[gogo] source=official date=${result.date}`);
      return result;
    }
    stale = result;
    console.warn(
      `[gogo] Official date=${result.date}, expected=${today}; trying Today's Cat`,
    );
  } catch (error) {
    errors.push(error);
    console.warn(
      "[gogo] Official fetch/parse/validation failed; trying Today's Cat:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  try {
    const result = parseCat(await fetchCat(today));
    validate(result);
    console.log(`[gogo] source=todays-cat date=${result.date}`);
    if (result.date !== today) {
      console.warn(
        `[gogo] Today's Cat date=${result.date}, expected=${today}; skipping`,
      );
      // --force의 날짜 무시는 기존 공식 소스에만 적용한다.
      if (options.allowStaleOfficial)
        throw new Error("[gogo] Today's Cat date mismatch");
    }
    return result;
  } catch (error) {
    errors.push(error);
    console.warn(
      "[gogo] Today's Cat fetch/parse/validation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    // 공식의 날짜가 오래된 경우 기존 stale 결과를 유지하고 저장하지 않는다.
    if (stale) return stale;
    throw new AggregateError(errors, "[gogo] Both collection sources failed");
  }
}
