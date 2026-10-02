import { checkStaffPassword, openSession } from "@/lib/auth";
import { errorMessage, fail, readJson } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const password = String(body.password ?? "");
    if (!checkStaffPassword(password)) {
      return errorMessage("That kitchen password is not right.", 401);
    }
    await openSession("staff", null);
    return Response.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
