import { readAuth } from "@/lib/auth";
import { readCareInput } from "@/lib/care";
import { errorMessage, fail, readJson } from "@/lib/http";
import { readDb, withDb } from "@/lib/store";
import type { CareInstruction } from "@/lib/types";

export async function GET() {
  const auth = await readAuth();
  if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
  const db = readDb();
  return Response.json({ instructions: db.careInstructions, menu: db.menu.map((item) => ({ id: item.id, name: item.name })) });
}

export async function POST(request: Request) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const body = await readJson(request);
    const instruction = await withDb((db) => {
      const menuIds = new Set(db.menu.map((item) => item.id));
      const templates = db.careInstructions.filter((entry) => entry.kind === "template");
      const parsed = readCareInput(body, menuIds, templates);
      if (!parsed.ok) throw new Error(parsed.message);
      const next: CareInstruction = {
        ...parsed.value,
        id: `car_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        version: 1,
        updatedAt: new Date().toISOString(),
      };
      db.careInstructions.unshift(next);
      return next;
    });
    return Response.json({ instruction });
  } catch (error) {
    if (error instanceof Error && error.message && error.message !== "Something went wrong. Try again.") {
      return errorMessage(error.message);
    }
    return fail(error);
  }
}
