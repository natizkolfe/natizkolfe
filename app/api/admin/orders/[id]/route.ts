import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson, type IdContext } from "@/lib/http";
import { OrderError, acknowledgeOrder, setPrepCheck, transitionOrder } from "@/lib/orders";
import { readDb, withDb } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = [
  "payment_pending",
  "confirmed",
  "preparing",
  "quality_check",
  "ready",
  "out_for_delivery",
  "picked_up",
  "delivered",
  "completed",
  "cancelled",
];

export async function GET(_request: Request, context: IdContext) {
  const auth = await readAuth();
  if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
  const { id } = await context.params;
  const order = readDb().orders.find((entry) => entry.id === id);
  if (!order) return errorMessage("Order not found.", 404);
  return Response.json({ order });
}

export async function PATCH(request: Request, context: IdContext) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const { id } = await context.params;
    const body = await readJson(request);
    const order = await withDb((db) => {
      const found = db.orders.find((entry) => entry.id === id);
      if (!found) throw new OrderError("Order not found.", 404);
      if (typeof body.kitchenNote === "string") {
        found.kitchenNote = body.kitchenNote.trim().slice(0, 500);
        found.updatedAt = new Date().toISOString();
      }
      if (typeof body.checkId === "string") {
        setPrepCheck(found, body.checkId, Boolean(body.done));
      }
      if (body.acknowledge === true) acknowledgeOrder(found);
      if (typeof body.status === "string") {
        if (!STATUSES.includes(body.status as OrderStatus)) {
          throw new OrderError("Unknown status.");
        }
        if (body.status === "picked_up" || body.status === "delivered") {
          throw new OrderError("Enter the customer's verification code to complete pickup or delivery.");
        }
        transitionOrder(db, found, body.status as OrderStatus, String(body.note ?? ""));
      }
      return found;
    });
    return Response.json({ order });
  } catch (error) {
    return fail(error);
  }
}
