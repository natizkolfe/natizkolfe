import { readAuth } from "@/lib/auth";
import { readCareInput } from "@/lib/care";
import { errorMessage, fail, readJson, type IdContext } from "@/lib/http";
import { withDb } from "@/lib/store";

export async function PATCH(request: Request, context: IdContext) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const { id } = await context.params;
    const body = await readJson(request);
    const instruction = await withDb((db) => {
      const current = db.careInstructions.find((entry) => entry.id === id);
      if (!current) throw new Error("Instruction not found.");
      const toggleOnly = body.name == null && body.sections == null && typeof body.active === "boolean";
      if (toggleOnly) {
        current.active = Boolean(body.active);
        current.version += 1;
        current.updatedAt = new Date().toISOString();
        return current;
      }
      const menuIds = new Set(db.menu.map((item) => item.id));
      const templates = db.careInstructions.filter((entry) => entry.kind === "template" && entry.id !== id);
      const parsed = readCareInput(body, menuIds, templates);
      if (!parsed.ok) throw new Error(parsed.message);
      Object.assign(current, parsed.value, { version: current.version + 1, updatedAt: new Date().toISOString() });
      return current;
    });
    return Response.json({ instruction });
  } catch (error) {
    if (error instanceof Error && error.message === "Instruction not found.") return errorMessage(error.message, 404);
    if (error instanceof Error && !error.message.startsWith("Something")) return errorMessage(error.message);
    return fail(error);
  }
}
