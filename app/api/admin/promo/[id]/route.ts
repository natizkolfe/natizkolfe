import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson, type IdContext } from "@/lib/http";
import { withDb } from "@/lib/store";

export async function POST(request: Request, context: IdContext) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const { id } = await context.params;
    const body = await readJson(request);
    if (body.action !== "disable") return errorMessage("Choose a promo action.");
    const promo = await withDb((db) => {
      const entry = db.promoCodes.find((item) => item.id === id);
      if (!entry) throw new Error("Promo code not found.");
      if (entry.status === "used") throw new Error("A used promo code stays used.");
      if (entry.status === "available") entry.status = "disabled";
      return entry;
    });
    return Response.json({ promo });
  } catch (error) {
    if (error instanceof Error && error.message === "Promo code not found.") return errorMessage(error.message, 404);
    if (error instanceof Error && error.message === "A used promo code stays used.") return errorMessage(error.message, 409);
    return fail(error);
  }
}
