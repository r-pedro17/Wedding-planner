import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clear out reminders whose payment or task is already resolved, then build
// reminders for anything newly falling inside the two-week window.
crons.daily(
  "prune resolved reminders",
  { hourUTC: 6, minuteUTC: 0 },
  internal.reminders.pruneResolved,
  {},
);

crons.daily(
  "refresh due reminders",
  { hourUTC: 6, minuteUTC: 10 },
  internal.reminders.refreshAll,
  { withinDays: 14 },
);

export default crons;
