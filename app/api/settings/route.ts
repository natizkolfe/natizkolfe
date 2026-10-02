import { publicSettings } from "@/lib/orders";
import { readDb } from "@/lib/store";

export async function GET() {
  const db = readDb();
  return Response.json({ settings: publicSettings(db.settings) });
}
