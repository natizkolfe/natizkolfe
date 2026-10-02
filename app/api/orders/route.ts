import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson } from "@/lib/http";
import { createOrder, toCustomerOrder } from "@/lib/orders";
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
    const draft = (await readJson(request)) as unknown as OrderDraft;
    const order = await withDb((db) => {
      const user = db.users.find((entry) => entry.id === auth.userRecord?.id);
      if (!user) throw new Error("Account not found.");
      return toCustomerOrder(createOrder(db, user, draft));
    });
    return Response.json({ order });
  } catch (error) {
    return fail(error);
  }
}
