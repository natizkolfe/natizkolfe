import { readDb } from "@/lib/store";

export async function GET() {
  const db = readDb();
  return Response.json({ menu: db.menu });
}
