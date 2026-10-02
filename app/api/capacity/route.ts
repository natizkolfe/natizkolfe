import { isIsoDate } from "@/lib/dates";
import { errorMessage } from "@/lib/http";
import { cateringGuestsOnDate, publicSettings, weeklyServingsOnDate } from "@/lib/orders";
import { readDb } from "@/lib/store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const kind = url.searchParams.get("kind") ?? "catering";
  if (!isIsoDate(date)) return errorMessage("Choose a date to check capacity.");
  const db = readDb();
  const settings = publicSettings(db.settings);
  if (kind === "weekly") {
    const used = weeklyServingsOnDate(db, date);
    return Response.json({
      used,
      max: settings.maxWeeklyServingsPerDay,
      remaining: Math.max(0, settings.maxWeeklyServingsPerDay - used),
      unit: "servings",
    });
  }
  const used = cateringGuestsOnDate(db, date);
  return Response.json({
    used,
    max: settings.maxGuestsPerDay,
    remaining: Math.max(0, settings.maxGuestsPerDay - used),
    unit: "guests",
  });
}
