import { adminAttemptBlocked, adminAttemptKey, clearAdminAttempts, recordAdminFailure } from "@/lib/admin-login-guard";
import { checkStaffPassword, openSession } from "@/lib/auth";
import { errorMessage, fail, readJson } from "@/lib/http";

const INVALID = "Invalid Admin password.";
const LIMITED = "Too many attempts. Try again later.";

export async function POST(request: Request) {
  try {
    const key = adminAttemptKey(request);
    if (adminAttemptBlocked(key)) return errorMessage(LIMITED, 429);
    const body = await readJson(request);
    const password = String(body.password ?? "");
    if (!checkStaffPassword(password)) {
      recordAdminFailure(key);
      return errorMessage(INVALID, 401);
    }
    clearAdminAttempts(key);
    await openSession("staff", null);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
