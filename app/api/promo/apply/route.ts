import { errorMessage, fail, readJson } from "@/lib/http";
import { findPromo, normalizePromoCode, promoProblem } from "@/lib/promo";
import { readDb } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const code = normalizePromoCode(String(body.code ?? ""));
    if (!code) return errorMessage("Enter a promo code.");
    const promo = findPromo(readDb(), code);
    const problem = promoProblem(promo);
    if (problem || !promo) return errorMessage(problem ?? "This promo code is invalid. Please check the code and try again.");
    return Response.json({ code: promo.code, percent: promo.discountPercent });
  } catch (error) {
    return fail(error);
  }
}
