import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const signs = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];
let db: PGlite;

async function insert(
  source: "ohaasa" | "gogo" | "mezamashi",
  date: string,
  count = 12,
) {
  const table = source === "mezamashi" ? "mezamashi_horoscopes" : "horoscopes";
  const rows = signs.slice(0, count).map((sign, i) => ({
    date,
    zodiac_sign: sign,
    zodiac_name: sign,
    rank: i + 1,
    advice: `${source} original`,
    advice_ko: `${source} 번역`,
    ...(source === "mezamashi"
      ? {
          lucky_point: "場所",
          lucky_color: "ブルー",
          lucky_point_ko: "장소",
          lucky_color_ko: "파란색",
        }
      : { source, love_score: 6 }),
  }));
  await db.query(
    `insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, $1::jsonb)`,
    [JSON.stringify(rows)],
  );
}

async function selected(date: string) {
  return (
    await db.query<{
      source: string;
      mezamashi: unknown;
      love_score: number | null;
    }>(
      "select source, mezamashi, love_score from public.resolved_horoscopes where date=$1",
      [date],
    )
  ).rows;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table public.horoscopes (
      date date not null, zodiac_sign text not null, zodiac_name text, rank integer,
      advice text, advice_ko text, source text, lucky_place text, lucky_place_ko text,
      lucky_item_ohaasa text, lucky_item_ohaasa_ko text, lucky_color text, lucky_color_ko text,
      lucky_item text, lucky_item_ko text, money_score integer, love_score integer,
      work_score integer, health_score integer, primary key(date, zodiac_sign)
    );
    alter table public.horoscopes enable row level security;
    grant select on public.horoscopes to anon, authenticated, service_role;
    create policy read_horoscopes on public.horoscopes for select using (true);
  `);
  for (const name of [
    "20261026000000_mezamashi_horoscopes.sql",
    "20261026010000_resolved_horoscopes.sql",
    "20261027000000_gogo_horoscopes.sql",
  ]) {
    await db.exec(
      readFileSync(
        resolve(__dirname, "../../../supabase/migrations", name),
        "utf8",
      ),
    );
  }
}, 30_000);
beforeEach(async () => {
  await db.exec(
    "reset role; truncate public.horoscopes, public.mezamashi_horoscopes, public.gogo_horoscopes;",
  );
});
afterAll(async () => {
  await db.close();
});

describe("실제 PostgreSQL 조회 뷰: 날짜별 하나의 완전한 소스", () => {
  it("새 고고 테이블의 데이터는 기존 운세 선택에 개입하지 않고 익명 읽기만 허용한다", async () => {
    await insert("ohaasa", "2026-10-26");
    const before = await selected("2026-10-26");
    await db.exec(`insert into public.gogo_horoscopes
      (date,zodiac_sign,zodiac_name,rank,advice,lucky_color,lucky_item,money_score,love_score,work_score,health_score)
      values ('2026-10-26','aries','おひつじ座',1,'本文','青','本',3,3,3,3);
      set role anon;`);
    expect(
      (await db.query("select * from public.gogo_horoscopes")).rows,
    ).toHaveLength(1);
    expect(await selected("2026-10-26")).toEqual(before);
    await expect(
      db.exec("delete from public.gogo_horoscopes"),
    ).rejects.toThrow();
    await db.exec("reset role; truncate public.gogo_horoscopes;");
  });
  it("새 고고 테이블은 service_role 저장과 PK 재실행을 허용하고 잘못된 점수는 거부한다", async () => {
    await db.exec(`set role service_role;
      insert into public.gogo_horoscopes
      (date,zodiac_sign,zodiac_name,rank,advice,lucky_color,lucky_item,money_score,love_score,work_score,health_score)
      values ('2026-10-27','aries','おひつじ座',1,'本文','青','本',3,3,3,3);
      insert into public.gogo_horoscopes select * from public.gogo_horoscopes
      on conflict (date,zodiac_sign) do update set advice_ko='번역';`);
    const result = await db.query<{ advice_ko: string }>(
      "select advice_ko from public.gogo_horoscopes",
    );
    expect(result.rows).toEqual([{ advice_ko: "번역" }]);
    await expect(
      db.exec("update public.gogo_horoscopes set money_score=7"),
    ).rejects.toThrow();
    await expect(
      db.exec("update public.gogo_horoscopes set zodiac_sign='unknown'"),
    ).rejects.toThrow();
    await expect(
      db.exec("update public.gogo_horoscopes set rank=13"),
    ).rejects.toThrow();
    await db.exec("reset role;");
  });
  it("평일에는 오하아사만 선택한다", async () => {
    await insert("ohaasa", "2026-10-23");
    await insert("mezamashi", "2026-10-23");
    expect((await selected("2026-10-23")).map((r) => r.source)).toEqual(
      Array(12).fill("ohaasa"),
    );
  });
  it("평일 오하아사가 없으면 메자마시로 바꾸지 않는다", async () => {
    await insert("mezamashi", "2026-10-23");
    expect(await selected("2026-10-23")).toHaveLength(0);
  });
  it("새 규칙 이전의 평일 고고 운세 이력도 유지한다", async () => {
    await insert("gogo", "2026-05-18");
    expect(await selected("2026-05-18")).toHaveLength(12);
    expect((await selected("2026-05-18"))[0].source).toBe("gogo");
  });
  it("새 규칙부터 평일에는 고고·메자마시를 자동 대체하지 않는다", async () => {
    await insert("gogo", "2026-10-26");
    await insert("mezamashi", "2026-10-26");
    expect(await selected("2026-10-26")).toHaveLength(0);
  });
  it("주말에는 완전한 고고를 우선한다", async () => {
    await insert("gogo", "2026-10-24");
    await insert("mezamashi", "2026-10-24");
    expect(
      (await selected("2026-10-24")).every((r) => r.source === "gogo"),
    ).toBe(true);
    expect(await selected("2026-10-24")).toHaveLength(12);
  });
  it("고고가 불완전하면 메자마시 12개를 섞지 않고 선택한다", async () => {
    await insert("gogo", "2026-10-24", 11);
    await insert("mezamashi", "2026-10-24");
    const rows = await selected("2026-10-24");
    expect(rows).toHaveLength(12);
    expect(
      rows.every(
        (r) => r.source === "mezamashi" && r.mezamashi && r.love_score === null,
      ),
    ).toBe(true);
  });
  it("고고 순위가 중복되거나 본문이 비어도 메자마시로 대체한다", async () => {
    await insert("gogo", "2026-10-24");
    await insert("mezamashi", "2026-10-24");
    await db.exec(
      "update public.horoscopes set rank=1 where zodiac_sign='taurus';",
    );
    expect((await selected("2026-10-24"))[0].source).toBe("mezamashi");
    await db.exec(
      "update public.horoscopes set rank=2, advice='' where zodiac_sign='taurus';",
    );
    expect((await selected("2026-10-24"))[0].source).toBe("mezamashi");
  });
  it("둘 다 없으면 오늘을 비워 최근의 완전한 날짜를 조회할 수 있다", async () => {
    await insert("gogo", "2026-10-24");
    expect(await selected("2026-10-25")).toHaveLength(0);
    const latest = await db.query<{ date: string }>(
      "select date::text from public.resolved_horoscopes order by date desc limit 1",
    );
    expect(latest.rows[0].date).toBe("2026-10-24");
  });
  it("메자마시도 누락되면 공개하지 않는다", async () => {
    await insert("mezamashi", "2026-10-24", 11);
    expect(await selected("2026-10-24")).toHaveLength(0);
  });
  it("본문 번역이 누락되면 알림 준비가 완료되지 않는다", async () => {
    await insert("mezamashi", "2026-10-24");
    await db.exec(
      "update public.mezamashi_horoscopes set advice_ko=null where zodiac_sign='aries';",
    );
    const result = await db.query<{ ready: boolean }>(
      "select bool_and(nullif(advice_ko, '') is not null) as ready from public.resolved_horoscopes",
    );
    expect(result.rows[0].ready).toBe(false);
  });
  it("익명 사용자는 조회만 가능하고 원본 RLS도 유지된다", async () => {
    await insert("gogo", "2026-10-24");
    await db.exec("set role anon;");
    expect(await selected("2026-10-24")).toHaveLength(12);
    await expect(
      db.exec("delete from public.resolved_horoscopes;"),
    ).rejects.toThrow();
    await db.exec(
      "reset role; drop policy read_horoscopes on public.horoscopes; set role anon;",
    );
    expect(await selected("2026-10-24")).toHaveLength(0);
    await db.exec(
      "reset role; create policy read_horoscopes on public.horoscopes for select using (true);",
    );
  });
});
