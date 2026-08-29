import { describe, expect, it } from "vitest";
import {
  assertNonNegativeCents,
  formatCents,
  parseAmountToCents,
  sumCents,
} from "../convex/lib/money";

describe("parseAmountToCents", () => {
  it("parses plain numbers and decimals", () => {
    expect(parseAmountToCents(1800)).toBe(180_000);
    expect(parseAmountToCents("1800")).toBe(180_000);
    expect(parseAmountToCents("1850.50")).toBe(185_050);
  });

  it("parses European and Anglo thousands separators", () => {
    expect(parseAmountToCents("1.850,50")).toBe(185_050);
    expect(parseAmountToCents("1,850.50")).toBe(185_050);
    expect(parseAmountToCents("€1,800")).toBe(180_000);
    expect(parseAmountToCents("1.800")).toBe(180_000);
    expect(parseAmountToCents("1,8")).toBe(180);
    expect(parseAmountToCents("1.8")).toBe(180);
  });

  it("never leaves fractional cents", () => {
    expect(parseAmountToCents(0.1 + 0.2)).toBe(30);
    expect(Number.isInteger(parseAmountToCents("33.335"))).toBe(true);
  });

  it("rejects nonsense", () => {
    expect(() => parseAmountToCents("")).toThrow();
    expect(() => parseAmountToCents("abc")).toThrow();
  });
});

describe("formatCents", () => {
  it("shows a consistent currency", () => {
    expect(formatCents(185_000, "EUR")).toContain("1,850.00");
  });
});

describe("sumCents / validation", () => {
  it("sums exactly", () => {
    expect(sumCents([10, 20, 33])).toBe(63);
    expect(sumCents([])).toBe(0);
  });

  it("rejects negative and non-integer cents", () => {
    expect(() => assertNonNegativeCents(-1, "paidCents")).toThrow(/negative/);
    expect(() => assertNonNegativeCents(1.5, "paidCents")).toThrow(/whole number/);
    expect(assertNonNegativeCents(0, "paidCents")).toBe(0);
  });
});
