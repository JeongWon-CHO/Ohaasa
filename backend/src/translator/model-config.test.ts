import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create } };
  },
}));

describe("translation model requests", () => {
  beforeEach(() => {
    vi.resetModules();
    create.mockReset();
    create.mockResolvedValue({ choices: [{ message: { content: "좋은 하루" } }] });
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    vi.stubEnv("OPENAI_MODEL", "");
    delete process.env.OPENAI_MODEL;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    [undefined, "gpt-5.4-mini", "none"],
    ["gpt-5.4-mini-2026-03-17", "gpt-5.4-mini-2026-03-17", "none"],
    ["gpt-4o", "gpt-4o", undefined],
  ])("uses compatible options for model override %s in both translators", async (override, model, effort) => {
    if (override) vi.stubEnv("OPENAI_MODEL", override);
    const { translateAdvice, translateOhaasaLuckyItem } = await import("./translate");
    const { translateGogoEntries } = await import("../gogo/translator");
    expect(await translateAdvice("良い一日", "test")).toBe("좋은 하루");
    expect(await translateOhaasaLuckyItem("本")).toBe("좋은 하루");
    await translateGogoEntries([{
      zodiac_sign: "aries", rank: 1, advice: "", lucky_color: "マゼンタ",
      lucky_item: "本", money_score: 3, love_score: 3, work_score: 3, health_score: 3,
    }]);
    expect(create).toHaveBeenCalledTimes(4);
    for (const [request] of create.mock.calls) {
      expect(request.model).toBe(model);
      expect(request.temperature).toBe(0);
      expect(request.reasoning_effort).toBe(effort);
      expect(request).not.toHaveProperty("max_tokens");
    }
    expect(create.mock.calls.map(([request]) => request.max_completion_tokens)).toEqual([300, 300, 20, 30]);
  });

  it("keeps the model and options on Japanese-character retry", async () => {
    create.mockResolvedValueOnce({ choices: [{ message: { content: "良い一日" } }] });
    const { translateAdvice } = await import("./translate");
    expect(await translateAdvice("良い一日", "test")).toBe("좋은 하루");
    expect(create).toHaveBeenCalledTimes(2);
    for (const [request] of create.mock.calls) {
      expect(request).toMatchObject({ model: "gpt-5.4-mini", reasoning_effort: "none", max_completion_tokens: 300 });
    }
  });
});
