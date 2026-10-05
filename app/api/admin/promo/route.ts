import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson } from "@/lib/http";
import { generatePromoCode, PROMO_DISCOUNT_PERCENT } from "@/lib/promo";
import { readDb, withDb } from "@/lib/store";
import type { PromoCode } from "@/lib/types";

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export async function GET() {
  const auth = await readAuth();
  if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
  const promoCodes = [...readDb().promoCodes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ promoCodes });
}

export async function POST(request: Request) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const body = await readJson(request);
    const promo = await withDb((db) => {
      const code = generatePromoCode(db.promoCodes.map((entry) => entry.code));
      const next: PromoCode = {
        id: `prm_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        code,
        discountPercent: PROMO_DISCOUNT_PERCENT,
        status: "available",
        forName: clip(body.forName, 80),
        note: clip(body.note, 240),
        createdAt: new Date().toISOString(),
        usedAt: null,
        usedByUserId: null,
        usedByName: null,
        orderId: null,
        orderNumber: null,
      };
      db.promoCodes.unshift(next);
      return next;
    });
    return Response.json({ promo });
  } catch (error) {
    return fail(error);
  }
}
