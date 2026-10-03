import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson, type IdContext } from "@/lib/http";
import { OrderError, reviseOrder, toCustomerOrder } from "@/lib/orders";
import { withDb } from "@/lib/store";
import type { Customization } from "@/lib/types";

export async function POST(request: Request, context: IdContext) {
  try {
    const auth = await readAuth();
    if (!auth.user) return errorMessage("Sign in to change this order.", 401);
    const { id } = await context.params;
    const body = await readJson(request);
    const addonIds = Array.isArray(body.addonIds) ? body.addonIds.filter((id): id is string => typeof id === "string") : [];
    const customizations = readCustomizations(body.customizations);
    const result = await withDb((db) => {
      const order = db.orders.find((entry) => entry.id === id && entry.userId === auth.user?.id);
      if (!order) throw new OrderError("Order not found.", 404);
      return reviseOrder(db, order, {
        addonIds,
        customizations,
        preview: body.preview === true,
        cardNumber: typeof body.cardNumber === "string" ? body.cardNumber : undefined,
        expiry: typeof body.expiry === "string" ? body.expiry : undefined,
        cvc: typeof body.cvc === "string" ? body.cvc : undefined,
        name: typeof body.name === "string" ? body.name : undefined,
      });
    });
    return Response.json({
      preview: result.preview,
      due: result.due,
      total: result.total,
      changes: result.changes,
      order: toCustomerOrder(result.order),
    });
  } catch (error) {
    return fail(error);
  }
}

function readCustomizations(value: unknown): Record<string, Partial<Customization>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 40);
  const next: Record<string, Partial<Customization>> = {};
  for (const [itemId, raw] of entries) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const source = raw as Record<string, unknown>;
    next[itemId] = {
      spiceLevel: typeof source.spiceLevel === "string" ? (source.spiceLevel as Customization["spiceLevel"]) : undefined,
      allergens: stringList(source.allergens),
      excludedIngredients: stringList(source.excludedIngredients),
      dietary: stringList(source.dietary),
      notes: typeof source.notes === "string" ? source.notes : undefined,
    };
  }
  return next;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === "string").slice(0, 20);
}
