import { defineTool } from "eve/tools";
import { z } from "zod";
import { api, convexClient, requireWeddingId } from "../lib/convex";
import type { Id } from "../../convex/_generated/dataModel";

const vendorStatus = z.enum(["considering", "contacted", "booked", "declined"]);

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("get_vendors") }),
  z.object({
    action: z.literal("add_vendor"),
    name: z.string().min(1),
    category: z.string().min(1).describe("What they do, e.g. Photography."),
    contactName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    notes: z.string().optional(),
    status: vendorStatus.optional(),
  }),
  z.object({
    action: z.literal("update_vendor"),
    vendorId: z.string(),
    name: z.string().optional(),
    category: z.string().optional(),
    contactName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    notes: z.string().optional(),
    status: vendorStatus.optional(),
  }),
  z.object({ action: z.literal("delete_vendor"), vendorId: z.string() }),
]);

type Input = z.infer<typeof input>;

export default defineTool({
  description:
    "Read and change the vendor list — who is being considered, contacted, booked, or declined. Deleting a vendor also unlinks it from budget items and tasks, so confirm it first.",
  inputSchema: input,
  approval: ({ toolInput }) =>
    (toolInput as Input | undefined)?.action === "delete_vendor" ? "user-approval" : "not-applicable",
  async execute(args: Input) {
    const client = convexClient();
    const weddingId = await requireWeddingId(client);

    switch (args.action) {
      case "get_vendors": {
        const vendors = await client.query(api.vendors.list, { weddingId });
        return vendors.map((vendor) => ({
          id: vendor._id,
          name: vendor.name,
          category: vendor.category,
          status: vendor.status,
          contactName: vendor.contactName ?? null,
          email: vendor.email ?? null,
          phone: vendor.phone ?? null,
        }));
      }
      case "add_vendor": {
        const { action: _action, ...fields } = args;
        const vendorId = await client.mutation(api.vendors.add, { weddingId, ...fields });
        return { vendorId, added: args.name };
      }
      case "update_vendor": {
        const { action: _action, vendorId, ...fields } = args;
        await client.mutation(api.vendors.update, {
          vendorId: vendorId as Id<"vendors">,
          ...fields,
        });
        return { vendorId, updated: true };
      }
      case "delete_vendor": {
        await client.mutation(api.vendors.remove, { vendorId: args.vendorId as Id<"vendors"> });
        return { vendorId: args.vendorId, deleted: true };
      }
    }
  },
});
