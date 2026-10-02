import { readAuth } from "@/lib/auth";

export async function GET() {
  const auth = await readAuth();
  return Response.json({ user: auth.user, staff: auth.staff });
}
