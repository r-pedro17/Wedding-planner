import { describe, expect, it } from "vitest";
import { normalizeGuest, totalHeadcount } from "../convex/lib/guests";

describe("guest list domain rules", () => {
  it("normalizes names and notes", () => {
    expect(normalizeGuest({ name: "  Ada and Sam  ", partySize: 2, notes: "  cousins  " })).toEqual({
      name: "Ada and Sam",
      partySize: 2,
      notes: "cousins",
    });
  });

  it.each([0, -1, 1.5, Number.NaN, 101])("rejects invalid party size %s", (partySize) => {
    expect(() => normalizeGuest({ name: "Ada", partySize })).toThrow("Party size");
  });

  it("rejects a blank name", () => {
    expect(() => normalizeGuest({ name: "   ", partySize: 1 })).toThrow("Guest name is required");
  });

  it("totals people rather than invitations", () => {
    expect(totalHeadcount([{ partySize: 2 }, { partySize: 1 }, { partySize: 4 }])).toBe(7);
  });
});
