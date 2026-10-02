import { readAuth } from "@/lib/auth";
import { errorMessage, fail, readJson } from "@/lib/http";
import { OrderError, publicSettings } from "@/lib/orders";
import { readDb, withDb } from "@/lib/store";

export async function GET() {
  const auth = await readAuth();
  if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
  return Response.json({ settings: publicSettings(readDb().settings) });
}

export async function PATCH(request: Request) {
  try {
    const auth = await readAuth();
    if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
    const body = await readJson(request);
    const settings = await withDb((db) => {
      const next = db.settings;
      const number = (key: keyof typeof next, min: number, max: number) => {
        const value = body[key];
        if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
          throw new OrderError(`${key} must be a whole number from ${min} to ${max}.`);
        }
        return value;
      };
      if ("weeklyLeadDays" in body) next.weeklyLeadDays = number("weeklyLeadDays", 1, 30);
      if ("cateringLeadDays" in body) next.cateringLeadDays = number("cateringLeadDays", 1, 30);
      if ("minCateringGuests" in body) next.minCateringGuests = number("minCateringGuests", 1, 40);
      if ("maxGuestsPerDay" in body) next.maxGuestsPerDay = number("maxGuestsPerDay", 8, 500);
      if ("maxWeeklyServingsPerDay" in body) {
        next.maxWeeklyServingsPerDay = number("maxWeeklyServingsPerDay", 10, 1000);
      }
      if (next.minCateringGuests > next.maxGuestsPerDay) {
        throw new OrderError("The guest minimum cannot be higher than the daily capacity.");
      }
      if (typeof body.pickupAddress === "string" && body.pickupAddress.trim().length > 4) {
        next.pickupAddress = body.pickupAddress.trim().slice(0, 160);
      }
      if (typeof body.pickupInstructions === "string") {
        next.pickupInstructions = body.pickupInstructions.trim().slice(0, 300);
      }
      if (typeof body.deliveryNote === "string") {
        next.deliveryNote = body.deliveryNote.trim().slice(0, 300);
      }
      return publicSettings(next);
    });
    return Response.json({ settings });
  } catch (error) {
    return fail(error);
  }
}
