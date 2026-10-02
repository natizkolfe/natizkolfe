import { readAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/http";
import { readDb } from "@/lib/store";

export async function GET() {
  const auth = await readAuth();
  if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
  return Response.json({ orders: readDb().orders });
}
