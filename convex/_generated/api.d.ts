/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as budgets from "../budgets.js";
import type * as crons from "../crons.js";
import type * as guests from "../guests.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_budget from "../lib/budget.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_guests from "../lib/guests.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lib_vendors from "../lib/vendors.js";
import type * as reminders from "../reminders.js";
import type * as tasks from "../tasks.js";
import type * as vendors from "../vendors.js";
import type * as weddings from "../weddings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  budgets: typeof budgets;
  crons: typeof crons;
  guests: typeof guests;
  "lib/auth": typeof lib_auth;
  "lib/budget": typeof lib_budget;
  "lib/dates": typeof lib_dates;
  "lib/guests": typeof lib_guests;
  "lib/money": typeof lib_money;
  "lib/validators": typeof lib_validators;
  "lib/vendors": typeof lib_vendors;
  reminders: typeof reminders;
  tasks: typeof tasks;
  vendors: typeof vendors;
  weddings: typeof weddings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
