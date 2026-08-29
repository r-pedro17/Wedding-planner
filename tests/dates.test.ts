import { describe, expect, it } from "vitest";
import { assertDateOnly, daysBetween, dueState, isDateOnly, isDueWithin, today } from "../convex/lib/dates";

const FROM = "2026-03-01";

describe("isDateOnly", () => {
  it("accepts real dates and rejects everything else", () => {
    expect(isDateOnly("2026-03-01")).toBe(true);
    expect(isDateOnly("2026-02-30")).toBe(false);
    expect(isDateOnly("2026-3-1")).toBe(false);
    expect(isDateOnly("2026-03-01T00:00:00Z")).toBe(false);
    expect(isDateOnly(undefined)).toBe(false);
    expect(() => assertDateOnly("nope", "dueDate")).toThrow();
  });
});

describe("daysBetween", () => {
  it("counts whole days and survives a DST boundary", () => {
    expect(daysBetween("2026-03-01", "2026-03-02")).toBe(1);
    expect(daysBetween("2026-03-01", "2026-02-28")).toBe(-1);
    // Europe/Dublin springs forward on 2026-03-29.
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("dueState", () => {
  it("covers overdue, today, upcoming and no date", () => {
    expect(dueState("2026-02-28", FROM)).toBe("overdue");
    expect(dueState("2026-03-01", FROM)).toBe("today");
    expect(dueState("2026-03-02", FROM)).toBe("upcoming");
    expect(dueState(undefined, FROM)).toBe("none");
  });
});

describe("isDueWithin", () => {
  it("includes today and the last day of the window, excludes the past", () => {
    expect(isDueWithin("2026-03-01", 30, FROM)).toBe(true);
    expect(isDueWithin("2026-03-31", 30, FROM)).toBe(true);
    expect(isDueWithin("2026-04-01", 30, FROM)).toBe(false);
    expect(isDueWithin("2026-02-28", 30, FROM)).toBe(false);
    expect(isDueWithin(undefined, 30, FROM)).toBe(false);
  });
});

describe("today", () => {
  it("is a date-only string", () => {
    expect(isDateOnly(today())).toBe(true);
    expect(today(new Date("2026-03-01T23:30:00Z"))).toBe("2026-03-01");
  });
});
