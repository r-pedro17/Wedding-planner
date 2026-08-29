/**
 * Money is always integer minor units (cents). No floats in accounting.
 */

export const CURRENCY = "EUR";

export function isValidCents(value: number): boolean {
  return Number.isInteger(value) && Number.isFinite(value);
}

/** Parse a user-entered amount ("1.850,50", "1850.5", "€1,850") into cents. */
export function parseAmountToCents(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Amount is not a number");
    return Math.round(input * 100);
  }
  const cleaned = input.replace(/[^\d,.-]/g, "").trim();
  if (cleaned === "" || cleaned === "-") throw new Error("Amount is empty");

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  // A lone separator followed by exactly three digits is a thousands separator
  // ("1,800" and "1.800" both mean 1800), not a decimal point.
  const loneGroupSeparator =
    (lastComma === -1) !== (lastDot === -1) &&
    /^-?\d{1,3}([.,]\d{3})+$/.test(cleaned);
  let normalized: string;
  if (loneGroupSeparator) {
    normalized = cleaned.replace(/[.,]/g, "");
  } else if (lastComma > lastDot) {
    // European: "1.850,50" — dots are thousands separators.
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Anglo: "1,850.50" — commas are thousands separators.
    normalized = cleaned.replace(/,/g, "");
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid amount: ${input}`);
  return Math.round(parsed * 100);
}

/** Format cents for display, e.g. 185000 -> "€1,850.00". */
export function formatCents(cents: number, currency: string = CURRENCY): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function assertNonNegativeCents(value: number, field: string): number {
  if (!isValidCents(value)) {
    throw new Error(`${field} must be a whole number of cents`);
  }
  if (value < 0) {
    throw new Error(`${field} cannot be negative`);
  }
  return value;
}
