import { normalizeEmail, openSession, verifyPassword } from "@/lib/auth";
import { errorMessage, fail, readJson } from "@/lib/http";
import { readDb } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    const user = readDb().users.find((entry) => entry.email === email);
    if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
      return errorMessage("That email and password do not match.", 401);
    }
    await openSession("customer", user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
