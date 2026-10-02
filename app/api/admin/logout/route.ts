import { clearCookie } from "@/lib/auth";

export async function POST() {
  await clearCookie("staff");
  return Response.json({ ok: true });
}
