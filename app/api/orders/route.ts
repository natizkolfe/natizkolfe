import { readAuth } from "@/lib/auth";
import { DeliveryError, quoteDelivery } from "@/lib/delivery";
import { errorMessage, fail, readJson } from "@/lib/http";
import { createOrder, OrderError, toCustomerOrder } from "@/lib/orders";
import { readDb, withDb } from "@/lib/store";
import type { OrderDraft } from "@/lib/types";

export async function GET() {
  const auth = await readAuth();
  if (!auth.user) return errorMessage("Sign in to see your orders.", 401);
  const orders = readDb()
    .orders.filter((order) => order.userId === auth.user?.id)
    .map(toCustomerOrder);
  return Response.json({ orders });
}

export async function POST(request: Request) {
  try {
    const auth = await readAuth();
    if (!auth.userRecord) return errorMessage("Sign in before placing an order.", 401);
    let draft = (await readJson(request)) as unknown as OrderDraft;
    if (draft.fulfillment === "delivery") {
      if (!draft.delivery) throw new OrderError("Accept a delivery fee before placing the order.");
      const quote = await quoteDelivery(readDb().settings, draft.delivery.address);
      if (Math.abs(quote.fee - draft.delivery.fee) > 0.01 || Math.abs(quote.miles - draft.delivery.miles) > 0.2) {
        throw new OrderError("The delivery fee changed. Review the distance and accept it again.");
      }
      draft = { ...draft, address: quote.address, delivery: quote };
    }
    const order = await withDb((db) => {
      const user = db.users.find((entry) => entry.id === auth.userRecord?.id);
      if (!user) throw new Error("Account not found.");
      return toCustomerOrder(createOrder(db, user, draft));
    });
    return Response.json({ order });
  } catch (error) {
    if (error instanceof DeliveryError) return errorMessage(error.message);
    return fail(error);
  }
}
