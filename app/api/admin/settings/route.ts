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
      if ("minimumOrderLeadDays" in body) {
        const lead = number("minimumOrderLeadDays", 1, 30);
        next.minimumOrderLeadDays = lead;
        next.weeklyLeadDays = lead;
        next.cateringLeadDays = lead;
      }
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
      if (typeof body.staffPhone === "string") {
        next.staffPhone = body.staffPhone.trim().slice(0, 40);
      }
      if (typeof body.deliveryOrigin === "string" && body.deliveryOrigin.trim().length > 8) {
        next.deliveryOrigin = body.deliveryOrigin.trim().slice(0, 180);
      }
      if ("deliveryRatePerMile" in body) {
        const rate = body.deliveryRatePerMile;
        if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 50) {
          throw new OrderError("The delivery rate must be from $0 to $50 per mile.");
        }
        next.deliveryRatePerMile = Math.round(rate * 100) / 100;
      }
      if ("maxDeliveryMiles" in body) next.maxDeliveryMiles = number("maxDeliveryMiles", 0, 500);
      if ("minDeliveryFee" in body) {
        const minimum = body.minDeliveryFee;
        if (typeof minimum !== "number" || !Number.isFinite(minimum) || minimum < 0 || minimum > 500) {
          throw new OrderError("The minimum delivery fee must be from $0 to $500.");
        }
        next.minDeliveryFee = Math.round(minimum * 100) / 100;
      }
      if ("deliveryEnabled" in body) next.deliveryEnabled = Boolean(body.deliveryEnabled);
      if ("freeDelivery" in body) next.freeDelivery = Boolean(body.freeDelivery);
      if ("deliveryZipCodes" in body) {
        const raw = Array.isArray(body.deliveryZipCodes)
          ? body.deliveryZipCodes.join(",")
          : typeof body.deliveryZipCodes === "string"
            ? body.deliveryZipCodes
            : "";
        next.deliveryZipCodes = [...new Set(raw.match(/\d{5}/g) ?? [])].slice(0, 100);
      }
      return publicSettings(next);
    });
    return Response.json({ settings });
  } catch (error) {
    return fail(error);
  }
}
