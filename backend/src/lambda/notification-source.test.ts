import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// 실제 Edge Function 코드를 실행하되 DB와 Expo만 대체하여 외부 발송을 막는다.
const code = ts.transpileModule(
  readFileSync(
    resolve(
      __dirname,
      "../../../supabase/functions/send-horoscope-notifications/index.ts",
    ),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function setup(
  rows: Array<{
    zodiac_sign: string;
    advice_ko: string | null;
    source: string;
  }>,
  claimed = true,
) {
  const tables: string[] = [];
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === "claim_notification_batch"
        ? claimed
        : name === "claim_daily_horoscope_devices"
          ? [
              {
                device_id: "test-device",
                push_token: "ExpoPushToken[test]",
                zodiac_sign: "aries",
              },
            ]
          : null,
    error: null,
  }));
  const db = {
    rpc,
    from(name: string) {
      tables.push(name);
      const chain = {
        select: () => chain,
        eq: () => chain,
        not: () => chain,
        update: () => chain,
        in: () => chain,
        then: (resolve: (value: unknown) => unknown) =>
          resolve({
            data: name === "resolved_horoscopes" ? rows : [],
            count: 1,
            error: null,
          }),
      };
      return chain;
    },
  };
  const fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ data: [{ status: "ok" }] }), {
        status: 200,
      }),
  );
  let handler!: (request: Request) => Promise<Response>;
  runInNewContext(code, {
    exports: {},
    require: () => ({ createClient: () => db }),
    Response,
    Request,
    fetch,
    AbortSignal,
    console,
    Deno: {
      env: {
        get: (key: string) =>
          key === "SUPABASE_URL" ? "https://example.test" : "test-service-key",
      },
      serve: (fn: typeof handler) => {
        handler = fn;
      },
    },
  });
  const run = (dryRun = true) =>
    handler(
      new Request("https://example.test", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-service-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: "2026-10-24",
          scheduled_time: "07:00",
          dry_run: dryRun,
        }),
      }),
    );
  return { run, fetch, rpc, tables };
}

const rows = Array.from({ length: 12 }, (_, i) => ({
  zodiac_sign: i === 0 ? "aries" : `sign${i}`,
  advice_ko: "오늘의 번역",
  source: "mezamashi",
}));

describe("알림과 앱의 소스 일치", () => {
  it("당일 운세가 없으면 이전 날짜로 대체 발송하지 않는다", async () => {
    const test = setup([]);
    expect((await test.run()).status).toBe(409);
    expect(test.tables).toEqual(["resolved_horoscopes"]);
    expect(test.fetch).not.toHaveBeenCalled();
  });
  it("12개라도 번역이 누락되면 발송하지 않는다", async () => {
    const test = setup(
      rows.map((row, i) => (i === 0 ? { ...row, advice_ko: null } : row)),
    );
    expect((await test.run()).status).toBe(409);
    expect(test.fetch).not.toHaveBeenCalled();
  });
  it("dry-run은 선택된 소스로 준비 상태만 검사한다", async () => {
    const test = setup(rows);
    expect((await test.run()).status).toBe(200);
    expect(test.fetch).not.toHaveBeenCalled();
    expect(test.rpc).not.toHaveBeenCalled();
  });
  it("발송 메시지와 탐색 데이터에 메자마시 출처를 사용한다", async () => {
    const test = setup(rows);
    expect((await test.run(false)).status).toBe(200);
    const call = test.fetch.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    const [message] = JSON.parse(call[1].body);
    expect(message.title).toBe("양자리 메자마시 운세");
    expect(message.data).toEqual({
      date: "2026-10-24",
      zodiac_sign: "aries",
      source: "mezamashi",
    });
    expect(test.rpc).toHaveBeenCalledWith("claim_notification_batch", {
      p_notification_type: "daily_horoscope",
      p_date: "2026-10-24",
      p_scheduled_time: "07:00",
    });
  });
  it("같은 날짜/알림시간의 배치를 다시 발송하지 않는다", async () => {
    const test = setup(rows, false);
    expect(await (await test.run(false)).json()).toMatchObject({
      status: "already_claimed",
    });
    expect(test.fetch).not.toHaveBeenCalled();
  });
});
