import { readAuth } from "@/lib/auth";
import { errorMessage, fail, type IdContext } from "@/lib/http";
import { cancelByCustomer, OrderError, toCustomerOrder } from "@/lib/orders";
import { withDb } from "@/lib/store";

export async function POST(_request: Request, context: IdContext) {
  try {
    const { id } = await context.params;
    const auth = await readAuth();
    if (!auth.user) return errorMessage("Sign in to cancel an order.", 401);
    const order = await withDb((db) => {
      const found = db.orders.find((entry) => entry.id === id && entry.userId === auth.user?.id);
      if (!found) throw new OrderError("Order not found.", 404);
      cancelByCustomer(db, found);
      return toCustomerOrder(found);
    });
    return Response.json({ order });
  } catch (error) {
    return fail(error);
  }
}
