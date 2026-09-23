import { describe, expect, it } from "vitest";

import { getDueSlots } from "./notification-dispatcher";

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
