import { defineTool } from "eve/tools";
import { z } from "zod";
import { api, convexClient, currentWedding } from "../lib/convex";
import type { Id } from "../../convex/_generated/dataModel";
import { formatCents, parseAmountToCents } from "../../convex/lib/money";

/** Anything at or above this is a "significant" change and needs a human yes. */
const LARGE_CHANGE_CENTS = 100_000; // €1,000

const amount = z
  .union([z.number(), z.string()])
  .describe("A money amount as the user said it, e.g. 1800 or \"€1,850.50\".");

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("get_budget") }).describe("Read every budget item and the derived totals."),
  z.object({
    action: z.literal("add_budget_item"),
    name: z.string().min(1),
    category: z.string().min(1),
    planned: amount,
    quoted: amount.optional(),
    committed: amount.optional(),
    paid: amount.optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("update_budget_item"),
    itemId: z.string().describe("The _id from get_budget."),
    name: z.string().optional(),
    category: z.string().optional(),
    planned: amount.optional(),
    quoted: amount.optional(),
    committed: amount.optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.enum(["idea", "quoted", "booked", "paid"]).optional(),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("record_payment"),
    itemId: z.string(),
    amount,
  }),
  z.object({
    action: z.literal("delete_budget_item"),
    itemId: z.string(),
  }),
]);

type Input = z.infer<typeof input>;

function cents(value: string | number | undefined): number | undefined {
  return value === undefined ? undefined : parseAmountToCents(value);
}

export default defineTool({
  description:
    "Read the wedding budget and change budget items. Totals are always computed by the app from stored rows — never do the arithmetic yourself. Money can be passed as the user said it; the tool converts to cents.",
  inputSchema: input,
  // Deletions and large money moves stop for a human. Small corrections do not.
  approval: ({ toolInput }) => {
    const value = toolInput as Input | undefined;
    if (!value) return "not-applicable";
    if (value.action === "delete_budget_item") return "user-approval";
    if (value.action === "record_payment" && parseAmountToCents(value.amount) >= LARGE_CHANGE_CENTS) {
      return "user-approval";
    }
    if (
      value.action === "update_budget_item" &&
      [value.planned, value.quoted, value.committed].some(
        (v) => v !== undefined && parseAmountToCents(v) >= LARGE_CHANGE_CENTS,
      )
    ) {
      return "user-approval";
    }
    return "not-applicable";
  },
  async execute(args: Input) {
    const client = convexClient();
    const wedding = await currentWedding(client);
    const weddingId = wedding._id;

    switch (args.action) {
      case "get_budget": {
        const budget = await client.query(api.budgets.list, { weddingId });
        return {
          currency: budget.currency,
          totals: budget.totals,
          readable: {
            totalBudget: formatCents(budget.totals.totalBudgetCents, budget.currency),
            paid: formatCents(budget.totals.paidCents, budget.currency),
            stillToPay: formatCents(budget.totals.remainingCents, budget.currency),
            unallocated: formatCents(budget.totals.unallocatedCents, budget.currency),
          },
          items: budget.items.map((item) => ({
            id: item._id,
            name: item.name,
            category: item.category,
            status: item.status,
            dueDate: item.dueDate ?? null,
            plannedCents: item.plannedCents,
            paidCents: item.paidCents,
            remainingCents: item.remainingCents,
          })),
        };
      }
      case "add_budget_item": {
        const itemId = await client.mutation(api.budgets.addItem, {
          weddingId,
          name: args.name,
          category: args.category,
          plannedCents: parseAmountToCents(args.planned),
          quotedCents: cents(args.quoted),
          committedCents: cents(args.committed),
          paidCents: cents(args.paid) ?? 0,
          dueDate: args.dueDate,
          notes: args.notes,
        });
        return { itemId, added: args.name };
      }
      case "update_budget_item": {
        await client.mutation(api.budgets.updateItem, {
          itemId: args.itemId as Id<"budgetItems">,
          name: args.name,
          category: args.category,
          plannedCents: cents(args.planned),
          quotedCents: cents(args.quoted),
          committedCents: cents(args.committed),
          dueDate: args.dueDate,
          status: args.status,
          notes: args.notes,
        });
        return { itemId: args.itemId, updated: true };
      }
      case "record_payment": {
        const result = await client.mutation(api.budgets.recordPayment, {
          itemId: args.itemId as Id<"budgetItems">,
          amountCents: parseAmountToCents(args.amount),
        });
        return { ...result, paid: formatCents(result.paidCents, wedding.currency) };
      }
      case "delete_budget_item": {
        await client.mutation(api.budgets.removeItem, { itemId: args.itemId as Id<"budgetItems"> });
        return { itemId: args.itemId, deleted: true };
      }
    }
  },
});
