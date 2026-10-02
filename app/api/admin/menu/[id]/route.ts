import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson, type IdContext } from "@/lib/http";
import { OrderError } from "@/lib/orders";
import { withDb } from "@/lib/store";

export async function PATCH(request: Request, context: IdContext) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const { id } = await context.params;
    const body = await readJson(request);
    const item = await withDb((db) => {
      const found = db.menu.find((entry) => entry.id === id);
      if (!found) throw new OrderError("Dish not found.", 404);
      if (typeof body.name === "string" && body.name.trim().length > 1) {
        found.name = body.name.trim().slice(0, 80);
      }
      if (typeof body.description === "string") {
        found.description = body.description.trim().slice(0, 400);
      }
      if (typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0 && body.price <= 500) {
        found.price = Math.round(body.price * 100) / 100;
      }
      if (typeof body.available === "boolean") {
        found.available = body.available;
      }
      return found;
    });
    return Response.json({ item });
  } catch (error) {
    return fail(error);
  }
}
