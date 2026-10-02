import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson, type IdContext } from "@/lib/http";
import { OrderError, payOrder, toCustomerOrder } from "@/lib/orders";
import { withDb } from "@/lib/store";

export async function POST(request: Request, context: IdContext) {
  try {
    const { id } = await context.params;
    const auth = await readAuth();
    if (!auth.user) return errorMessage("Sign in to pay.", 401);
    const body = await readJson(request);
    const result = await withDb((db) => {
      const order = db.orders.find((entry) => entry.id === id && entry.userId === auth.user?.id);
      if (!order) throw new OrderError("Order not found.", 404);
      const payment = payOrder(
        db,
        order,
        String(body.cardNumber ?? ""),
        String(body.expiry ?? ""),
        String(body.cvc ?? ""),
        String(body.name ?? ""),
      );
      return { ok: payment.ok, message: payment.message, order: toCustomerOrder(order) };
    });
    return Response.json(result, { status: result.ok ? 200 : 402 });
  } catch (error) {
    return fail(error);
  }
}
