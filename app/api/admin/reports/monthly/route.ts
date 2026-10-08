import { readAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/http";
import { monthlyOrdersCsv, reportFileName } from "@/lib/reports";
import { readDb } from "@/lib/store";

export async function GET(request: Request) {
  const auth = await readAuth();
  if (!auth.staff) return errorMessage("Kitchen staff only.", 401);

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get("year") ?? now.getFullYear());
  const month = Number(url.searchParams.get("month") ?? now.getMonth() + 1);

  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    return errorMessage("Choose a valid year.", 400);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return errorMessage("Choose a month from 1 to 12.", 400);
  }

  const db = readDb();
  const csv = monthlyOrdersCsv(db.orders, year, month, db.settings.timezone);
  const filename = reportFileName(year, month);

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
