/**
 * Date-only values are `YYYY-MM-DD` strings. All comparisons are string/UTC
 * based so they never shift with the viewer's timezone.
 */

export type DateOnly = string;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateOnly(value: unknown): value is DateOnly {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function assertDateOnly(value: unknown, field: string): DateOnly {
  if (!isDateOnly(value)) {
    throw new Error(`${field} must be a valid YYYY-MM-DD date`);
  }
  return value;
}

/** Today in UTC as `YYYY-MM-DD`. */
export function today(now: Date = new Date()): DateOnly {
  return now.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from: DateOnly, to: DateOnly): number {
  const MS_PER_DAY = 86_400_000;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

export type DueState = "none" | "overdue" | "today" | "upcoming";

export function dueState(due: DateOnly | undefined, from: DateOnly = today()): DueState {
  if (!due) return "none";
  const delta = daysBetween(from, due);
  if (delta < 0) return "overdue";
  if (delta === 0) return "today";
  return "upcoming";
}

/** True when `due` falls in [from, from + days]. Undated items are excluded. */
export function isDueWithin(due: DateOnly | undefined, days: number, from: DateOnly = today()): boolean {
  if (!due) return false;
  const delta = daysBetween(from, due);
  return delta >= 0 && delta <= days;
}

export function formatDateOnly(value: DateOnly): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
