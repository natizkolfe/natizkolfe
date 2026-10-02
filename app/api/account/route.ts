import { hashPassword, readAuth, sanitizePreferences, verifyPassword } from "@/lib/auth";
import { errorMessage, fail, readJson } from "@/lib/http";
import { withDb } from "@/lib/store";

export async function PATCH(request: Request) {
  try {
    const auth = await readAuth();
    if (!auth.userRecord) return errorMessage("Sign in to update your account.", 401);
    const body = await readJson(request);
    const name = String(body.name ?? auth.userRecord.name).trim();
    const phone = String(body.phone ?? auth.userRecord.phone).trim();
    if (name.length < 2) return errorMessage("Enter your name.");
    if (phone.replace(/\D/g, "").length < 10) {
      return errorMessage("Enter a phone number with at least 10 digits.");
    }
    const preferences = sanitizePreferences(
      (body.preferences as Parameters<typeof sanitizePreferences>[0]) ?? auth.userRecord.preferences,
    );
    const nextPassword = String(body.newPassword ?? "");
    const currentPassword = String(body.currentPassword ?? "");

    const updated = await withDb((db) => {
      const user = db.users.find((entry) => entry.id === auth.userRecord?.id);
      if (!user) return null;
      if (nextPassword) {
        if (nextPassword.length < 8) {
          return { error: "Use a password of at least 8 characters." };
        }
        if (!verifyPassword(currentPassword, user.passwordSalt, user.passwordHash)) {
          return { error: "The current password is wrong." };
        }
        const secret = hashPassword(nextPassword);
        user.passwordHash = secret.hash;
        user.passwordSalt = secret.salt;
      }
      user.name = name;
      user.phone = phone;
      user.preferences = preferences;
      return { ok: true };
    });
    if (!updated) return errorMessage("Account not found.", 404);
    if ("error" in updated && updated.error) return errorMessage(updated.error);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
