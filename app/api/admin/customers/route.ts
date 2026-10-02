import { publicUser, readAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/http";
import { readDb } from "@/lib/store";

export async function GET() {
  const auth = await readAuth();
  if (!auth.staff) return errorMessage("Kitchen staff only.", 401);
  const db = readDb();
  const customers = db.users.map((user) => {
    const orders = db.orders.filter((order) => order.userId === user.id);
    return {
      ...publicUser(user),
      orderCount: orders.length,
      paidTotal: orders
        .filter((order) => order.paidAt)
        .reduce((sum, order) => sum + order.total, 0),
    };
  });
  return Response.json({ customers });
}
