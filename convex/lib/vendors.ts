import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function requireWeddingVendor(
  ctx: MutationCtx,
  vendorId: Id<"vendors"> | undefined,
  weddingId: Id<"weddings">,
): Promise<void> {
  if (!vendorId) return;
  const vendor = await ctx.db.get(vendorId);
  if (!vendor || vendor.weddingId !== weddingId) {
    throw new Error("Vendor does not belong to this wedding");
  }
}
