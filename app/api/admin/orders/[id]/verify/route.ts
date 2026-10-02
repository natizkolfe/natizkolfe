import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson, type IdContext } from "@/lib/http";
import { OrderError, verifyHandoff } from "@/lib/orders";
import { withDb } from "@/lib/store";

export async function POST(request: Request, context: IdContext) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const { id } = await context.params;
    const body = await readJson(request);
    const order = await withDb((db) => {
      const found = db.orders.find((entry) => entry.id === id);
      if (!found) throw new OrderError("Order not found.", 404);
      verifyHandoff(db, found, String(body.code ?? ""));
      return found;
    });
    return Response.json({ order });
  } catch (error) {
    return fail(error);
  }
}
