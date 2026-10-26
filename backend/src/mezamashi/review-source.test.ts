import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const code = ts.transpileModule(
  readFileSync(
    resolve(__dirname, "../../../packages/shared/src/lib/dailyReviews.ts"),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  },
).outputText;

function setup() {
  const data = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
  const exports: Record<string, unknown> = {};
  runInNewContext(code, { exports, require: () => storage });
  return {
    data,
    save: exports.upsertDailyReview as (
      params: Record<string, unknown>,
    ) => Promise<{ horoscopeSource: string | null; horoscopeRank: number }>,
  };
}
const params = {
  date: "2026-10-24",
  zodiacSign: "aries",
  horoscopeRank: 12,
  horoscopeSource: "mezamashi",
  draft: { rating: 3, memorableItems: [], note: "기록" },
};

describe("리뷰 작성 당시 운세 보존", () => {
  it("새 리뷰에 메자마시 출처와 당시 순위를 저장한다", async () => {
    const test = setup();
    expect(await test.save(params)).toMatchObject({
      horoscopeSource: "mezamashi",
      horoscopeRank: 12,
    });
  });
  it("고고가 나중에 복구되어도 기존 리뷰의 출처와 순위를 바꾸지 않는다", async () => {
    const test = setup();
    await test.save(params);
    expect(
      await test.save({ ...params, horoscopeSource: "gogo", horoscopeRank: 1 }),
    ).toMatchObject({ horoscopeSource: "mezamashi", horoscopeRank: 12 });
  });
  it("출처가 없는 옛 리뷰에는 현재 출처를 추측해서 덮어쓰지 않는다", async () => {
    const test = setup();
    await test.save(params);
    const [key, value] = [...test.data][0];
    const records = JSON.parse(value);
    delete records["2026-10-24:aries"].horoscopeSource;
    test.data.set(key, JSON.stringify(records));
    expect(
      await test.save({ ...params, horoscopeSource: "gogo", horoscopeRank: 1 }),
    ).toMatchObject({ horoscopeSource: null, horoscopeRank: 12 });
  });
});
