import { readAuth } from "@/lib/auth";
import { publishCare } from "@/lib/care";
import { errorMessage, fail, type IdContext } from "@/lib/http";
import { OrderError } from "@/lib/orders";
import { withDb } from "@/lib/store";

export async function POST(_request: Request, context: IdContext) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const { id } = await context.params;
    const order = await withDb((db) => {
      const found = db.orders.find((entry) => entry.id === id);
      if (!found) throw new OrderError("Order not found.", 404);
      if (!found.paidAt) throw new OrderError("Labels are available after payment.");
      publishCare(db, found);
      return found;
    });
    return Response.json({ order });
  } catch (error) {
    return fail(error);
  }
}
