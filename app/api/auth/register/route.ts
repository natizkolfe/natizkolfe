import { hashPassword, normalizeEmail, openSession, validateAccountInput } from "@/lib/auth";
import { errorMessage, fail, readJson } from "@/lib/http";
import { emptyPreferences } from "@/lib/orders";
import { withDb } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const name = String(body.name ?? "");
    const email = String(body.email ?? "");
    const phone = String(body.phone ?? "");
    const password = String(body.password ?? "");
    const problem = validateAccountInput({ name, email, phone, password });
    if (problem) return errorMessage(problem);

    const created = await withDb((db): { error: string } | { userId: string } => {
      const existing = db.users.find((user) => user.email === normalizeEmail(email));
      if (existing) {
        return { error: "An account with that email already exists. Sign in instead." };
      }
      const secret = hashPassword(password);
      const user = {
        id: `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        name: name.trim(),
        email: normalizeEmail(email),
        phone: phone.trim(),
        passwordHash: secret.hash,
        passwordSalt: secret.salt,
        createdAt: new Date().toISOString(),
        preferences: emptyPreferences(),
      };
      db.users.push(user);
      return { userId: user.id };
    });
    if ("error" in created) return errorMessage(created.error);
    await openSession("customer", created.userId);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
