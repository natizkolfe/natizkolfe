import { clearCookie } from "@/lib/auth";

export async function POST() {
  await clearCookie("customer");
  return Response.json({ ok: true });
}
