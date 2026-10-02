import { readAuth } from "@/lib/auth";
import { errorMessage, type IdContext } from "@/lib/http";
import { toCustomerOrder } from "@/lib/orders";
import { readDb } from "@/lib/store";

export async function GET(_request: Request, context: IdContext) {
  const { id } = await context.params;
  const auth = await readAuth();
  if (!auth.user) return errorMessage("Sign in to see this order.", 401);
  const order = readDb().orders.find((entry) => entry.id === id && entry.userId === auth.user?.id);
  if (!order) return errorMessage("Order not found.", 404);
  return Response.json({ order: toCustomerOrder(order) });
}
