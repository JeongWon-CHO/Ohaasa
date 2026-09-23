import { afterEach, describe, expect, it, vi } from "vitest";

import { getDueSlots, handler } from "./notification-dispatcher";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getDueSlots", () => {
  it("returns no slot before 06:00", () => {
    expect(getDueSlots("05:59")).toEqual([]);
  });

  it("returns every half-hour slot through the requested time", () => {
    expect(getDueSlots("07:12")).toEqual(["06:00", "06:30", "07:00"]);
  });

  it("caps dispatching at 10:00", () => {
    expect(getDueSlots("12:00")).toEqual([
      "06:00", "06:30", "07:00", "07:30", "08:00",
      "08:30", "09:00", "09:30", "10:00",
    ]);
  });
});

describe("notification dispatcher dry-run payload", () => {
  it.each([
    { event: { dryRun: true }, expected: true },
    { event: { dryRun: false }, expected: false },
    { event: {}, expected: false },
  ])("sends dry_run=$expected for $event", async ({ event, expected }) => {
    vi.stubEnv("SUPABASE_URL", "https://example.invalid");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    const sentBodies: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options: RequestInit) => {
      sentBodies.push(JSON.parse(String(options.body)));
      return new Response("{}", { status: 200 });
    }));

    await handler({ ...event, date: "2026-09-23", throughTime: "06:00" });

    expect(sentBodies).toEqual([{
      date: "2026-09-23",
      scheduled_time: "06:00",
      dry_run: expected,
    }]);
  });
});
